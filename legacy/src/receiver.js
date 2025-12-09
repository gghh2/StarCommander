/**
 * Receiver Bot Factory
 * V3.5 - With PCM raw stream support
 */

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
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
        ]
    });

    let currentConnection = null;
    let audioPlayer = null;
    let ready = false;

    async function start() {
        return new Promise((resolve, reject) => {
            client.once('ready', async () => {
                console.log(`   ✓ [${name}] logged in as ${client.user.tag}`);
                
                try {
                    await joinTargetChannel();
                    resolve();
                } catch (error) {
                    console.error(`   ❌ [${name}] Failed to join:`, error.message);
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
        
        console.log(`   📍 [${name}] Found channel: "${channel.name}"`);
        
        currentConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
            group: client.user.id
        });
        
        currentConnection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log(`   ⚠️ [${name}] Disconnected`);
            ready = false;
        });
        
        currentConnection.on('error', (error) => {
            console.error(`   ❌ [${name}] Connection error:`, error.message);
        });
        
        await entersState(currentConnection, VoiceConnectionStatus.Ready, 30_000);
        console.log(`   ✓ [${name}] connected to "${channel.name}"`);
        
        audioPlayer = createAudioPlayer();
        currentConnection.subscribe(audioPlayer);
        
        audioPlayer.on('error', error => {
            console.error(`   ❌ [${name}] Player error:`, error.message);
        });
        
        ready = true;
    }

    function isReady() {
        return ready && currentConnection && audioPlayer;
    }

    // Play Opus stream directly (for single channel)
    function playStream(audioStream) {
        if (!isReady()) {
            console.error(`   ❌ [${name}] not ready!`);
            return;
        }
        
        try {
            const resource = createAudioResource(audioStream, {
                inputType: StreamType.Opus
            });
            
            audioPlayer.play(resource);
            
        } catch (error) {
            console.error(`   ❌ [${name}] Failed to play:`, error.message);
        }
    }
    
    // Play raw PCM stream (for multi-channel after decoding)
    function playRawStream(pcmStream) {
        if (!isReady()) {
            console.error(`   ❌ [${name}] not ready!`);
            return;
        }
        
        try {
            const resource = createAudioResource(pcmStream, {
                inputType: StreamType.Raw,
                inlineVolume: false
            });
            
            audioPlayer.play(resource);
            
        } catch (error) {
            console.error(`   ❌ [${name}] Failed to play raw:`, error.message);
        }
    }

    async function stop() {
        if (audioPlayer) audioPlayer.stop();
        if (currentConnection) currentConnection.destroy();
        await client.destroy();
        console.log(`   ✓ [${name}] stopped`);
    }

    return {
        name,
        start,
        stop,
        isReady,
        playStream,
        playRawStream
    };
}

module.exports = { createReceiver };
