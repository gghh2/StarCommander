from os import getenv

from pydantic_settings import BaseSettings, SettingsConfigDict

from config.backend_config import backend_config


def log_handlers(type: str) -> list[str]:
    """Determine log handlers based on configuration"""
    handlers = []
    if type == "default":
        if getenv("LOGGER_LOG_TO_CONSOLE", True):
            handlers.append("default")
        if getenv("LOGGER_LOG_TO_FILE", True):
            handlers.append("log_file")
    elif type == "access":
        if getenv("LOGGER_LOG_TO_CONSOLE", True):
            handlers.append("access")
        if getenv("LOGGER_LOG_TO_FILE", True):
            handlers.append("log_file")
    return handlers


class ServerConfig(BaseSettings):
    """Server configuration settings"""

    model_config = SettingsConfigDict(case_sensitive=False, env_prefix="SERVER_")

    dev_mode: bool = backend_config.server_dev_mode
    """Whether the server is running in development mode"""
    reload: bool = backend_config.server_reload
    """Enable auto-reload of the server on code changes (only in development mode)"""
    host: str = "127.0.0.1"
    """The host IP address used to authorize requests"""
    port: int = 8765  # Not a common port to avoid conflicts
    """The port number used to access the server"""
    log_config: dict = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "uvicorn.logging.DefaultFormatter",
                "format": "%(asctime)s - [%(levelname)s] [%(threadName)s] %(name)s::%(funcName)s %(message)s (%(filename)s:%(lineno)d)",
                "datefmt": "%Y-%m-%d %H:%M:%S",
                "use_colors": True,
            },
            "default_blank": {
                "()": "uvicorn.logging.DefaultFormatter",
                "format": "%(asctime)s - [%(levelname)s] [%(threadName)s] %(name)s::%(funcName)s %(message)s (%(filename)s:%(lineno)d)",
                "datefmt": "%Y-%m-%d %H:%M:%S",
                "use_colors": False,
            },
            "access": {
                "()": "uvicorn.logging.AccessFormatter",
                "format": "%(asctime)s - [%(levelname)s] [%(threadName)s] %(name)s::%(funcName)s %(message)s (%(filename)s:%(lineno)d)",
                "datefmt": "%Y-%m-%d %H:%M:%S",
                "use_colors": True,
            },
        },
        "filters": {
            "healthcheck_filter": {"()": "backend.libs.logger.HealthCheckFilter"},
            "favicon_filter": {"()": "backend.libs.logger.FaviconFilter"},
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stderr",
            },
            "log_file": {
                "formatter": "default_blank",
                "class": "logging.handlers.TimedRotatingFileHandler",
                "filename": "logs/backend.log",
                "when": "midnight",  # Rotate at midnight
                "interval": 1,  # Every 1 day
                "backupCount": 7,  # Keep 7 days of logs
                "encoding": "utf-8",
            },
            "access": {
                "formatter": "access",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "filters": ["healthcheck_filter", "favicon_filter"],
            },
        },
        "loggers": {
            "uvicorn": {
                "handlers": log_handlers("default"),
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.error": {
                "handlers": log_handlers("default"),
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": log_handlers("access"),
                "level": "INFO",
                "propagate": False,
            },
        },
        "root": {
            "handlers": log_handlers("default"),
            "level": "DEBUG",
            "propagate": False,
        },
    }
    """Logging configuration dictionary for the server"""
