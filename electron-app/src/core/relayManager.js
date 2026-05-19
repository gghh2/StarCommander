/**
 * Star Commander - Relay Manager
 * Bridge between Electron and the relay core
 */

const { PassThrough } = require('stream');
const prism = require('prism-media');
const path = require('path');
const fs = require('fs');

const { createEmitter } = require('./emitter');
const { createReceiver } = require('./receiver');

class RelayManager {
    constructor(config, eventCallback) {
        this.config = config;
        this.eventCallback = eventCallback;
        this.emitter = createEmitter();
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
        
        // Audio effects settings
        this.radioEffectEnabled = config.settings?.radioEffectEnabled !== false;
        this.radioEffectIntensity = config.settings?.radioEffectIntensity ?? 50;
        this.clickSoundEnabled = config.settings?.clickSoundEnabled !== false;
        
        // Overlay data tracking
        this.currentVolume = 0;
        this.volumeUpdateInterval = null;
        
        // Sound file paths (different in dev vs packaged)
        // Try packaged path first, fallback to dev path
        const packagedPath = path.join(process.resourcesPath || '', 'assets/sounds');
        const devPath = path.join(__dirname, '../../assets/sounds');
        this.soundsPath = fs.existsSync(packagedPath) ? packagedPath : devPath;
        
        this.clickStartPath = path.join(this.soundsPath, 'click_start.mp3');
        this.clickEndPath = path.join(this.soundsPath, 'click_end.mp3');
    }
    
    emit(event, data) {
        if (this.eventCallback) {
            this.eventCallback(event, data);
        }
    }
    
    // Calculate volume from PCM audio buffer
    calculateVolume(buffer) {
        if (!buffer || buffer.length === 0) return 0;
        
        // Convert to 16-bit samples
        const samples = buffer.length / 2;
        let sum = 0;
        
        for (let i = 0; i < buffer.length; i += 2) {
            const sample = buffer.readInt16LE(i);
            sum += Math.abs(sample);
        }
        
        // Average and normalize to 0-100
        const average = sum / samples;
        const normalized = Math.min(100, (average / 32768) * 100);
        
        // Multiply by 10 for better sensitivity (capped at 100)
        return Math.min(100, Math.round(normalized * 10));
    }
    
    // Send overlay data (volume + listeners) — diff-and-skip to avoid
    // hammering the renderer 10 times per second with unchanged data.
    sendOverlayData() {
        if (!this.isRunning) return;

        const target = this.globalTarget;
        let listenersCount = 0;

        const client = this.emitter.getClient();
        if (client && client.channels) {
            try {
                if (target === 'mute') {
                    const sourceChannelId = this.config.channels?.source?.id;
                    if (sourceChannelId) {
                        const sourceChannel = client.channels.cache.get(sourceChannelId);
                        if (sourceChannel && sourceChannel.members) {
                            listenersCount = sourceChannel.members.filter(m => !m.user.bot).size;
                        }
                    }
                } else if (target === 'all') {
                    for (const targetConfig of this.config.channels?.targets || []) {
                        const channel = client.channels.cache.get(targetConfig.id);
                        if (channel && channel.members) {
                            listenersCount += channel.members.filter(m => !m.user.bot).size;
                        }
                    }
                } else {
                    const targetConfig = this.config.channels?.targets?.find(t => t.name === target);
                    if (targetConfig) {
                        const channel = client.channels.cache.get(targetConfig.id);
                        if (channel && channel.members) {
                            listenersCount = channel.members.filter(m => !m.user.bot).size;
                        }
                    }
                }
            } catch (err) {
                console.error('[RelayManager] Error counting listeners:', err.message);
            }
        }

        // Skip emission if nothing visible changed since the last tick.
        if (this._lastOverlayVolume === this.currentVolume &&
            this._lastOverlayListeners === listenersCount &&
            this._lastOverlayTarget === target) {
            return;
        }
        this._lastOverlayVolume = this.currentVolume;
        this._lastOverlayListeners = listenersCount;
        this._lastOverlayTarget = target;

        this.emit('overlay-data', {
            volume: this.currentVolume,
            listeners: listenersCount
        });
    }
        
    // Apply radio effect filter to audio stream (with optional click prepend)
    applyRadioEffect(inputStream) {
        if (!this.radioEffectEnabled) {
            return inputStream;
        }
        
        try {
            // Calculate filter parameters based on intensity (0-100)
            const intensity = this.radioEffectIntensity / 100;
            
            // Highpass: 100Hz (léger) to 500Hz (fort)
            const highpassFreq = Math.round(100 + (intensity * 400));
            
            // Lowpass: 5000Hz (léger) to 2500Hz (fort)
            const lowpassFreq = Math.round(5000 - (intensity * 2500));
            
            // Compression ratio: 2 (léger) to 8 (fort)
            const compRatio = 2 + (intensity * 6);
            
            // Volume boost: 1.0 (léger) to 1.5 (fort)
            const volume = 1.0 + (intensity * 0.5);
            
            const filterChain = `highpass=f=${highpassFreq},lowpass=f=${lowpassFreq},acompressor=threshold=-20dB:ratio=${compRatio}:attack=5:release=50,volume=${volume.toFixed(1)}`;
            
            const ffmpeg = new prism.FFmpeg({
                args: [
                    '-analyzeduration', '0',
                    '-loglevel', '0',
                    '-f', 's16le',
                    '-ar', '48000',
                    '-ac', '2',
                    '-i', '-',
                    '-af', filterChain,
                    '-f', 's16le',
                    '-ar', '48000',
                    '-ac', '2'
                ]
            });
            
            // If click sound enabled, prepend click to the stream
            if (this.clickSoundEnabled && fs.existsSync(this.clickStartPath)) {
                this.prependClickToStream(inputStream, ffmpeg);
            } else {
                inputStream.pipe(ffmpeg);
            }
            
            this.activeStreams.push(ffmpeg);
            
            return ffmpeg;
        } catch (err) {
            console.error('[RelayManager] Radio effect error:', err);
            return inputStream;
        }
    }
    
    // Prepend click sound to audio stream
    prependClickToStream(inputStream, outputStream) {
        const clickReadStream = fs.createReadStream(this.clickStartPath);
        let clickFinished = false;
        
        // Decode click MP3 to raw PCM
        const clickDecoder = new prism.FFmpeg({
            args: [
                '-analyzeduration', '0',
                '-loglevel', '0',
                '-i', '-',
                '-f', 's16le',
                '-ar', '48000',
                '-ac', '2'
            ]
        });
        
        clickReadStream.pipe(clickDecoder);
        
        // First send click, then forward input stream data
        clickDecoder.on('data', (chunk) => {
            if (!outputStream.destroyed) {
                outputStream.write(chunk);
            }
        });
        
        clickDecoder.on('end', () => {
            clickFinished = true;
            console.log('[RelayManager] Click prepended, now streaming voice');
        });
        
        clickDecoder.on('error', (err) => {
            console.error('[RelayManager] Click decode error:', err);
            clickFinished = true;
        });
        
        // Forward input stream data to output (after click or immediately on data)
        inputStream.on('data', (chunk) => {
            if (!outputStream.destroyed) {
                outputStream.write(chunk);
            }
        });
        
        inputStream.on('end', () => {
            if (!outputStream.destroyed) {
                outputStream.end();
            }
        });
    }
    
    // Play click sound on a receiver
    playClickSound(receiver, isStart = true) {
        if (!this.clickSoundEnabled) return;
        
        const clickPath = isStart ? this.clickStartPath : this.clickEndPath;
        
        if (!fs.existsSync(clickPath)) {
            console.log('[RelayManager] Click sound not found:', clickPath);
            return;
        }
        
        try {
            const { createAudioResource, StreamType } = require('@discordjs/voice');
            const resource = createAudioResource(clickPath, {
                inputType: StreamType.Arbitrary
            });
            
            if (receiver.audioPlayer) {
                receiver.audioPlayer.play(resource);
                console.log('[RelayManager] Click sound played');
            }
        } catch (err) {
            console.error('[RelayManager] Click sound error:', err);
        }
    }
    
    // Play click sound on emitter (for whisper)
    playClickSoundOnEmitter(isStart = true) {
        if (!this.clickSoundEnabled) return;
        
        const clickPath = isStart ? this.clickStartPath : this.clickEndPath;
        
        if (!fs.existsSync(clickPath)) {
            console.log('[RelayManager] Click sound not found:', clickPath);
            return;
        }
        
        try {
            if (this.emitter.isReady()) {
                const { createAudioResource, StreamType } = require('@discordjs/voice');
                const resource = createAudioResource(clickPath, {
                    inputType: StreamType.Arbitrary
                });
                this.emitter.playResource(resource);
                console.log('[RelayManager] Click sound on emitter played');
            }
        } catch (err) {
            console.error('[RelayManager] Click sound on emitter error:', err);
        }
    }
    
    getGlobalTarget() {
        return this.globalTarget;
    }
    
    // Update audio settings in real-time (no restart needed)
    updateAudioSettings(settings) {
        if (settings.radioEffectEnabled !== undefined) {
            this.radioEffectEnabled = settings.radioEffectEnabled;
        }
        if (settings.radioEffectIntensity !== undefined) {
            this.radioEffectIntensity = settings.radioEffectIntensity;
        }
        if (settings.clickSoundEnabled !== undefined) {
            this.clickSoundEnabled = settings.clickSoundEnabled;
        }
        console.log('[RelayManager] Audio settings updated:', {
            radioEffectEnabled: this.radioEffectEnabled,
            radioEffectIntensity: this.radioEffectIntensity,
            clickSoundEnabled: this.clickSoundEnabled
        });
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
            this.emitter.resubscribeSpeakingUsers();
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
        if (this.emitter.isReady()) {
            this.emitter.stopPlayback();
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
        await this.emitter.start(
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
        
        // Start sending overlay data every 100ms
        this.volumeUpdateInterval = setInterval(() => {
            this.sendOverlayData();
            // Decay volume gradually
            this.currentVolume = Math.max(0, this.currentVolume - 10);
        }, 100);
    }
    
    async stop() {
        // Stop overlay updates
        if (this.volumeUpdateInterval) {
            clearInterval(this.volumeUpdateInterval);
            this.volumeUpdateInterval = null;
        }
        this.currentVolume = 0;
        
        this.killActiveStreams();
        
        await this.emitter.stop();
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
    
    // ✅ Toujours décoder pour calculer le volume (même en mute)
    let isCleanedUp = false;
    
    const decoder = new prism.opus.Decoder({
        rate: 48000,
        channels: 2,
        frameSize: 960
    });
    
    // Track decoder
    this.activeStreams.push(audioStream, decoder);
    
    // Pipe audio to decoder (with error protection)
    audioStream.on('data', (chunk) => {
        if (!isCleanedUp && !decoder.destroyed) {
            try {
                decoder.write(chunk);
            } catch (e) {
                console.error('[RelayManager] Decoder write error:', e.message);
            }
        }
    });
    
    // ❌ NE PAS calculer le volume ici - ça ne marche pas en MUTE
    // decoder.on('data', (chunk) => { ... });
    
    // Base cleanup
    const baseCleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        
        if (!decoder.destroyed) {
            try { decoder.destroy(); } catch(e) {}
        }
        this.activeStreams = this.activeStreams.filter(s => 
            s !== audioStream && s !== decoder
        );
    };
    
    audioStream.on('end', baseCleanup);
    audioStream.on('error', baseCleanup);
    audioStream.on('close', baseCleanup);
    decoder.on('error', baseCleanup);

    // In MUTE we don't relay anywhere, so spawning an ffmpeg subprocess
    // per speaker just to compute volume is wasteful. Read PCM straight
    // from the decoder and bail out — no radio effect needed.
    if (target === 'mute') {
        decoder.on('data', (chunk) => {
            if (!isCleanedUp) this.currentVolume = this.calculateVolume(chunk);
        });
        decoder.on('end', baseCleanup);
        return;
    }

    const processedStream = this.applyRadioEffect(decoder);

    processedStream.on('data', (chunk) => {
        if (!isCleanedUp) this.currentVolume = this.calculateVolume(chunk);
    });
    
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
    
    // Single receiver: direct connection
    if (targetReceivers.length === 1) {
        // Create fresh PassThrough for transmission
        const outputStream = new PassThrough({ highWaterMark: 1024 * 64 });
        
        // Track stream
        this.activeStreams.push(outputStream);
        
        // Play the output stream
        targetReceivers[0].playRawStream(outputStream);
        
        // Pipe processed data to output
        processedStream.on('data', (chunk) => {
            if (!isCleanedUp && !outputStream.destroyed) {
                outputStream.write(chunk);
            }
        });
        
        // Extended cleanup with output stream
        const cleanupWithOutput = () => {
            baseCleanup();
            if (!outputStream.destroyed) outputStream.end();
            this.activeStreams = this.activeStreams.filter(s => s !== outputStream);
        };
        
        processedStream.on('end', cleanupWithOutput);
        processedStream.on('error', cleanupWithOutput);
        return;
    }
    
    // Multiple receivers: duplicate PCM stream
    try {
        const pcmStreams = targetReceivers.map(() => new PassThrough({
            highWaterMark: 1024 * 64
        }));
        
        // Track streams
        this.activeStreams.push(...pcmStreams);
        
        targetReceivers.forEach((receiver, i) => {
            receiver.playRawStream(pcmStreams[i]);
        });
        
        processedStream.on('data', (chunk) => {
            if (isCleanedUp) return;
            const buffer = Buffer.from(chunk);
            for (let i = 0; i < pcmStreams.length; i++) {
                if (!pcmStreams[i].destroyed) {
                    pcmStreams[i].write(buffer);
                }
            }
        });
        
        // Extended cleanup with PCM streams
        const cleanupWithStreams = () => {
            baseCleanup();
            for (let i = 0; i < pcmStreams.length; i++) {
                if (!pcmStreams[i].destroyed) {
                    pcmStreams[i].end();
                }
            }
            this.activeStreams = this.activeStreams.filter(s => !pcmStreams.includes(s));
        };
        
        processedStream.on('end', cleanupWithStreams);
        processedStream.on('error', (err) => {
            cleanupWithStreams();
            this.emit('error', { message: `Radio effect error: ${err.message}` });
        });
        
    } catch (err) {
        this.emit('error', { message: `Transcoding error: ${err.message}` });
    }
}
    
    // Setup listener for whisper commands in relay channel
    setupRelayListener() {
        const client = this.emitter.getClient();
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
        if (this.emitter.isReady()) {
            let isCleanedUp = false;
            
            // Decode opus to PCM for radio effect
            const decoder = new prism.opus.Decoder({
                rate: 48000,
                channels: 2,
                frameSize: 960
            });
            
            // Apply radio effect
            const processedStream = this.applyRadioEffect(decoder);
            
            // Track in whisperStreams
            this.whisperStreams.push(audioStream, decoder, processedStream);
            
            // Play processed stream through emitter
            this.emitter.playRawStream(processedStream);
            
            // Pipe audio to decoder (with error protection)
            audioStream.on('data', (chunk) => {
                if (!isCleanedUp && !decoder.destroyed) {
                    try {
                        decoder.write(chunk);
                    } catch (e) {
                        console.error('[RelayManager] Whisper decoder write error:', e.message);
                    }
                }
            });
            
            // Cleanup
            const cleanup = () => {
                if (isCleanedUp) return;
                isCleanedUp = true;
                
                if (!decoder.destroyed) {
                    try { decoder.destroy(); } catch(e) {}
                }
                this.whisperStreams = this.whisperStreams.filter(s => 
                    s !== audioStream && s !== decoder && s !== processedStream
                );
            };
            
            audioStream.on('end', cleanup);
            audioStream.on('error', cleanup);
            audioStream.on('close', cleanup);
            decoder.on('error', cleanup);
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
        
        const client = this.emitter.getClient();
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
        
        const client = this.emitter.getClient();
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
    
    // Get all guild members (for chiefs autocomplete)
    async getGuildMembers() {
        const client = this.emitter.getClient();  // ✅ Utiliser EmitterBot directement
        if (!client || !client.guilds) {
            console.log('[RelayManager] No client or guilds available');
            return [];
        }
        
        try {
            // Get all guilds the bot is in
            const guilds = client.guilds.cache;
            if (guilds.size === 0) {
                console.log('[RelayManager] No guilds found');
                return [];
            }
            
            // Use the first guild (bot should only be in one server for Star Commander)
            const guild = guilds.first();
            console.log(`[RelayManager] Fetching members from guild: ${guild.name}`);
            
            // Fetch all members
            await guild.members.fetch();
            
            // Map to simple format
            const members = guild.members.cache.map(member => ({
                id: member.id,
                username: member.user.username,
                displayName: member.displayName || member.user.username,
                tag: member.user.tag,
                bot: member.user.bot
            }));
            
            console.log(`[RelayManager] Total members found: ${members.length}`);
            
            // Filter out bots and return
            const nonBots = members.filter(m => !m.bot);
            console.log(`[RelayManager] Non-bot members: ${nonBots.length}`);
            
            return nonBots;
        } catch (error) {
            console.error('[RelayManager] Error fetching guild members:', error);
            return [];
        }
    }

    // Get all voice AND text channels from guild (for Bots configuration)
    async getGuildChannels() {
        const client = this.emitter.getClient();
        if (!client || !client.guilds) {
            console.log('[RelayManager] No client or guilds available');
            return { voice: [], text: [] };
        }
        
        try {
            // Get all guilds the bot is in
            const guilds = client.guilds.cache;
            if (guilds.size === 0) {
                console.log('[RelayManager] No guilds found');
                return { voice: [], text: [] };
            }
            
            // Use the first guild
            const guild = guilds.first();
            console.log(`[RelayManager] Fetching channels from guild: ${guild.name}`);
            
            // Fetch all channels
            await guild.channels.fetch();
            
            // Filter VOICE channels (type 2)
            const voiceChannels = guild.channels.cache
                .filter(channel => channel.type === 2)
                .map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    type: 'voice',
                    position: channel.position,
                    parentId: channel.parentId,
                    parentName: channel.parent ? channel.parent.name : null
                }))
                .sort((a, b) => a.position - b.position);
            
            // Filter TEXT channels (type 0)
            const textChannels = guild.channels.cache
                .filter(channel => channel.type === 0)
                .map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    type: 'text',
                    position: channel.position,
                    parentId: channel.parentId,
                    parentName: channel.parent ? channel.parent.name : null
                }))
                .sort((a, b) => a.position - b.position);
            
            console.log(`[RelayManager] Voice channels found: ${voiceChannels.length}`);
            console.log(`[RelayManager] Text channels found: ${textChannels.length}`);
            
            return { voice: voiceChannels, text: textChannels };
        } catch (error) {
            console.error('[RelayManager] Error fetching guild channels:', error);
            return { voice: [], text: [] };
        }
    }    

}

module.exports = RelayManager;
