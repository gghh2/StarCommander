/**
 * Temporary Discord connection for configuration purposes
 * Connects with Emitter token only to fetch guild data
 */

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { Client, GatewayIntentBits } = require('discord.js');

let tempClient = null;

// Connect temporarily with Emitter token
async function connectTemp(token) {
    // Disconnect any existing temp connection
    if (tempClient) {
        await disconnectTemp();
    }
    
    tempClient = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMembers,
        ]
    });
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Connection timeout (15s)'));
        }, 15000);
        
        tempClient.once('ready', () => {
            clearTimeout(timeout);
            console.log('[TempConnection] Connected as', tempClient.user.tag);
            resolve();
        });
        
        tempClient.login(token).catch(err => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

// Disconnect temporary connection
async function disconnectTemp() {
    if (tempClient) {
        await tempClient.destroy();
        tempClient = null;
        console.log('[TempConnection] Disconnected');
    }
}

// Get guild members
async function getGuildMembers() {
    if (!tempClient || !tempClient.guilds) {
        throw new Error('Not connected');
    }
    
    const guilds = tempClient.guilds.cache;
    if (guilds.size === 0) {
        return [];
    }
    
    const guild = guilds.first();
    await guild.members.fetch();
    
    const members = guild.members.cache.map(member => ({
        id: member.id,
        username: member.user.username,
        displayName: member.displayName || member.user.username,
        tag: member.user.tag,
        bot: member.user.bot
    }));
    
    return members.filter(m => !m.bot);
}

// Get guild channels
async function getGuildChannels() {
    if (!tempClient || !tempClient.guilds) {
        throw new Error('Not connected');
    }
    
    const guilds = tempClient.guilds.cache;
    if (guilds.size === 0) {
        return { voice: [], text: [] };
    }
    
    const guild = guilds.first();
    await guild.channels.fetch();
    
    // Voice channels (type 2)
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
    
    // Text channels (type 0)
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
    
    return { voice: voiceChannels, text: textChannels };
}

// Check if connected
function isConnected() {
    return tempClient && tempClient.isReady();
}

module.exports = {
    connectTemp,
    disconnectTemp,
    getGuildMembers,
    getGuildChannels,
    isConnected
};