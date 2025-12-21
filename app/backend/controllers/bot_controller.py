from sqlmodel import select

from ..libs.logger import Logger
from ..models.bot import Bot, BotCreate, BotUpdate
from .common import Controller
from uuid import UUID

log = Logger.get_logger(__name__)


class BotController(Controller):

    def create_bot(self, bot_data: BotCreate) -> Bot:
        """Create a new bot in the database

        Args:
            bot_data (BotCreate): The data for the new bot

        Returns:
            Bot: The created Bot instance
        """

        new_bot = Bot.register_new(self.session, bot_data)
        if new_bot:
            log.info(f"New bot created: {new_bot}")
        else:
            log.error("Failed to create bot: Token hash already exists")
        return new_bot

    def get_bot_by_id(self, bot_id: UUID) -> Bot | None:
        """Retrieve a bot by its ID

        Args:
            bot_id (UUID): The ID of the bot to retrieve

        Returns:
            Bot | None: The Bot instance if found, else None
        """

        bot = self.session.get(Bot, bot_id)
        if bot:
            log.info(f"Bot found: {bot}")
        else:
            log.warning(f"No bot found with ID: {bot_id}")
        return bot

    def list_bots(self) -> list[Bot]:
        """List all bots in the database

        Returns:
            list[Bot]: A list of all Bot instances
        """

        statement = select(Bot)
        bots = self.session.exec(statement).all()
        log.info(f"Retrieved {len(bots)} bots from the database")
        return bots

    def update_bot(self, bot_id: UUID, bot_update: BotUpdate) -> Bot | tuple[int, str]:
        """Update an existing bot's information

        Args:
            bot_id (UUID): The ID of the bot to update
            bot_update (BotUpdate): The updated data for the bot

        Returns:
            Bot | tuple[int,str]: The updated Bot instance if found, else a tuple with error code and message
        """
        from shared.crypto import encrypt_token

        bot = self.get_bot_by_id(bot_id)
        if not bot:
            log.error(f"Cannot update bot: No bot found with ID {bot_id}")
            return (404, f"No bot found with ID {bot_id}")

        if bot_update.token:
            bot.token_encrypted = encrypt_token(bot_update.token)
            bot.token_hash = Bot.hash_token(bot_update.token)

            # ? Check if the new token hash already exists for another bot
            if Bot.is_token_hash_exists(self.session, bot.token_hash):
                log.error("Failed to update bot: Token hash already exists")
                return (409, "Token hash already exists")

            del bot_update.token  # Remove token to avoid direct assignment

        for key, value in bot_update.model_dump(exclude_unset=True).items():
            setattr(bot, key, value)

        updated_bot = self.sar(bot)
        log.info(f"Bot updated: {updated_bot}")
        return updated_bot

    def switch_bot_status(self, bot_id: UUID) -> Bot | None:
        """Activate or deactivate a bot

        Args:
            bot_id (UUID): The ID of the bot to update
        Returns:
            Bot | None: The updated Bot instance if found, else None
        """

        bot = self.get_bot_by_id(bot_id)
        if not bot:
            log.error(f"Cannot switch bot status: No bot found with ID {bot_id}")
            return None

        bot.is_active = not bot.is_active
        updated_bot = self.sar(bot)
        status = "activated" if bot.is_active else "deactivated"
        log.info(f"Bot ({bot.id}) {status}: {updated_bot}")
        return updated_bot

    def delete_bot(self, bot_id: UUID) -> bool:
        """Delete a bot from the database

        Args:
            bot_id (UUID): The ID of the bot to delete
        Returns:
            bool: True if deletion was successful, False otherwise
        """

        bot = self.get_bot_by_id(bot_id)
        if not bot:
            log.error(f"Cannot delete bot: No bot found with ID {bot_id}")
            return False

        self.session.delete(bot)
        self.session.commit()
        log.info(f"Bot deleted: {bot}")
        return True
