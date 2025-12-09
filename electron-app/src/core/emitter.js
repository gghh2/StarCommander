/**
 * Emitter Bot - Captures audio from Commanders
 * V4.0 - Electron version
 */

const { Client, GatewayIntentBits } = require('discord.js');
const { 
    joinVoiceChannel, 
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection,
    createAudioPlayer,
    createAudioResource,
    StreamType
} = require('@discordjs/voice');

// Client is created fresh on each start
let client = null;
let currentConnection = null;
let audioPlayer = null;
let onSpeakingCallback = null;
let config = null;
let getGlobalTarget = null;
let sourceChannel = null;

const speakingUsers = new Set();
let etatMajorRoleId = null;

function createClient() {
    return new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ]
    });
}

// Get the client instance (for relay listener)
function getClient() {
    return client;
}

async function start(cfg, onSpeaking, targetGetter) {
    config = cfg;
    onSpeakingCallback = onSpeaking;
    getGlobalTarget = targetGetter;
    
    console.log('[Emitter] Config received:', JSON.stringify({
        channels: config.channels,
        commanders: config.commanders
    }, null, 2));
    
    if (config.commanders?.byRole?.length > 0) {
        etatMajorRoleId = config.commanders.byRole[0].roleId;
    }
    
    // Create fresh client for each start
    client = createClient();
    
    return new Promise((resolve, reject) => {
        client.once('ready', async () => {
            console.log(`[Emitter] Logged in as ${client.user.tag}`);
            
            try {
                await joinSourceChannel();
                resolve();
            } catch (err) {
                console.error('[Emitter] Failed to join:', err.message);
                reject(err);
            }
        });
        
        client.on('voiceStateUpdate', handleVoiceStateUpdate);
        
        client.login(process.env.EMITTER_TOKEN).catch(reject);
    });
}

function checkAuthorization(member) {
    console.log(`[Emitter] Checking auth for: ${member.displayName} (${member.id})`);
    
    // Check by specific user first
    if (config.commanders?.byUser?.length > 0) {
        const userConfig = config.commanders.byUser.find(u => u.userId === member.id);
        if (userConfig) {
            console.log(`[Emitter] ✓ Authorized by user ID: ${userConfig.name}`);
            return { authorized: true, name: userConfig.name, isEtatMajor: true };
        }
    }
    
    // Check by role
    if (config.commanders?.byRole?.length > 0) {
        const memberRoleIds = [...member.roles.cache.keys()];
        console.log(`[Emitter] Member roles: ${memberRoleIds.join(', ')}`);
        console.log(`[Emitter] Required roles: ${config.commanders.byRole.map(r => r.roleId).join(', ')}`);
        
        for (const roleConfig of config.commanders.byRole) {
            if (member.roles.cache.has(roleConfig.roleId)) {
                console.log(`[Emitter] ✓ Authorized by role: ${roleConfig.roleName}`);
                return {
                    authorized: true,
                    name: member.displayName,
                    roleName: roleConfig.roleName,
                    isEtatMajor: roleConfig.roleId === etatMajorRoleId
                };
            }
        }
        
        // Roles are configured but member doesn't have any matching role
        console.log(`[Emitter] ✗ Not authorized - no matching role`);
        return { authorized: false };
    }
    
    // NO roles configured = allow everyone (testing mode)
    console.log(`[Emitter] ⚠ No roles configured - allowing everyone (add roles in app to restrict)`);
    return { 
        authorized: true, 
        name: member.displayName,
        roleName: 'All (no roles configured)',
        isEtatMajor: true 
    };
}

async function joinSourceChannel() {
    const channelId = config.channels?.source?.id;
    
    if (!channelId) {
        throw new Error('Source channel ID not configured');
    }
    
    console.log(`[Emitter] Fetching channel: ${channelId}`);
    const channel = await client.channels.fetch(channelId);
    
    if (!channel) {
        throw new Error(`Channel not found: ${channelId}`);
    }
    
    console.log(`[Emitter] Found: ${channel.name}`);
    sourceChannel = channel;
    
    await joinAndListen(channel);
}

async function handleVoiceStateUpdate(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member) return;
    if (member.id === client.user.id) return;
    
    const sourceChannelId = config.channels.source.id;
    
    if (oldState.channelId === sourceChannelId && newState.channelId !== sourceChannelId) {
        speakingUsers.delete(member.id);
    }
}

async function resubscribeSpeakingUsers() {
    if (!currentConnection || !sourceChannel) return;
    
    const receiver = currentConnection.receiver;
    const currentTarget = getGlobalTarget ? getGlobalTarget() : 'mute';
    
    if (currentTarget === 'mute') return;
    
    for (const oderId of speakingUsers) {
        try {
            const member = await sourceChannel.guild.members.fetch(oderId);
            const auth = checkAuthorization(member);
            if (!auth.authorized) continue;
            
            const audioStream = receiver.subscribe(oderId, {
                end: { behavior: 'afterSilence', duration: 500 }
            });
            
            if (onSpeakingCallback) {
                onSpeakingCallback(audioStream, auth);
            }
        } catch (e) {
            speakingUsers.delete(oderId);
        }
    }
}

async function joinAndListen(channel) {
    sourceChannel = channel;
    
    console.log(`[Emitter] Joining: ${channel.name}`);
    
    currentConnection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false  // Changed to false so we can speak for whisper
    });
    
    await entersState(currentConnection, VoiceConnectionStatus.Ready, 30_000);
    
    console.log(`[Emitter] Joined: ${channel.name}`);
    
    // Create audio player for whisper playback
    audioPlayer = createAudioPlayer();
    currentConnection.subscribe(audioPlayer);
    
    audioPlayer.on('error', error => {
        console.error('[Emitter] Player error:', error.message);
    });
    
    const receiver = currentConnection.receiver;
    receiver.speaking.setMaxListeners(20);
    
    receiver.speaking.on('start', async (userId) => {
        speakingUsers.add(userId);
        
        let member;
        try {
            member = await channel.guild.members.fetch(userId);
        } catch (e) { return; }
        
        const auth = checkAuthorization(member);
        if (!auth.authorized) {
            console.log(`[Emitter] Ignoring unauthorized speaker: ${member.displayName}`);
            return;
        }
        
        const currentTarget = getGlobalTarget ? getGlobalTarget() : 'mute';
        if (currentTarget === 'mute') {
            console.log(`[Emitter] Target is MUTE, not relaying`);
            return;
        }
        
        console.log(`[Emitter] Relaying ${member.displayName} to: ${currentTarget}`);
        
        const audioStream = receiver.subscribe(userId, {
            end: { behavior: 'afterSilence', duration: 500 }
        });
        
        if (onSpeakingCallback) {
            onSpeakingCallback(audioStream, auth);
        }
    });
    
    receiver.speaking.on('end', (userId) => {
        speakingUsers.delete(userId);
    });
    
    currentConnection.on(VoiceConnectionStatus.Disconnected, async () => {
        console.log('[Emitter] Disconnected, reconnecting...');
        try {
            await Promise.race([
                entersState(currentConnection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(currentConnection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch (error) {
            if (currentConnection) {
                currentConnection.destroy();
                currentConnection = null;
            }
            await joinAndListen(channel);
        }
    });
}

async function stop() {
    // Destroy audio player
    if (audioPlayer) {
        audioPlayer.stop();
        audioPlayer = null;
    }
    
    // Destroy voice connection
    if (currentConnection) {
        currentConnection.destroy();
        currentConnection = null;
    }
    
    // Clear state
    speakingUsers.clear();
    sourceChannel = null;
    
    // Destroy client
    if (client) {
        client.removeAllListeners();
        await client.destroy();
        client = null;
    }
}

// Play audio stream (for whisper - chief's voice to commandants)
function playStream(audioStream) {
    if (!currentConnection || !audioPlayer) {
        console.error('[Emitter] Not ready to play!');
        return;
    }
    
    try {
        const resource = createAudioResource(audioStream, {
            inputType: StreamType.Opus
        });
        
        audioPlayer.play(resource);
        console.log('[Emitter] Playing whisper audio');
        
    } catch (error) {
        console.error('[Emitter] Failed to play:', error.message);
    }
}

function playRawStream(pcmStream) {
    if (!currentConnection || !audioPlayer) {
        console.error('[Emitter] Not ready to play!');
        return;
    }
    
    try {
        const resource = createAudioResource(pcmStream, {
            inputType: StreamType.Raw,
            inlineVolume: false
        });
        
        audioPlayer.play(resource);
        console.log('[Emitter] Playing whisper raw audio');
        
    } catch (error) {
        console.error('[Emitter] Failed to play raw:', error.message);
    }
}

function isReady() {
    return !!currentConnection && !!audioPlayer;
}

module.exports = { start, stop, resubscribeSpeakingUsers, getClient, playStream, playRawStream, isReady };
