/**
 * Star Commander - Discord Voice Relay
 * V3.5 - FFmpeg transcoding for multi-channel (perfect audio)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const prism = require('prism-media');

const EmitterBot = require('./emitter');
const { createReceiver } = require('./receiver');
const HttpServer = require('./server');

// Load configuration
const configPath = path.join(__dirname, '..', 'config.json');
if (!fs.existsSync(configPath)) {
    console.error('❌ config.json not found!');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Validate required tokens
const requiredTokens = [
    'EMITTER_TOKEN',
    ...config.channels.targets.map(t => t.tokenEnv)
];

const missingTokens = requiredTokens.filter(varName => !process.env[varName]);
if (missingTokens.length > 0) {
    console.error('❌ Missing tokens in .env:');
    missingTokens.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
}

console.log('🚀 Star Commander Relay - V3.5');
console.log('================================\n');

console.log('📋 Configuration:');
console.log(`   Source: ${config.channels.source.name}`);
console.log(`   Targets: ${config.channels.targets.map(t => t.name).join(', ')}`);
if (config.commanders.byRole?.length > 0) {
    console.log(`   Roles autorisés: ${config.commanders.byRole.map(r => r.roleName).join(', ')}`);
}
console.log('');

const receivers = [];
let globalTarget = 'mute';

let activeStreams = [];

function getGlobalTarget() {
    return globalTarget;
}

function killActiveStreams() {
    activeStreams.forEach(stream => {
        if (stream && !stream.destroyed) {
            stream.destroy();
        }
    });
    activeStreams = [];
}

async function start() {
    try {
        console.log('🌐 Starting HTTP Server...');
        HttpServer.start(config, onTargetChange);
        
        console.log('📡 Starting Emitter Bot...');
        await EmitterBot.start(config, onCommanderSpeaking, getGlobalTarget);
        
        console.log('\n🔊 Starting Receiver Bots...');
        for (const target of config.channels.targets) {
            const receiver = createReceiver(
                target.name,
                process.env[target.tokenEnv],
                target.id
            );
            await receiver.start();
            receivers.push(receiver);
        }
        
        console.log('\n✅ All bots are online!');
        console.log('🎮 Keybinds: 0=All, 1=Mute, 2=Artilleurs, 3=Ingénieurs, 4=Escadrille\n');
        
    } catch (error) {
        console.error('❌ Failed to start:', error);
        process.exit(1);
    }
}

function onTargetChange(target) {
    killActiveStreams();
    
    globalTarget = target;
    if (target === 'mute') {
        console.log(`\n   🔇 Broadcast OFF\n`);
    } else if (target === 'all') {
        console.log(`\n   📻 Broadcasting → TOUS\n`);
    } else {
        console.log(`\n   📻 Broadcasting → ${target}\n`);
    }
    
    if (target !== 'mute') {
        EmitterBot.resubscribeSpeakingUsers();
    }
}

function onCommanderSpeaking(audioStream, auth) {
    const displayName = auth.name || 'Unknown';
    const roleName = auth.roleName || '';
    
    const target = globalTarget;
    
    if (target === 'mute') {
        return;
    }
    
    let targetReceivers = [];
    
    if (target === 'all') {
        targetReceivers = receivers.filter(r => r.isReady());
    } else {
        targetReceivers = receivers.filter(r => r.name === target && r.isReady());
    }
    
    if (targetReceivers.length === 0) {
        return;
    }
    
    const roleInfo = roleName ? ` (${roleName})` : '';
    console.log(`   🎤 [${displayName}${roleInfo}] → ${targetReceivers.map(r => r.name).join(', ')}`);
    
    // Single receiver: direct Opus stream (perfect quality, no transcoding)
    if (targetReceivers.length === 1) {
        activeStreams.push(audioStream);
        targetReceivers[0].playStream(audioStream);
        
        audioStream.on('end', () => {
            activeStreams = activeStreams.filter(s => s !== audioStream);
        });
        return;
    }
    
    // Multiple receivers: decode to PCM, duplicate, play as raw
    try {
        // Decode Opus to PCM
        const decoder = new prism.opus.Decoder({
            rate: 48000,
            channels: 2,
            frameSize: 960
        });
        
        activeStreams.push(audioStream);
        activeStreams.push(decoder);
        
        // Pipe Opus stream to decoder
        audioStream.pipe(decoder);
        
        // Create PassThrough for each receiver (PCM)
        const pcmStreams = targetReceivers.map(() => new PassThrough({
            highWaterMark: 1024 * 64
        }));
        
        pcmStreams.forEach(s => activeStreams.push(s));
        
        // Start playing on each receiver (as raw PCM)
        targetReceivers.forEach((receiver, i) => {
            receiver.playRawStream(pcmStreams[i]);
        });
        
        // Forward PCM chunks to all streams
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
            activeStreams = activeStreams.filter(s => 
                s !== audioStream && s !== decoder && !pcmStreams.includes(s)
            );
        });
        
        decoder.on('error', (err) => {
            console.error('   ❌ Decoder error:', err.message);
        });
        
        audioStream.on('error', (err) => {
            console.error('   ❌ Audio stream error:', err.message);
        });
        
    } catch (err) {
        console.error('   ❌ Failed to setup transcoding:', err.message);
    }
}

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    killActiveStreams();
    await EmitterBot.stop();
    for (const receiver of receivers) {
        await receiver.stop();
    }
    process.exit(0);
});

start();
