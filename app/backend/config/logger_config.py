from pydantic_settings import BaseSettings, SettingsConfigDict

from config.backend_config import backend_config


class LoggerConfig(BaseSettings):
    """Logger configuration settings"""

    model_config = SettingsConfigDict(case_sensitive=False, env_prefix="LOGGER_")

    log_level: str = backend_config.server_log_level
    """Logger level"""
    log_to_file: bool = True
    """Enable logging to file"""
    log_to_console: bool = False
    """Enable logging to console"""
    log_file: str = "logs/backend.log"
    """Logger file path (relative to `resources/` directory)"""
    loggers_to_setup: list[dict[str, str | list[str]]] = [
        {"name": "asyncio", "level": "INFO", "filters": []},
        {"name": "uvicorn", "level": "INFO", "filters": []},
        {"name": "uvicorn.error", "level": "INFO", "filters": []},
        {
            "name": "uvicorn.access",
            "level": "INFO",
            "filters": ["healthcheck_filter", "favicon_filter"],
        },
    ]
    """List of loggers to setup with their levels and filters"""
