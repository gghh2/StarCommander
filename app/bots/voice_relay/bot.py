import asyncio
from multiprocessing import Queue
from queue import Empty

import discord
from backend.libs.logger import Logger
from core.queues import audio_queues

from ..base.bot import BaseBot
from .mixins.audio import AudioRelay
from .mixins.pcm_stream import PCMStream
from .mixins.voice import VoiceSupport

log = Logger.get_logger(__name__)


class VoiceRelayBot(BaseBot, AudioRelay, VoiceSupport):

    # --------------------------------------------------------------------------- #
    # Constants
    # --------------------------------------------------------------------------- #

    PERMISSIONS_REQUIRED = {
        "view_channel": True,
        "connect": True,
        "speak": True,
    }

    # --------------------------------------------------------------------------- #
    # Initialization
    # --------------------------------------------------------------------------- #

    def __init__(
        self,
        *,
        bot_id: str,
        audio_targets: dict = {},
        listen_users: list[int] | None = None,
        listen_roles: list[int] | None = None,
    ):
        intents = discord.Intents.default()
        intents.guilds = True
        intents.voice_states = True

        # Ensure audio queue exists for this bot
        if bot_id not in audio_queues:
            audio_queues[bot_id] = Queue()

        self.audio_queue = audio_queues[bot_id]
        """Queue to receive audio data from other bots."""
        self.audio_channel: discord.VoiceChannel | None = None
        """Voice channel where audio will be played."""
        self.listen_users = set(listen_users or [])
        """User Discord IDs to listen to."""
        self.listen_roles = set(listen_roles or [])
        """Role Discord IDs to listen to."""

        BaseBot.__init__(
            self,
            bot_id=bot_id,
            bot_type="voice_relay_bot",
            intents=intents,
        )
        AudioRelay.__init__(self, audio_targets=audio_targets)
        VoiceSupport.__init__(self)

    # --------------------------------------------------------------------------- #
    # Lifecycle Events
    # --------------------------------------------------------------------------- #

    async def on_ready(self):
        await super().on_ready()
        log.info(f"VoiceRelayBot {self.bot_id} connected as {self.user}")
        for guild in self.guilds:
            self.check_permissions(guild, self.PERMISSIONS_REQUIRED)

    async def close(self) -> None:
        if self.voice_client is not None:
            await self.disconnect_voice()

        audio_queues.pop(self.bot_id, None)
        await super().close()

    # --------------------------------------------------------------------------- #
    # Helper Methods
    # --------------------------------------------------------------------------- #

    def reset_audio_queue(self):
        """Clear the audio queue."""
        try:
            while True:
                self.audio_queue.get_nowait()
        except Empty:
            pass

    # --------------------------------------------------------------------------- #
    # Audio Playback Handling
    # --------------------------------------------------------------------------- #

    async def _audio_playback_loop(self):
        """Continuously play audio from the audio queue."""
        while True:
            if self.voice_client is None or not self.voice_client.is_connected():
                await asyncio.sleep(1)
                continue
            try:
                if not self.voice_client.is_playing():
                    self.voice_client.play(PCMStream(self.audio_queue))
                await asyncio.sleep(0.1)
            except Exception as e:
                log.error(f"Error in audio playback loop: {e}")
                await asyncio.sleep(1)

    # --------------------------------------------------------------------------- #
    # Commands Handling
    # --------------------------------------------------------------------------- #

    async def handle_command(self, cmd: dict) -> None:
        """Handle a command received from the command queue."""
        command_action = cmd.get("command")
        match command_action:
            case "shutdown":
                await self.close()
            case "select_guild":
                await self.cmd_select_guild(cmd)
            case "connect_voice":
                await self.cmd_connect_voice(cmd)
            case "disconnect_voice":
                await self.cmd_disconnect_voice(cmd)
            case "start_listening":
                await self.cmd_start_listening(cmd)
            case "add_listen_user":
                await self.cmd_add_listen_user(cmd)
            case "remove_listen_user":
                await self.cmd_remove_listen_user(cmd)
            case "add_listen_role":
                await self.cmd_add_listen_role(cmd)
            case "remove_listen_role":
                await self.cmd_remove_listen_role(cmd)
            case "add_audio_target":
                await self.cmd_add_audio_target(cmd)
            case "remove_audio_target":
                await self.cmd_remove_audio_target(cmd)
            case "clear_audio_targets":
                await self.cmd_clear_audio_targets(cmd)
            case _:
                raise ValueError(f"Unknown command action: {command_action}")

    # --------------------------------------------------------------------------- #
    # Command Implementations
    # --------------------------------------------------------------------------- #

    async def cmd_connect_voice(self, cmd: dict):
        """Connect to a voice channel specified in the command."""
        channel_id = cmd.get("channel_id")
        channel = self.get_channel(channel_id)
        if not isinstance(channel, discord.VoiceChannel):
            raise ValueError(f"Channel ID {channel_id} is not a valid voice channel.")

        await self.connect_voice(channel)
        if self.connected_voice_channel is not None:
            log.info(f"Connected to voice channel {channel.name} successfully.")
            self.emit_event(
                "voice_connected",
                {
                    "channel_id": self.connected_voice_channel.id,
                    "channel_name": self.connected_voice_channel.name,
                },
            )
            # Empty the audio queue to avoid old audio playback
            self.reset_audio_queue()
            asyncio.create_task(self._audio_playback_loop())

        else:
            raise ValueError("Failed to connect to voice channel.")

    async def cmd_disconnect_voice(self, cmd: dict):
        """Disconnect from the currently connected voice channel."""
        if self.connected_voice_channel is None:
            raise ValueError("No voice channel is currently connected.")

        await self.disconnect_voice()
        if self.connected_voice_channel is None:
            log.info("Disconnected from voice channel successfully.")
            self.emit_event("voice_disconnected", {})
        else:
            raise ValueError("Failed to disconnect from voice channel.")

    async def cmd_start_listening(self, cmd: dict):
        """Start listening to audio in the connected voice channel."""
        if self.connected_voice_channel is None:
            raise ValueError("Not connected to any voice channel.")

        def filter_fn(packet):
            if self.listen_users and packet.user_id in self.listen_users:
                return True
            if self.listen_roles:
                member = self.connected_voice_channel.guild.get_member(packet.user_id)
                if member and any(
                    role.id in self.listen_roles for role in member.roles
                ):
                    return True
            return False

        vc = self.voice_client
        if vc is not None:
            self.start_listening(vc, filter_fn=filter_fn)
            self.emit_event(
                "listening_started", {"channel_id": self.connected_voice_channel.id}
            )

    async def cmd_add_listen_user(self, cmd: dict):
        """Add a user ID to the listen list."""
        user_id = cmd.get("user_id")
        if user_id is not None:
            self.listen_users.add(user_id)
            self.emit_event("listen_user_added", {"user_id": user_id})

    async def cmd_remove_listen_user(self, cmd: dict):
        """Remove a user ID from the listen list."""
        user_id = cmd.get("user_id")
        if user_id is not None and user_id in self.listen_users:
            self.listen_users.remove(user_id)
            self.emit_event("listen_user_removed", {"user_id": user_id})

    async def cmd_add_listen_role(self, cmd: dict):
        """Add a role ID to the listen list."""
        role_id = cmd.get("role_id")
        if role_id is not None:
            self.listen_roles.add(role_id)
            self.emit_event("listen_role_added", {"role_id": role_id})

    async def cmd_remove_listen_role(self, cmd: dict):
        """Remove a role ID from the listen list."""
        role_id = cmd.get("role_id")
        if role_id is not None and role_id in self.listen_roles:
            self.listen_roles.remove(role_id)
            self.emit_event("listen_role_removed", {"role_id": role_id})

    async def cmd_add_audio_target(self, cmd: dict):
        """Add an audio target bot to forward audio to."""
        target_bot_id = cmd.get("target_bot_id")
        target_queue = audio_queues.get(target_bot_id)
        if target_bot_id and target_queue:
            self.audio_targets[target_bot_id] = target_queue
            self.emit_event("audio_target_added", {"target_bot_id": target_bot_id})
        else:
            raise ValueError(f"Target bot ID {target_bot_id} not found.")

    async def cmd_remove_audio_target(self, cmd: dict):
        """Remove an audio target bot."""
        target_bot_id = cmd.get("target_bot_id")
        if target_bot_id and target_bot_id in self.audio_targets:
            del self.audio_targets[target_bot_id]
            self.emit_event("audio_target_removed", {"target_bot_id": target_bot_id})
        else:
            raise ValueError(
                f"Target bot ID {target_bot_id} not found in audio targets."
            )

    async def cmd_clear_audio_targets(self, cmd: dict):
        """Clear all audio target bots."""
        self.audio_targets.clear()
        self.emit_event("audio_targets_cleared", {})
