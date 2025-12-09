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
        this.isRunning = false;
        this.whisperStates = new Map(); // userId -> { active, channelKey }
        this.relayChannelId = null;
        this.myChiefId = null;
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
    }
    
    // Handle whisper audio (from chief to commandant channel)
    onWhisperAudio(audioStream, auth) {
        const displayName = auth.name || 'Unknown';
        
        this.emit('whisper-speaking', { user: displayName });
        
        // Play the audio through the Emitter (to Commandants channel)
        if (EmitterBot.isReady()) {
            this.activeStreams.push(audioStream);
            EmitterBot.playStream(audioStream);
            
            audioStream.on('end', () => {
                this.activeStreams = this.activeStreams.filter(s => s !== audioStream);
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
}

module.exports = RelayManager;
