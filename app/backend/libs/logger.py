from __future__ import annotations

import logging
from enum import Enum
from logging import handlers

from ..config import config

# --------------------------------------------------------------------------- #


class LogLevel(int, Enum):
    NOTSET = logging.NOTSET
    DEBUG = logging.DEBUG
    INFO = logging.INFO
    WARNING = logging.WARNING
    ERROR = logging.ERROR
    CRITICAL = logging.CRITICAL


# --------------------------------------------------------------------------- #


class ConsoleFormatter(logging.Formatter):
    # grey = "\x1b[38;2;190;190;190m" # ? RGB not supported by Grafana
    # green = "\x1b[38;2;55;220;37m" # ? RGB not supported by Grafana
    # bold_green = "\x1b[38;2;55;220;37;1m" # ? RGB not supported by Grafana
    green = "\x1b[32m"
    bold_green = "\x1b[32;1m"
    # yellow = "\x1b[38;2;240;255;0m" # ? RGB not supported by Grafana
    # bold_yellow = "\x1b[38;2;240;255;0;1m" # ? RGB not supported by Grafana
    yellow = "\x1b[33m"
    bold_yellow = "\x1b[33;1m"
    # red = "\x1b[38;2;255;0;0m" # ? RGB not supported by Grafana
    # bold_red = "\x1b[38;2;255;0;0;1m" # ? RGB not supported by Grafana
    red = "\x1b[31m"
    bold_red = "\x1b[31;1m"
    bg_red = "\x1b[41m"
    reset = "\x1b[0m"
    format_pattern = "%(asctime)s - [%(levelname)s] [%(threadName)s] %(name)s::%(funcName)s %(message)s (%(filename)s:%(lineno)d)"

    FORMATS = {
        logging.DEBUG: reset + format_pattern + reset,
        logging.INFO: bold_green + format_pattern + reset,
        logging.WARNING: yellow + format_pattern + reset,
        logging.ERROR: bold_red + format_pattern + reset,
        logging.CRITICAL: bg_red + format_pattern + reset,
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(fmt=log_fmt, datefmt=Logger._datefmt)
        return formatter.format(record)


# --------------------------------------------------------------------------- #


class FileFormatter(logging.Formatter):
    format_pattern = "%(asctime)s - [%(levelname)s] [%(threadName)s] %(name)s::%(funcName)s %(message)s (%(filename)s:%(lineno)d)"

    def format(self, record):
        formatter = logging.Formatter(fmt=self.format_pattern, datefmt=Logger._datefmt)
        return formatter.format(record)


# --------------------------------------------------------------------------- #


class Logger:
    """Logger instance generator"""

    # * List of loggers
    __loggers = {}

    # * Class parameters
    _default_name = "unknown_logger"
    _default_level = getattr(LogLevel, config.logger.log_level, LogLevel.INFO)
    _datefmt = "%Y-%m-%d %H:%M:%S"

    @classmethod
    def get_logger(
        cls,
        name: str | None = None,
        level: int | None = None,
    ) -> logging.Logger:
        """Get a logger instance or create it if it doesn't exist

        Parameters:
            name (str): Logger name
            level (int): Logger level

        Returns:
            Logger: Logger instance
        """
        # * Set default values
        if name is None:
            name = cls._default_name
        if level is None:
            level = cls._default_level

        # * Check if logger already exists
        if name in cls.__loggers:
            return cls.__loggers[name]

        # * Create logger
        logger = logging.getLogger(name)
        logger.setLevel(level)

        # * Create handler
        handler = logging.StreamHandler()
        handler.setLevel(level)
        handler.setFormatter(ConsoleFormatter())

        if config.logger.log_to_file:
            import os

            log_file_path = config.logger.log_file
            log_dir = os.path.dirname(log_file_path)
            if log_dir and not os.path.exists(log_dir):
                os.makedirs(log_dir, exist_ok=True)
            file_handler = handlers.TimedRotatingFileHandler(
                filename=log_file_path,
                when="midnight",  # Rotate at midnight
                interval=1,  # Every 1 day
                backupCount=14,  # Keep 14 days of logs
                encoding="utf-8",
            )
            file_handler.setLevel(level)
            file_handler.setFormatter(FileFormatter())
            logger.addHandler(file_handler)

        # * Add handler to logger
        logger.addHandler(handler)

        # * Add logger to list
        cls.__loggers[name] = logger
        logger.propagate = False

        return logger

    @classmethod
    def setup_loggers(cls):
        """Setup existing loggers based on the configuration"""

        for logger_to_setup in config.logger.loggers_to_setup:
            # ? Set logger level and disable propagation
            log_level = getattr(logging, logger_to_setup["level"], logging.INFO)
            logger = logging.getLogger(logger_to_setup["name"])
            logger.setLevel(log_level)
            logger.propagate = False

            # ? Add handler to logger
            handler = logging.StreamHandler()
            handler.setLevel(log_level)
            handler.setFormatter(ConsoleFormatter())

            logger.handlers.clear()
            logger.addHandler(handler)

            if config.logger.log_to_file:
                file_handler = handlers.TimedRotatingFileHandler(
                    filename=config.logger.log_file,
                    when="midnight",  # Rotate at midnight
                    interval=1,  # Every 1 day
                    backupCount=14,  # Keep 14 days of logs
                    encoding="utf-8",
                )
                file_handler.setLevel(log_level)
                file_handler.setFormatter(FileFormatter())
                logger.addHandler(file_handler)

            # ? Add filters to logger
            for filter_name in logger_to_setup.get("filters", []):
                if filter_name == "healthcheck_filter":
                    logger.addFilter(HealthCheckFilter())
                    if config.logger.log_to_file:
                        # * Add filter to file handler as well
                        file_handler.addFilter(HealthCheckFilter())
                elif filter_name == "favicon_filter":
                    logger.addFilter(FaviconFilter())
                    if config.logger.log_to_file:
                        # * Add filter to file handler as well
                        file_handler.addFilter(FaviconFilter())


# --------------------------------------------------------------------------- #
# The following classes are used by uvicorn to filter logs
# --------------------------------------------------------------------------- #


class HealthCheckFilter(logging.Filter):
    def filter(self, record):
        return not record.getMessage().__contains__("/healthcheck")


# --------------------------------------------------------------------------- #


class FaviconFilter(logging.Filter):
    def filter(self, record):
        return not record.getMessage().__contains__("/favicon.ico")
