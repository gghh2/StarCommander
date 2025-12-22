import discord
from backend.libs.logger import Logger
from bots.base.bot import BaseBot

log = Logger.get_logger(__name__)


class ManagerBot(BaseBot):

    # --------------------------------------------------------------------------- #
    # Constants
    # --------------------------------------------------------------------------- #

    PERMISSIONS_REQUIRED = {
        "manage_channels": True,
        "manage_roles": True,
        "move_members": True,
        "read_message_history": True,
        "connect": True,
        "speak": True,
    }

    # --------------------------------------------------------------------------- #
    # Initialization
    # --------------------------------------------------------------------------- #

    def __init__(self, *, bot_id: str):
        intents = discord.Intents.default()
        intents.guilds = True
        intents.voice_states = True

        super().__init__(
            bot_id=bot_id,
            bot_type="manager_bot",
            intents=intents,
        )

    # --------------------------------------------------------------------------- #
    # Lifecycle Events
    # --------------------------------------------------------------------------- #

    async def on_ready(self):
        await super().on_ready()
        log.info(f"ManagerBot {self.bot_id} connected as {self.user}")
        for guild in self.guilds:
            self.check_permissions(guild, self.PERMISSIONS_REQUIRED)

    async def close(self) -> None:
        await super().close()

    # --------------------------------------------------------------------------- #
    # Helper Methods
    # --------------------------------------------------------------------------- #

    # ? No additional methods for now

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
            case "create_category":
                await self.cmd_create_category(cmd)
            case "delete_category":
                await self.cmd_delete_category(cmd)
            case "create_role":
                await self.cmd_create_role(cmd)
            case "delete_role":
                await self.cmd_delete_role(cmd)
            case "create_voice_channel":
                await self.cmd_create_voice_channel(cmd)
            case "delete_voice_channel":
                await self.cmd_delete_voice_channel(cmd)
            case "create_text_channel":
                await self.cmd_create_text_channel(cmd)
            case "delete_text_channel":
                await self.cmd_delete_text_channel(cmd)
            case "move_member_to_voice_channel":
                await self.cmd_move_member_to_voice_channel(cmd)
            case _:
                raise ValueError(f"Unknown command action: {command_action}")

    # --------------------------------------------------------------------------- #
    # Command Implementations
    # --------------------------------------------------------------------------- #

    async def cmd_create_category(self, cmd: dict) -> None:
        """Create a category in the selected guild."""
        category_name = cmd.get("category_name")
        position = cmd.get("position", discord.MISSING)
        overwrites = cmd.get("overwrites", discord.MISSING)

        if self.selected_guild is None:
            raise ValueError(
                f"No guild selected for creating category '{category_name}'."
            )

        existing_category = discord.utils.get(
            self.selected_guild.categories, name=category_name
        )
        if existing_category:
            log.info(
                f"Category '{category_name}' already exists in guild '{self.selected_guild.name}'."
            )
            self.emit_event("category_exists", {"category_name": category_name})
            return

        category = await self.selected_guild.create_category(
            name=category_name, position=position, overwrites=overwrites
        )
        log.info(
            f"Category '{category_name}' created in guild '{self.selected_guild.name}'."
        )
        self.emit_event(
            "category_created",
            {"category_name": category.name, "category_id": category.id},
        )

    async def cmd_delete_category(self, cmd: dict) -> None:
        """Delete a category in the selected guild."""
        category_id = cmd.get("category_id")

        if self.selected_guild is None:
            raise ValueError(
                f"No guild selected for deleting category '{category_id}'."
            )

        category = discord.utils.get(self.selected_guild.categories, id=category_id)
        if not category:
            raise ValueError(
                f"Category '{category_id}' does not exist in guild '{self.selected_guild.name}'."
            )

        await category.delete()
        log.info(
            f"Category '{category_id}' deleted from guild '{self.selected_guild.name}'."
        )
        self.emit_event("category_deleted", {"category_id": category_id})

    async def cmd_create_role(self, cmd: dict) -> None:
        """Create a role in the selected guild."""
        role_name = cmd.get("role_name")
        permissions = cmd.get("permissions", discord.Permissions.none())

        if self.selected_guild is None:
            raise ValueError(f"No guild selected for creating role '{role_name}'.")

        existing_role = discord.utils.get(self.selected_guild.roles, name=role_name)
        if existing_role:
            log.info(
                f"Role '{role_name}' already exists in guild '{self.selected_guild.name}'."
            )
            self.emit_event("role_exists", {"role_name": role_name})
            return

        role = await self.selected_guild.create_role(
            name=role_name, permissions=permissions
        )
        log.info(f"Role '{role_name}' created in guild '{self.selected_guild.name}'.")
        self.emit_event("role_created", {"role_name": role.name, "role_id": role.id})

    async def cmd_delete_role(self, cmd: dict) -> None:
        """Delete a role in the selected guild."""
        role_id = cmd.get("role_id")

        if self.selected_guild is None:
            raise ValueError(f"No guild selected for deleting role '{role_id}'.")

        role = discord.utils.get(self.selected_guild.roles, id=role_id)
        if not role:
            raise ValueError(
                f"Role '{role_id}' does not exist in guild '{self.selected_guild.name}'."
            )

        await role.delete()
        log.info(f"Role '{role_id}' deleted from guild '{self.selected_guild.name}'.")
        self.emit_event("role_deleted", {"role_id": role_id})

    async def cmd_create_voice_channel(self, cmd: dict) -> None:
        """Create a voice channel in the selected guild."""
        channel_name = cmd.get("channel_name")
        category_name = cmd.get("category_name")
        position = cmd.get("position", discord.MISSING)
        overwrites = cmd.get("overwrites", discord.MISSING)

        if self.selected_guild is None:
            raise ValueError(
                f"No guild selected for creating voice channel '{channel_name}'."
            )

        existing_channel = discord.utils.get(
            self.selected_guild.voice_channels, name=channel_name
        )
        if existing_channel:
            log.info(
                f"Voice channel '{channel_name}' already exists in guild '{self.selected_guild.name}'."
            )
            self.emit_event("voice_channel_exists", {"channel_name": channel_name})
            return

        category = None
        if category_name:
            category = discord.utils.get(
                self.selected_guild.categories, name=category_name, position=position
            )
            if not category:
                raise ValueError(
                    f"Category '{category_name}' does not exist in guild '{self.selected_guild.name}'."
                )

        channel = await self.selected_guild.create_voice_channel(
            name=channel_name,
            category=category,
            position=position,
            overwrites=overwrites,
        )
        log.info(
            f"Voice channel '{channel.name}' created in guild '{self.selected_guild.name}'."
        )
        self.emit_event(
            "voice_channel_created",
            {"channel_name": channel.name, "channel_id": channel.id},
        )

    async def cmd_delete_voice_channel(self, cmd: dict) -> None:
        """Delete a voice channel in the selected guild."""
        channel_id = cmd.get("channel_id")

        if self.selected_guild is None:
            raise ValueError(
                f"No guild selected for deleting voice channel '{channel_id}'."
            )

        channel = discord.utils.get(self.selected_guild.voice_channels, id=channel_id)
        if not channel:
            raise ValueError(
                f"Voice channel '{channel_id}' does not exist in guild '{self.selected_guild.name}'."
            )

        await channel.delete()
        log.info(
            f"Voice channel '{channel_id}' deleted from guild '{self.selected_guild.name}'."
        )
        self.emit_event("voice_channel_deleted", {"channel_id": channel_id})

    async def cmd_create_text_channel(self, cmd: dict) -> None:
        """Create a text channel in the selected guild."""
        channel_name = cmd.get("channel_name")
        category_name = cmd.get("category_name")
        position = cmd.get("position", discord.MISSING)
        overwrites = cmd.get("overwrites", discord.MISSING)

        if self.selected_guild is None:
            raise ValueError(
                f"No guild selected for creating text channel '{channel_name}'."
            )

        existing_channel = discord.utils.get(
            self.selected_guild.text_channels, name=channel_name
        )
        if existing_channel:
            log.info(
                f"Text channel '{channel_name}' already exists in guild '{self.selected_guild.name}'."
            )
            self.emit_event("text_channel_exists", {"channel_name": channel_name})
            return

        category = None
        if category_name:
            category = discord.utils.get(
                self.selected_guild.categories, name=category_name, position=position
            )
            if not category:
                raise ValueError(
                    f"Category '{category_name}' does not exist in guild '{self.selected_guild.name}'."
                )

        channel = await self.selected_guild.create_text_channel(
            name=channel_name,
            category=category,
            position=position,
            overwrites=overwrites,
        )
        log.info(
            f"Text channel '{channel.name}' created in guild '{self.selected_guild.name}'."
        )
        self.emit_event(
            "text_channel_created",
            {"channel_name": channel.name, "channel_id": channel.id},
        )

    async def cmd_delete_text_channel(self, cmd: dict) -> None:
        """Delete a text channel in the selected guild."""
        channel_id = cmd.get("channel_id")

        if self.selected_guild is None:
            raise ValueError(
                f"No guild selected for deleting text channel '{channel_id}'."
            )

        channel = discord.utils.get(self.selected_guild.text_channels, id=channel_id)
        if not channel:
            raise ValueError(
                f"Text channel '{channel_id}' does not exist in guild '{self.selected_guild.name}'."
            )

        await channel.delete()
        log.info(
            f"Text channel '{channel_id}' deleted from guild '{self.selected_guild.name}'."
        )
        self.emit_event("text_channel_deleted", {"channel_id": channel_id})

    async def cmd_move_member_to_voice_channel(self, cmd: dict) -> None:
        """Move a member to a voice channel in the selected guild."""
        member_id = cmd.get("member_id")
        channel_id = cmd.get("channel_id")

        if self.selected_guild is None:
            raise ValueError(
                f"No guild selected for moving member '{member_id}' to voice channel '{channel_id}'."
            )

        member = self.selected_guild.get_member(member_id)
        if not member:
            raise ValueError(
                f"Member '{member_id}' does not exist in guild '{self.selected_guild.name}'."
            )

        channel = discord.utils.get(self.selected_guild.voice_channels, id=channel_id)
        if not channel:
            raise ValueError(
                f"Voice channel '{channel_id}' does not exist in guild '{self.selected_guild.name}'."
            )

        await member.move_to(channel)
        log.info(
            f"Member '{member.name}' moved to voice channel '{channel.name}' in guild '{self.selected_guild.name}'."
        )
        self.emit_event(
            "member_moved",
            {"member_id": member.id, "channel_id": channel.id},
        )
