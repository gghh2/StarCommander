from pydantic_settings import BaseSettings, SettingsConfigDict
from .database_config import DatabaseConfig
from .logger_config import LoggerConfig
from .openapi_config import OpenAPIConfig
from .server_config import ServerConfig


class GlobalConfig(BaseSettings):
    """Global configuration settings"""

    model_config = SettingsConfigDict(case_sensitive=False)

    logger: LoggerConfig = LoggerConfig()
    """Logger configuration settings"""
    openapi: OpenAPIConfig = OpenAPIConfig()
    """OpenAPI configuration settings"""
    database: DatabaseConfig = DatabaseConfig()
    """Database configuration settings"""
    server: ServerConfig = ServerConfig()
    """Server configuration settings"""


# --------------------------------------------------------------------------- #

config = GlobalConfig()
"""Global configuration instance

This instance is used to access the global configuration settings.

Example:
>>> from app.config import config
>>> print(config.logger.log_level)
INFO
"""
