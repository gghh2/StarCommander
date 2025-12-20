/**
 * RelayBot - Combined Emitter + Receiver
 * Listens in source channel, plays in target channel
 * Each bot has its own independent audio stream
 */

const { Client, GatewayIntentBits } = require('discord.js');
const { 
    joinVoiceChannel, 
    VoiceConnectionStatus,
    entersState,
    createAudioPlayer,
    createAudioResource,
    StreamType,
    getVoiceConnection
} = require('@discordjs/voice');

function createRelayBot(name, token, sourceChannelId, targetChannelId, config, getGlobalTarget) {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMembers,
        ]
    });

    let sourceConnection = null;
    let targetConnection = null;
    let audioPlayer = null;
    let ready = false;
    
    // For muting non-EtatMajor on private channels
    const mutedUsers = new Set();
    const etatMajorRoleId = config.commanders.byRole?.[0]?.roleId;

    async function start() {
        return new Promise((resolve, reject) => {
            client.once('ready', async () => {
                console.log(`   ✓ [${name}] logged in as ${client.user.tag}`);
                
                try {
                    await joinChannels();
                    resolve();
                } catch (error) {
                    console.error(`   ❌ [${name}] Failed to start:`, error.message);
                    reject(error);
                }
            });
            
            client.login(token).catch(reject);
        });
    }

    async function joinChannels() {
        // Get channels
        const sourceChannel = await client.channels.fetch(sourceChannelId);
        const targetChannel = await client.channels.fetch(targetChannelId);
        
        if (!sourceChannel || !targetChannel) {
            throw new Error(`[${name}] Channel not found!`);
        }
        
        console.log(`   📍 [${name}] Source: "${sourceChannel.name}" → Target: "${targetChannel.name}"`);
        
        // Connect to TARGET channel (to speak)
        targetConnection = joinVoiceChannel({
            channelId: targetChannel.id,
            guildId: targetChannel.guild.id,
            adapterCreator: targetChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
            group: `${client.user.id}-target`
        });
        
        await entersState(targetConnection, VoiceConnectionStatus.Ready, 30_000);
        console.log(`   ✓ [${name}] Connected to target: "${targetChannel.name}"`);
        
        // Setup audio player for target
        audioPlayer = createAudioPlayer();
        targetConnection.subscribe(audioPlayer);
        
        audioPlayer.on('error', error => {
            console.error(`   ❌ [${name}] Player error:`, error.message);
        });
        
        // Connect to SOURCE channel (to listen)
        sourceConnection = joinVoiceChannel({
            channelId: sourceChannel.id,
            guildId: sourceChannel.guild.id,
            adapterCreator: sourceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true,  // Muted in source
            group: `${client.user.id}-source`
        });
        
        await entersState(sourceConnection, VoiceConnectionStatus.Ready, 30_000);
        console.log(`   ✓ [${name}] Connected to source: "${sourceChannel.name}"`);
        
        // Setup receiver
        setupReceiver(sourceChannel);
        
        ready = true;
    }

    function checkAuthorization(member) {
        if (config.commanders.byUser?.length > 0) {
            const userConfig = config.commanders.byUser.find(u => u.userId === member.id);
            if (userConfig) {
                return { authorized: true, name: userConfig.name, isEtatMajor: true };
            }
        }
        
        if (config.commanders.byRole?.length > 0) {
            for (const roleConfig of config.commanders.byRole) {
                if (member.roles.cache.has(roleConfig.roleId)) {
                    return {
                        authorized: true,
                        name: member.displayName,
                        roleName: roleConfig.roleName,
                        isEtatMajor: roleConfig.roleId === etatMajorRoleId
                    };
                }
            }
        }
        
        return { authorized: false };
    }

    function setupReceiver(sourceChannel) {
        const receiver = sourceConnection.receiver;
        
        receiver.speaking.on('start', async (userId) => {
            let member;
            try {
                member = await sourceChannel.guild.members.fetch(userId);
            } catch (e) { return; }
            
            const auth = checkAuthorization(member);
            if (!auth.authorized) return;
            
            const currentTarget = getGlobalTarget();
            
            // Check if this bot should relay
            if (currentTarget === 'mute') {
                return;
            }
            
            // If not 'all', check if this bot's target matches
            if (currentTarget !== 'all' && currentTarget !== name) {
                return;
            }
            
            const roleInfo = auth.roleName ? ` (${auth.roleName})` : '';
            console.log(`   🎤 [${name}] ${auth.name}${roleInfo} speaking`);
            
            const audioStream = receiver.subscribe(userId, {
                end: { behavior: 'afterSilence', duration: 1000 }
            });
            
            // Play directly to target
            try {
                const resource = createAudioResource(audioStream, {
                    inputType: StreamType.Opus
                });
                
                audioPlayer.play(resource);
                console.log(`   ▶️ [${name}] Playing audio`);
                
            } catch (error) {
                console.error(`   ❌ [${name}] Failed to play:`, error.message);
            }
        });
    }

    function isReady() {
        return ready;
    }

    async function stop() {
        if (audioPlayer) audioPlayer.stop();
        if (sourceConnection) sourceConnection.destroy();
        if (targetConnection) targetConnection.destroy();
        await client.destroy();
        console.log(`   ✓ [${name}] stopped`);
    }

    return {
        name,
        start,
        stop,
        isReady
    };
}

module.exports = { createRelayBot };
