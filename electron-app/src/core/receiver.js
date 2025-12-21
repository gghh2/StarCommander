/**
 * Receiver Bot Factory
 * V4.0 - Electron version with Whisper support
 */

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Forcer IPv4

const { Client, GatewayIntentBits } = require('discord.js');
const { 
    joinVoiceChannel, 
    VoiceConnectionStatus,
    entersState,
    createAudioPlayer,
    createAudioResource,
    StreamType
} = require('@discordjs/voice');

function createReceiver(name, token, channelId) {
    let client = null;
    let currentConnection = null;
    let audioPlayer = null;
    let ready = false;
    let listeningToUser = null;
    let onWhisperCallback = null;
    let targetChannel = null;

    async function start() {
        // Create fresh client for each start
        client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMembers,
            ]
        });

        return new Promise((resolve, reject) => {
            client.once('ready', async () => {
                console.log(`[${name}] Logged in as ${client.user.tag}`);
                
                try {
                    await joinTargetChannel();
                    resolve();
                } catch (error) {
                    console.error(`[${name}] Failed to join:`, error.message);
                    reject(error);
                }
            });
            
            client.login(token).catch(reject);
        });
    }

    async function joinTargetChannel() {
        const channel = await client.channels.fetch(channelId);
        
        if (!channel) {
            throw new Error(`[${name}] Target channel not found!`);
        }
        
        console.log(`[${name}] Found: ${channel.name}`);
        targetChannel = channel;
        
        currentConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
            group: client.user.id
        });
        
        currentConnection.on(VoiceConnectionStatus.Disconnected, () => {
            ready = false;
            console.log(`[${name}] Disconnected`);
        });
        
        currentConnection.on('error', (error) => {
            console.error(`[${name}] Connection error:`, error.message);
        });
        
        await entersState(currentConnection, VoiceConnectionStatus.Ready, 30_000);
        
        console.log(`[${name}] Joined: ${channel.name}`);
        
        audioPlayer = createAudioPlayer();
        currentConnection.subscribe(audioPlayer);
        
        audioPlayer.on('error', error => {
            console.error(`[${name}] Player error:`, error.message);
        });
        
        // Setup receiver for whisper listening
        setupWhisperListener();
        
        ready = true;
    }
    
    // Setup listening for whisper
    function setupWhisperListener() {
        if (!currentConnection) return;
        
        const receiver = currentConnection.receiver;
        receiver.speaking.setMaxListeners(20);
        
        receiver.speaking.on('start', async (userId) => {
            // Only listen to specific user when whisper is active
            if (!listeningToUser || userId !== listeningToUser) return;
            
            console.log(`[${name}] Whisper: capturing audio from ${userId}`);
            
            const audioStream = receiver.subscribe(userId, {
                end: { behavior: 'afterSilence', duration: 100 }
            });
            
            if (onWhisperCallback) {
                // Get member name
                let memberName = userId;
                try {
                    const member = await targetChannel.guild.members.fetch(userId);
                    memberName = member.displayName;
                } catch (e) {}
                
                onWhisperCallback(audioStream, { userId, name: memberName });
            }
        });
    }
    
    // Start listening to a specific user (for whisper)
    function startListening(userId, callback) {
        listeningToUser = userId;
        onWhisperCallback = callback;
        console.log(`[${name}] Now listening for whisper from: ${userId}`);
    }
    
    // Stop listening
    function stopListening() {
        listeningToUser = null;
        onWhisperCallback = null;
        console.log(`[${name}] Stopped listening for whisper`);
    }

    function isReady() {
        return ready && currentConnection && audioPlayer;
    }
    
    function isListening() {
        return !!listeningToUser;
    }

    function playStream(audioStream) {
        if (!isReady()) {
            console.error(`[${name}] not ready!`);
            return;
        }
        
        try {
            const resource = createAudioResource(audioStream, {
                inputType: StreamType.Opus
            });
            
            audioPlayer.play(resource);
            
        } catch (error) {
            console.error(`[${name}] Failed to play:`, error.message);
        }
    }
    
    function playRawStream(pcmStream) {
        if (!isReady()) {
            console.error(`[${name}] not ready!`);
            return;
        }
        
        try {
            const resource = createAudioResource(pcmStream, {
                inputType: StreamType.Raw,
                inlineVolume: false
            });
            
            audioPlayer.play(resource);
            
        } catch (error) {
            console.error(`[${name}] Failed to play raw:`, error.message);
        }
    }

    async function stop() {
        ready = false;
        listeningToUser = null;
        onWhisperCallback = null;
        
        if (audioPlayer) {
            audioPlayer.stop();
            audioPlayer = null;
        }
        
        if (currentConnection) {
            currentConnection.destroy();
            currentConnection = null;
        }
        
        if (client) {
            client.removeAllListeners();
            await client.destroy();
            client = null;
        }
    }

    return {
        name,
        client,
        start,
        stop,
        isReady,
        isListening,
        playStream,
        playRawStream,
        startListening,
        stopListening,
        get audioPlayer() { return audioPlayer; }
    };
}

module.exports = { createReceiver };
