/**
 * Star Commander - Relay Manager
 * Bridge between Electron and the relay core
 */

const { PassThrough } = require('stream');
const prism = require('prism-media');

const EmitterBot = require('./emitter');
const { createReceiver } = require('./receiver');

class RelayManager {
    constructor(config, eventCallback) {
        this.config = config;
        this.eventCallback = eventCallback;
        this.receivers = [];
        this.globalTarget = 'mute';
        this.activeStreams = [];
        this.whisperStreams = []; // Separate tracking for whisper streams
        this.isRunning = false;
        this.whisperStates = new Map(); // userId -> { active, channelKey }
        this.relayChannelId = null;
        this.myChiefId = null;
        
        // Briefing mode
        this.isBriefingActive = false;
        this.originalPositions = new Map(); // oderId -> originalChannelId
    }
    
    emit(event, data) {
        if (this.eventCallback) {
            this.eventCallback(event, data);
        }
    }
    
    getGlobalTarget() {
        return this.globalTarget;
    }
    
    setTarget(target) {
        // Kill active streams
        this.killActiveStreams();
        
        // Map target name
        if (target.startsWith('channel')) {
            const index = parseInt(target.replace('channel', '')) - 1;
            const channelConfig = this.config.channels?.targets?.[index];
            this.globalTarget = channelConfig?.name || 'mute';
        } else {
            this.globalTarget = target;
        }
        
        this.emit('target-changed', { target: this.globalTarget });
        
        // Resubscribe speaking users
        if (this.globalTarget !== 'mute') {
            EmitterBot.resubscribeSpeakingUsers();
        }
    }
    
    killActiveStreams() {
        this.activeStreams.forEach(stream => {
            if (stream && !stream.destroyed) {
                stream.destroy();
            }
        });
        this.activeStreams = [];
    }
    
    killWhisperStreams() {
        console.log('[RelayManager] Killing whisper streams:', this.whisperStreams.length);
        this.whisperStreams.forEach(stream => {
            if (stream && !stream.destroyed) {
                stream.destroy();
            }
        });
        this.whisperStreams = [];
        
        // Also stop the emitter's audio player
        if (EmitterBot.isReady()) {
            EmitterBot.stopPlayback();
        }
    }
    
    async start() {
        if (this.isRunning) return;
        
        // Store relay channel ID
        this.relayChannelId = this.config.channels?.relay?.id;
        this.myChiefId = this.config.myChiefId;
        
        // Build config for core
        const coreConfig = {
            channels: this.config.channels,
            commanders: this.config.commanders
        };
        
        // Set environment variables for tokens
        process.env.EMITTER_TOKEN = this.config.tokens?.emitter;
        
        // Map receiver tokens
        if (this.config.channels?.targets) {
            this.config.channels.targets.forEach((target, i) => {
                const tokenKey = target.tokenKey || `receiver${i + 1}`;
                process.env[`RECEIVER_TOKEN_${i + 1}`] = this.config.tokens?.receivers?.[tokenKey];
            });
        }
        
        // Start emitter
        await EmitterBot.start(
            coreConfig,
            (audioStream, auth) => this.onCommanderSpeaking(audioStream, auth),
            () => this.getGlobalTarget()
        );
        this.emit('bot-connected', { name: 'Emitter', index: 'emitter' });
        
        // Setup relay channel listener for whisper commands
        if (this.relayChannelId) {
            this.setupRelayListener();
        }
        
        // Start receivers
        for (let i = 0; i < this.config.channels?.targets?.length; i++) {
            const target = this.config.channels.targets[i];
            const tokenKey = target.tokenKey || `receiver${i + 1}`;
            const token = this.config.tokens?.receivers?.[tokenKey];
            
            if (!token || !target.id) continue;
            
            // Get display name from config
            const displayName = this.config.tokens?.names?.[tokenKey] || target.name || `Receiver ${i + 1}`;
            
            const receiver = createReceiver(
                target.name,  // Internal name for targeting
                token,
                target.id
            );
            receiver.displayName = displayName;
            receiver.index = i + 1;
            
            await receiver.start();
            this.receivers.push(receiver);
            this.emit('bot-connected', { name: displayName, index: `receiver${i + 1}` });
        }
        
        this.isRunning = true;
    }
    
    async stop() {
        this.killActiveStreams();
        
        await EmitterBot.stop();
        this.emit('bot-disconnected', { name: 'Emitter', index: 'emitter' });
        
        for (const receiver of this.receivers) {
            await receiver.stop();
            this.emit('bot-disconnected', { name: receiver.displayName, index: `receiver${receiver.index}` });
        }
        
        this.receivers = [];
        this.isRunning = false;
    }
    
    onCommanderSpeaking(audioStream, auth) {
        const displayName = auth.name || 'Unknown';
        const roleName = auth.roleName || '';
        
        const target = this.globalTarget;
        
        if (target === 'mute') {
            return;
        }
        
        let targetReceivers = [];
        
        if (target === 'all') {
            targetReceivers = this.receivers.filter(r => r.isReady());
        } else {
            targetReceivers = this.receivers.filter(r => r.name === target && r.isReady());
        }
        
        if (targetReceivers.length === 0) {
            return;
        }
        
        const targetNames = targetReceivers.map(r => r.displayName || r.name).join(', ');
        this.emit('speaking', { user: displayName, role: roleName, targets: targetNames });
        
        // Single receiver: direct stream
        if (targetReceivers.length === 1) {
            this.activeStreams.push(audioStream);
            targetReceivers[0].playStream(audioStream);
            
            audioStream.on('end', () => {
                this.activeStreams = this.activeStreams.filter(s => s !== audioStream);
            });
            return;
        }
        
        // Multiple receivers: decode to PCM, duplicate
        try {
            const decoder = new prism.opus.Decoder({
                rate: 48000,
                channels: 2,
                frameSize: 960
            });
            
            this.activeStreams.push(audioStream);
            this.activeStreams.push(decoder);
            
            audioStream.pipe(decoder);
            
            const pcmStreams = targetReceivers.map(() => new PassThrough({
                highWaterMark: 1024 * 64
            }));
            
            pcmStreams.forEach(s => this.activeStreams.push(s));
            
            targetReceivers.forEach((receiver, i) => {
                receiver.playRawStream(pcmStreams[i]);
            });
            
            decoder.on('data', (chunk) => {
                const buffer = Buffer.from(chunk);
                for (let i = 0; i < pcmStreams.length; i++) {
                    if (!pcmStreams[i].destroyed) {
                        pcmStreams[i].write(buffer);
                    }
                }
            });
            
            decoder.on('end', () => {
                for (let i = 0; i < pcmStreams.length; i++) {
                    if (!pcmStreams[i].destroyed) {
                        pcmStreams[i].end();
                    }
                }
                this.activeStreams = this.activeStreams.filter(s => 
                    s !== audioStream && s !== decoder && !pcmStreams.includes(s)
                );
            });
            
            decoder.on('error', (err) => {
                this.emit('error', { message: `Decoder error: ${err.message}` });
            });
            
        } catch (err) {
            this.emit('error', { message: `Transcoding error: ${err.message}` });
        }
    }
    
    // Setup listener for whisper commands in relay channel
    setupRelayListener() {
        const client = EmitterBot.getClient();
        if (!client) {
            this.emit('warning', { message: 'No client available for relay listener' });
            return;
        }
        
        console.log('[RelayManager] Setting up relay listener for channel:', this.relayChannelId);
        
        client.on('messageCreate', (message) => {
            // Ignore non-relay channel messages
            if (message.channel.id !== this.relayChannelId) return;
            
            // Ignore our own bot's messages (but NOT webhooks!)
            // Webhooks have message.webhookId set
            if (message.author.id === client.user.id) return;
            
            console.log('[RelayManager] Relay message received:', message.content);
            
            // Parse whisper command: WHISPER:userId:ON or WHISPER:userId:OFF
            const content = message.content.trim();
            const match = content.match(/^WHISPER:([^:]+):(ON|OFF)$/i);
            
            if (match) {
                const userId = match[1];
                const action = match[2].toUpperCase();
                
                console.log(`[RelayManager] Whisper command: ${action} for user ${userId}`);
                
                if (action === 'ON') {
                    this.enableWhisper(userId);
                } else {
                    this.disableWhisper(userId);
                }
                
                // Delete the command message to keep channel clean
                message.delete().catch(() => {});
            }
        });
        
        this.emit('info', { message: 'Relay listener ready' });
    }
    
    // Enable whisper for a chief
    enableWhisper(userId) {
        // Find which channel this chief is in
        const chief = this.config.chiefs?.find(c => c.userId === userId);
        if (!chief) {
            this.emit('warning', { message: `Unknown chief: ${userId}` });
            return;
        }
        
        this.whisperStates.set(userId, {
            active: true,
            channelKey: chief.channelKey,
            name: chief.name
        });
        
        this.emit('whisper-on', { user: chief.name, channel: chief.channelName });
        
        // Find the receiver for this chief's channel and start listening
        const receiverIndex = parseInt(chief.channelKey.replace('receiver', '')) - 1;
        const receiver = this.receivers[receiverIndex];
        
        if (receiver && receiver.isReady()) {
            receiver.startListening(userId, (audioStream, auth) => {
                this.onWhisperAudio(audioStream, auth);
            });
            this.emit('info', { message: `Listening for ${chief.name} in ${chief.channelName}` });
        } else {
            this.emit('warning', { message: `Receiver not ready for ${chief.channelName}` });
        }
    }
    
    // Disable whisper for a chief
    disableWhisper(userId) {
        const state = this.whisperStates.get(userId);
        if (state) {
            this.emit('whisper-off', { user: state.name });
            
            // Stop listening on the receiver
            const receiverIndex = parseInt(state.channelKey.replace('receiver', '')) - 1;
            const receiver = this.receivers[receiverIndex];
            
            if (receiver) {
                receiver.stopListening();
            }
        }
        
        this.whisperStates.delete(userId);
        
        // Kill all whisper streams immediately
        this.killWhisperStreams();
    }
    
    // Handle whisper audio (from chief to commandant channel)
    onWhisperAudio(audioStream, auth) {
        const displayName = auth.name || 'Unknown';
        
        this.emit('whisper-speaking', { user: displayName });
        
        // Play the audio through the Emitter (to Commandants channel)
        if (EmitterBot.isReady()) {
            // Track in whisperStreams (not activeStreams)
            this.whisperStreams.push(audioStream);
            EmitterBot.playStream(audioStream);
            
            audioStream.on('end', () => {
                this.whisperStreams = this.whisperStreams.filter(s => s !== audioStream);
            });
        } else {
            this.emit('warning', { message: 'Emitter not ready for whisper playback' });
        }
    }
    
    // Send whisper command (for Chief mode)
    async sendWhisperCommand(enabled) {
        const webhookUrl = this.config.channels?.relay?.webhookUrl;
        
        if (!this.myChiefId) {
            this.emit('error', { message: 'Chief ID not configured' });
            return;
        }
        
        if (!webhookUrl) {
            this.emit('error', { message: 'Webhook URL not configured' });
            return;
        }
        
        try {
            const action = enabled ? 'ON' : 'OFF';
            const message = `WHISPER:${this.myChiefId}:${action}`;
            
            // Send via webhook (works without running bots)
            const https = require('https');
            const url = new URL(webhookUrl);
            
            const data = JSON.stringify({ content: message });
            
            const options = {
                hostname: url.hostname,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };
            
            await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
                req.on('error', reject);
                req.write(data);
                req.end();
            });
            
            this.emit('whisper-sent', { enabled });
        } catch (err) {
            this.emit('error', { message: `Failed to send whisper command: ${err.message}` });
        }
    }
    
    // Start briefing mode - move everyone to QG channel
    async startBriefing() {
        if (this.isBriefingActive) {
            this.emit('warning', { message: 'Briefing already active' });
            return;
        }
        
        const client = EmitterBot.getClient();
        if (!client) {
            throw new Error('Emitter client not available');
        }
        
        const qgChannelId = this.config.channels?.source?.id;
        if (!qgChannelId) {
            throw new Error('QG channel not configured');
        }
        
        this.emit('info', { message: '📢 Début du briefing...' });
        
        let movedCount = 0;
        
        // For each target channel, move all members to QG
        for (const target of this.config.channels?.targets || []) {
            try {
                const channel = await client.channels.fetch(target.id);
                if (!channel || !channel.members) continue;
                
                // Get all members in this voice channel
                for (const [memberId, member] of channel.members) {
                    // Skip bots
                    if (member.user.bot) continue;
                    
                    // Save original position
                    this.originalPositions.set(memberId, target.id);
                    
                    // Move to QG
                    try {
                        await member.voice.setChannel(qgChannelId);
                        movedCount++;
                        console.log(`[Briefing] Moved ${member.displayName} to QG`);
                    } catch (e) {
                        console.error(`[Briefing] Failed to move ${member.displayName}:`, e.message);
                    }
                }
            } catch (e) {
                console.error(`[Briefing] Error fetching channel ${target.id}:`, e.message);
            }
        }
        
        this.isBriefingActive = true;
        this.emit('briefing-started', { movedCount });
        this.emit('info', { message: `📢 Briefing actif - ${movedCount} membres déplacés vers QG` });
    }
    
    // End briefing mode - return everyone to original channels
    async endBriefing() {
        if (!this.isBriefingActive) {
            this.emit('warning', { message: 'No briefing active' });
            return;
        }
        
        const client = EmitterBot.getClient();
        if (!client) {
            throw new Error('Emitter client not available');
        }
        
        this.emit('info', { message: '📢 Fin du briefing...' });
        
        let movedCount = 0;
        const qgChannelId = this.config.channels?.source?.id;
        
        // Get the QG channel to find members
        try {
            const qgChannel = await client.channels.fetch(qgChannelId);
            if (!qgChannel || !qgChannel.members) {
                throw new Error('QG channel not found');
            }
            
            // Move each member back to their original channel
            for (const [memberId, originalChannelId] of this.originalPositions) {
                try {
                    // Check if member is still in QG
                    const member = qgChannel.members.get(memberId);
                    if (member) {
                        await member.voice.setChannel(originalChannelId);
                        movedCount++;
                        console.log(`[Briefing] Returned ${member.displayName} to original channel`);
                    }
                } catch (e) {
                    console.error(`[Briefing] Failed to return member ${memberId}:`, e.message);
                }
            }
        } catch (e) {
            console.error('[Briefing] Error ending briefing:', e.message);
        }
        
        // Clear state
        this.originalPositions.clear();
        this.isBriefingActive = false;
        
        this.emit('briefing-ended', { movedCount });
        this.emit('info', { message: `📢 Briefing terminé - ${movedCount} membres renvoyés` });
    }
    
    // Check if briefing is active
    isBriefingMode() {
        return this.isBriefingActive;
    }
}

module.exports = RelayManager;
