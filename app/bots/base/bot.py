import asyncio
from multiprocessing import Queue

import discord
from backend.libs.logger import Logger
from core.queues import command_queues, event_queue

log = Logger.get_logger(__name__)


class BaseBot(discord.Client):

    def __init__(
        self,
        *,
        bot_id: str,
        bot_type: str = "base_bot",
        intents: discord.Intents,
    ):
        # Create command and event queues for this bot
        if bot_id not in command_queues:
            command_queues[bot_id] = Queue()

        super().__init__(intents=intents)
        self.bot_id = bot_id
        """Bot ID in the StarCommander system."""
        self.bot_type = bot_type
        """Type of the bot (e.g., 'manager_bot', 'voice_relay_bot')."""
        self.guilds_cache = []
        """Cache of guilds the bot is a member of."""
        self.selected_guild = None
        """Currently selected guild for operations."""
        self.command_queue = command_queues[bot_id]
        """Queue to receive commands for the bot."""
        self.event_queue = event_queue
        """Queue to send events from the bot."""

    # --------------------------------------------------------------------------- #
    # Lifecycle Events
    # --------------------------------------------------------------------------- #

    async def on_ready(self) -> None:
        self.guilds_cache = [{"id": g.id, "name": g.name} for g in self.guilds]
        self.emit_event(
            "ready",
            {
                "username": str(self.user),
                "user_id": self.user.id,
                "guilds": self.guilds_cache,
            },
        )
        asyncio.create_task(self._command_loop())

    async def close(self) -> None:
        log.info(
            f"Shutting down bot<{self.bot_type}> {str(self.user)} ({self.bot_id})..."
        )
        self.emit_event("shutting_down", {})
        await super().close()

    # --------------------------------------------------------------------------- #
    # Helper Methods
    # --------------------------------------------------------------------------- #

    def emit_event(self, event_type: str, payload: dict) -> None:
        """
        Emit an event to the event queue (listened by the API server).

        Args:
            event_type (str): The type of event being emitted.
            payload (dict): The data associated with the event.
        """
        self.event_queue.put(
            {
                "source": "bot",
                "bot_id": self.bot_id,
                "type": event_type,
                "payload": payload,
            }
        )

    # --------------------------------------------------------------------------- #
    # Commands Handling
    # --------------------------------------------------------------------------- #

    async def _command_loop(self) -> None:
        while True:
            cmd = await asyncio.to_thread(self.command_queue.get)
            try:
                await self.handle_command(cmd)
            except Exception as e:
                log.error(f"Error handling command {cmd}: {e}")
                self.emit_event("error", {"error": str(e)})

    async def handle_command(self, cmd: dict) -> None:
        """Override this method to handle commands sent to the bot."""
        log.warning(f"Unhandled command received: {cmd}")
        raise NotImplementedError("handle_command method not implemented in BaseBot.")

    async def cmd_select_guild(self, cmd: dict) -> None:
        """Handle the 'select_guild' command to select a guild for operations.

        Args:
            cmd (dict): The command dictionary containing `guild_id`.
        """
        guild_id = cmd.get("guild_id")
        guild = self.get_guild(guild_id)
        if guild:
            self.selected_guild = guild
            self.emit_event(
                "guild_selected",
                {"guild_id": guild.id, "guild_name": guild.name},
            )
        else:
            raise ValueError(f"Guild ID {guild_id} not found or bot is not a member.")

    # --------------------------------------------------------------------------- #
    # Permission Checking
    # --------------------------------------------------------------------------- #

    def check_permissions(
        self, guild: discord.Guild, permissions: dict[str, bool]
    ) -> bool:
        """Check if the bot has the specified permissions in a guild.

        Args:
            guild (discord.Guild): The guild to check permissions in.
            permissions (dict[str, bool]): The permissions to check.

        Returns:
            bool: True if the bot has the specified permissions, False otherwise.
        """
        me = guild.me
        if me is None:
            log.warning(f"Bot ({self.user}) is not a member of guild {guild.id}")
            return False

        permissions_state = {}
        has_all_permission = True
        for perm, required in permissions.items():
            current = getattr(me.guild_permissions, perm, False)
            permissions_state[perm] = current if required else True
            log.debug(
                f"Permission check in guild {guild.name} ({guild.id}) - {perm}: required={required}, current={current}"
            )
            if required and not current:
                has_all_permission = False

        if has_all_permission:
            log.info(
                f"Bot ({self.user}) has all required permissions in guild {guild.name} ({guild.id})"
            )
        else:
            log.warning(
                f"Bot ({self.user}) lacks some required permissions in guild {guild.name} ({guild.id})"
            )

        self.emit_event(
            "permissions_check",
            {
                "guild_id": guild.id,
                "enough_permissions": has_all_permission,
                "permissions_checked": permissions_state,
            },
        )
        return has_all_permission
