/**
 * Emitter Bot - Captures audio from Commanders
 * V4.0 - Electron version, factory pattern (each call creates fresh state)
 */

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Force IPv4 — Discord media endpoints sometimes hang on v6

const { Client, GatewayIntentBits } = require('discord.js');
const {
    joinVoiceChannel,
    VoiceConnectionStatus,
    entersState,
    createAudioPlayer,
    createAudioResource,
    StreamType
} = require('@discordjs/voice');

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

function createEmitter() {
    // All state is scoped to this instance — no module-level singletons,
    // so two start/stop cycles in a row don't carry leftover state.
    let client = null;
    let currentConnection = null;
    let audioPlayer = null;
    let onSpeakingCallback = null;
    let config = null;
    let getGlobalTarget = null;
    let sourceChannel = null;
    let etatMajorRoleId = null;
    const speakingUsers = new Set();

    function getClient() { return client; }

    function checkAuthorization(member) {
        console.log(`[Emitter] Checking auth for: ${member.displayName} (${member.id})`);

        if (config.commanders?.byUser?.length > 0) {
            const userConfig = config.commanders.byUser.find(u => u.userId === member.id);
            if (userConfig) {
                console.log(`[Emitter] ✓ Authorized by user ID: ${userConfig.name}`);
                return { authorized: true, name: userConfig.name, isEtatMajor: true };
            }
        }

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

            console.log(`[Emitter] ✗ Not authorized - no matching role`);
            return { authorized: false };
        }

        console.log(`[Emitter] ⚠ No roles configured - allowing everyone (add roles in app to restrict)`);
        return {
            authorized: true,
            name: member.displayName,
            roleName: 'All (no roles configured)',
            isEtatMajor: true
        };
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
                    end: { behavior: 'afterSilence', duration: 100 }
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

        // Verbose voice debug is dangerous in production: discord.js logs the
        // Identify packet (voice session token) and Session Description (SRTP
        // secret_key). Only enable when STAR_COMMANDER_VOICE_DEBUG=1.
        const voiceDebug = process.env.STAR_COMMANDER_VOICE_DEBUG === '1';

        currentConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
            debug: voiceDebug
        });

        currentConnection.on('stateChange', (oldState, newState) => {
            const dump = (s) => {
                const out = { status: s.status };
                if (s.reason !== undefined) out.reason = s.reason;
                if (s.closeCode !== undefined) out.closeCode = s.closeCode;
                return JSON.stringify(out);
            };
            console.log(`[Emitter][voice] state: ${dump(oldState)} -> ${dump(newState)}`);
        });

        // Surface the WS close code on the rare path where Discord boots us
        // (the library swallows it in the normal close handler).
        const _origOnNetworkingClose = currentConnection.onNetworkingClose.bind(currentConnection);
        currentConnection.onNetworkingClose = (code) => {
            console.error(`[Emitter][voice] *** WS CLOSED by server with code: ${code} ***`);
            return _origOnNetworkingClose(code);
        };
        currentConnection.on('error', (err) => {
            console.error('[Emitter][voice] error:', err && err.message, err && err.stack);
        });
        if (voiceDebug) {
            currentConnection.on('debug', (msg) => {
                console.log('[Emitter][voice][debug]', msg);
            });
        }

        await entersState(currentConnection, VoiceConnectionStatus.Ready, 30_000);

        console.log(`[Emitter] Joined: ${channel.name}`);

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
                end: { behavior: 'afterSilence', duration: 100 }
            });

            if (onSpeakingCallback) {
                onSpeakingCallback(audioStream, auth);
            }
        });

        receiver.speaking.on('end', (userId) => {
            speakingUsers.delete(userId);
        });

        // Auto-reconnect with exponential backoff to avoid hammering Discord
        // and to avoid an unbounded `await joinAndListen` recursion on flap.
        let reconnectAttempt = 0;
        currentConnection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log('[Emitter] Disconnected, reconnecting...');
            try {
                await Promise.race([
                    entersState(currentConnection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(currentConnection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                if (currentConnection) {
                    try { currentConnection.destroy(); } catch (e) {}
                    currentConnection = null;
                }
                const backoffMs = Math.min(60_000, 3_000 * Math.pow(2, reconnectAttempt));
                reconnectAttempt++;
                console.log(`[Emitter] Will retry voice in ${backoffMs}ms (attempt ${reconnectAttempt})`);
                setTimeout(() => { joinAndListen(channel).catch(e => console.error('[Emitter] Reconnect failed:', e.message)); }, backoffMs);
            }
        });
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

    async function start(cfg, onSpeaking, targetGetter) {
        config = cfg;
        onSpeakingCallback = onSpeaking;
        getGlobalTarget = targetGetter;

        // Strip the webhook URL before logging — defense in depth alongside
        // the logger.js redactor.
        const safeChannels = JSON.parse(JSON.stringify(config.channels || {}));
        if (safeChannels.relay?.webhookUrl) safeChannels.relay.webhookUrl = '[REDACTED]';
        console.log('[Emitter] Config received:', JSON.stringify({
            channels: safeChannels,
            commanders: config.commanders
        }, null, 2));

        if (config.commanders?.byRole?.length > 0) {
            etatMajorRoleId = config.commanders.byRole[0].roleId;
        }

        client = createClient();

        return new Promise((resolve, reject) => {
            client.once('clientReady', async () => {
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

    async function stop() {
        if (audioPlayer) {
            audioPlayer.stop();
            audioPlayer = null;
        }

        if (currentConnection) {
            try { currentConnection.destroy(); } catch (e) {}
            currentConnection = null;
        }

        speakingUsers.clear();
        sourceChannel = null;
        onSpeakingCallback = null;
        getGlobalTarget = null;
        etatMajorRoleId = null;

        if (client) {
            client.removeAllListeners();
            try { await client.destroy(); } catch (e) {}
            client = null;
        }
    }

    function playStream(audioStream) {
        if (!currentConnection || !audioPlayer) {
            console.error('[Emitter] Not ready to play!');
            return;
        }
        try {
            const resource = createAudioResource(audioStream, { inputType: StreamType.Opus });
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
            const resource = createAudioResource(pcmStream, { inputType: StreamType.Raw, inlineVolume: false });
            audioPlayer.play(resource);
            console.log('[Emitter] Playing whisper raw audio');
        } catch (error) {
            console.error('[Emitter] Failed to play raw:', error.message);
        }
    }

    function isReady() { return !!currentConnection && !!audioPlayer; }

    function stopPlayback() {
        if (audioPlayer) {
            audioPlayer.stop();
            console.log('[Emitter] Playback stopped');
        }
    }

    function playResource(resource) {
        if (!currentConnection || !audioPlayer) {
            console.error('[Emitter] Not ready to play resource!');
            return;
        }
        try {
            audioPlayer.play(resource);
        } catch (error) {
            console.error('[Emitter] Failed to play resource:', error.message);
        }
    }

    return {
        start, stop, resubscribeSpeakingUsers, getClient,
        playStream, playRawStream, isReady, stopPlayback, playResource
    };
}

module.exports = { createEmitter };
