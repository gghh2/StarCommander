import discord
from backend.libs.logger import Logger

log = Logger.get_logger(__name__)


class VoiceSupport:
    def __init__(self):
        self.connected_voice_channel: discord.VoiceChannel | None = None
        """Currently connected voice channel."""
        self.voice_client: discord.VoiceClient | None = None
        """Discord voice client instance."""

    async def connect_voice(self, channel: discord.VoiceChannel):
        try:
            if (
                self.connected_voice_channel is not None
                and self.connected_voice_channel.id == channel.id
            ):
                return self.voice_client  # Already connected to this channel

            vc = await channel.connect()
            self.connected_voice_channel = channel
            self.voice_client = vc
            return vc

        except Exception as e:
            log.exception(
                "Failed to connect to voice channel %s: %s",
                getattr(channel, "id", None),
                e,
            )
            return None

    async def disconnect_voice(self):
        try:
            vc = self.voice_client
            if vc:
                vc.stop()
                await vc.disconnect()
                self.connected_voice_channel = None
                self.voice_client = None

        except Exception as e:
            log.error(f"Failed to disconnect from voice channel: {e}")
