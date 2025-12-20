/**
 * Emitter Bot - Captures audio from Commanders
 * V3.3 - With resubscribe capability for instant switching
 */

const { Client, GatewayIntentBits } = require('discord.js');
const { 
    joinVoiceChannel, 
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection
} = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ]
});

let currentConnection = null;
let onSpeakingCallback = null;
let config = null;
let getGlobalTarget = null;
let sourceChannel = null;

// Track currently speaking users
const speakingUsers = new Set();

let etatMajorRoleId = null;

async function start(cfg, onSpeaking, targetGetter) {
    config = cfg;
    onSpeakingCallback = onSpeaking;
    getGlobalTarget = targetGetter;
    
    if (config.commanders.byRole?.length > 0) {
        etatMajorRoleId = config.commanders.byRole[0].roleId;
    }
    
    client.once('ready', () => {
        console.log(`   ✓ Emitter logged in as ${client.user.tag}`);
        checkAndJoinChannel();
    });
    
    client.on('voiceStateUpdate', handleVoiceStateUpdate);
    
    await client.login(process.env.EMITTER_TOKEN);
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

function hasAuthorizedMember(channel) {
    for (const [memberId, member] of channel.members) {
        if (checkAuthorization(member).authorized) return true;
    }
    return false;
}

async function checkAndJoinChannel() {
    const channel = await client.channels.fetch(config.channels.source.id);
    if (!channel) {
        console.error('   ❌ Source channel not found!');
        return;
    }
    
    sourceChannel = channel;
    
    if (hasAuthorizedMember(channel)) {
        console.log('   📍 Commander(s) already in channel, joining...');
        await joinAndListen(channel);
    } else {
        console.log('   ⏳ Waiting for commanders to join source channel...');
    }
}

async function handleVoiceStateUpdate(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member) return;
    
    const sourceChannelId = config.channels.source.id;
    const auth = checkAuthorization(member);
    if (!auth.authorized) return;
    
    if (newState.channelId === sourceChannelId && oldState.channelId !== sourceChannelId) {
        console.log(`🎖️  ${auth.name} joined source channel`);
        if (!currentConnection) await joinAndListen(newState.channel);
    }
    
    if (oldState.channelId === sourceChannelId && newState.channelId !== sourceChannelId) {
        console.log(`🎖️  ${auth.name} left source channel`);
        speakingUsers.delete(member.id);
        
        const channel = await client.channels.fetch(sourceChannelId);
        if (!hasAuthorizedMember(channel)) {
            console.log('   📤 No commanders left, disconnecting...');
            leaveChannel(oldState.guild.id);
        }
    }
}

// Resubscribe all currently speaking users (called on target change)
async function resubscribeSpeakingUsers() {
    if (!currentConnection || !sourceChannel) return;
    
    const receiver = currentConnection.receiver;
    const currentTarget = getGlobalTarget ? getGlobalTarget() : 'mute';
    
    if (currentTarget === 'mute') return;
    
    for (const userId of speakingUsers) {
        try {
            const member = await sourceChannel.guild.members.fetch(userId);
            const auth = checkAuthorization(member);
            if (!auth.authorized) continue;
            
            const audioStream = receiver.subscribe(userId, {
                end: { behavior: 'afterSilence', duration: 500 }
            });
            
            if (onSpeakingCallback) {
                onSpeakingCallback(audioStream, auth);
            }
        } catch (e) {
            speakingUsers.delete(userId);
        }
    }
}

async function joinAndListen(channel) {
    try {
        sourceChannel = channel;
        
        currentConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true
        });
        
        await entersState(currentConnection, VoiceConnectionStatus.Ready, 30_000);
        console.log('   ✓ Emitter connected to voice channel');
        
        const receiver = currentConnection.receiver;
        receiver.speaking.setMaxListeners(20);
        
        receiver.speaking.on('start', async (userId) => {
            // Track speaking user
            speakingUsers.add(userId);
            
            let member;
            try {
                member = await channel.guild.members.fetch(userId);
            } catch (e) { return; }
            
            const auth = checkAuthorization(member);
            if (!auth.authorized) return;
            
            const currentTarget = getGlobalTarget ? getGlobalTarget() : 'mute';
            if (currentTarget === 'mute') return;
            
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
        
    } catch (error) {
        console.error('   ❌ Failed to join voice channel:', error);
    }
}

function leaveChannel(guildId) {
    const connection = getVoiceConnection(guildId);
    if (connection) {
        connection.destroy();
        currentConnection = null;
        sourceChannel = null;
        speakingUsers.clear();
        console.log('   ✓ Emitter left voice channel');
    }
}

async function stop() {
    if (currentConnection) currentConnection.destroy();
    speakingUsers.clear();
    await client.destroy();
    console.log('   ✓ Emitter stopped');
}

module.exports = { start, stop, resubscribeSpeakingUsers };
