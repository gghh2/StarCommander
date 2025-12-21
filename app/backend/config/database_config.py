from pydantic_settings import BaseSettings, SettingsConfigDict
from shared.paths import get_app_data_dir


class DatabaseConfig(BaseSettings):
    """Database configuration settings"""

    model_config = SettingsConfigDict(case_sensitive=False, env_prefix="DATABASE_")

    url: str | None = f"sqlite:///{get_app_data_dir()}/database.db"
    """Database connection URL"""
