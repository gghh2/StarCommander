from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, func
from sqlmodel import Field, Session, SQLModel, select

from ..libs.logger import Logger

log = Logger.get_logger(__name__)


class BotType(str, Enum):
    MANAGER = "manager"
    VOICE_RELAY = "voice_relay"


class BotCreate(SQLModel):
    """
    Bot creation schema used for input validation

    Attributes:
        type (BotType): Type of the bot
        name (Optional[str]): Name of the bot
        description (Optional[str]): Description of the bot
        token (str): Bot token
    """

    type: BotType
    name: Optional[str] = None
    description: Optional[str] = None
    token: str


class BotUpdate(SQLModel):
    """
    Bot update schema used for input validation

    Attributes:
        name (Optional[str]): Name of the bot
        description (Optional[str]): Description of the bot
        is_active (Optional[bool]): Activation status of the bot
        token (Optional[str]): Bot token
    """

    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    token: Optional[str] = None


class Bot(SQLModel, table=True):

    # * Metadata
    __tablename__ = "bots"

    # * Attributes
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True, index=True)
    type: str = Field(index=True)
    name: Optional[str] = Field(default=None, nullable=True)
    description: Optional[str] = Field(default=None, nullable=True)
    token_hash: str = Field(unique=True)
    token_encrypted: str = Field()
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(
        sa_column=Column(server_default=func.now(), nullable=False)
    )
    updated_at: datetime = Field(
        sa_column=Column(server_default=func.now(), onupdate=func.now(), nullable=False)
    )

    def __repr__(self) -> str:
        return f"<Bot id={self.id} type={self.type} name={self.name} is_active={self.is_active}>"

    def __str__(self) -> str:
        return f"Bot(id={self.id}, type={self.type}, name={self.name}, is_active={self.is_active})"

    # * Class methods

    @classmethod
    def get_bots_by_type(cls, session: Session, bot_type: BotType) -> list["Bot"]:
        """Get all bots of a specific type

        Args:
            session (Session): Database session
            bot_type (BotType): Type of the bot

        Returns:
            list[Bot]: A list of bot instances
        """
        statement = select(cls).filter(cls.type == bot_type.value)
        return session.exec(statement).all()

    @classmethod
    def hash_token(cls, token: str) -> str:
        """Hash the bot token using SHA-256

        Args:
            token (str): The bot token to hash

        Returns:
            str: The hashed token
        """
        import hashlib

        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @classmethod
    def is_token_hash_exists(cls, session: Session, token_hash: str) -> bool:
        """Check if a bot with the given token hash exists

        Args:
            session (Session): Database session
            token_hash (str): Token hash to check

        Returns:
            bool: True if the token hash exists, False otherwise
        """

        statement = select(cls).filter(cls.token_hash == token_hash)
        result = session.exec(statement).first()
        return result is not None

    @classmethod
    def register_new(cls, session: Session, bot_create: BotCreate) -> "Bot" | None:
        """Register a new bot in the database if the token hash does not already exist

        Args:
            session (Session): Database session
            bot_create (BotCreate): Bot creation data

        Returns:
            (Bot | None): The created Bot instance or None if token hash exists
        """
        from shared.crypto import encrypt_token

        token_hash = cls.hash_token(bot_create.token)
        if cls.is_token_hash_exists(session, token_hash):
            return None

        new_bot = cls(
            type=bot_create.type.value,
            name=bot_create.name,
            description=bot_create.description,
            token_hash=token_hash,
            token_encrypted=encrypt_token(bot_create.token),
        )
        session.add(new_bot)
        session.commit()
        session.refresh(new_bot)
        return new_bot
