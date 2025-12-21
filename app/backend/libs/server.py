from fastapi import FastAPI

from ..config import config
from .logger import Logger

log = Logger().get_logger(__name__)

# --------------------------------------------------------------------------- #


class ProductionServer:
    """Production server using Uvicorn"""

    def __init__(self, app_uri: str | FastAPI):
        log.info("Initializing ProductionServer (Uvicorn)")
        self.app_uri = app_uri

    def run(self):
        """Run the production server"""
        import uvicorn

        log.info("Starting ProductionServer")
        uvicorn.run(
            self.app_uri,
            host=config.server.host,
            port=config.server.port,
            log_level=config.logger.log_level.lower(),
            log_config=config.server.log_config,
            reload=False,
        )


# --------------------------------------------------------------------------- #


class DevelopmentServer:
    """Development server using Uvicorn"""

    def __init__(self, app_uri: str | FastAPI):
        log.info("Initializing DevelopmentServer (Uvicorn)")
        self.app_uri = app_uri

    def run(self):
        """Run the development server"""
        import uvicorn

        log.info("Starting DevelopmentServer")
        uvicorn.run(
            self.app_uri,
            host=config.server.host,
            port=config.server.port,
            log_level=config.logger.log_level.lower(),
            log_config=config.server.log_config,
            reload=config.server.reload,
        )


# --------------------------------------------------------------------------- #


class Server:
    """Server class to manage production and development servers"""

    def __init__(self, app_uri: str):
        self.app_uri = app_uri
        self.server = None

    def start(self):
        """Start the server based on the mode (production or development)"""
        if config.server.dev_mode:
            log.info("Starting server in development mode")
            self.server = DevelopmentServer(self.app_uri)
        else:
            log.info("Starting server in production mode")
            self.server = ProductionServer(self.app_uri)

        # Start the server
        self.server.run()
