from fastapi import FastAPI

from .libs import FastAPISetup, Logger, Server

# * Initialize Loggers
logger = Logger()
logger.setup_loggers()

# * Initialize FastAPI app
app = FastAPI(lifespan=FastAPISetup.lifespan)

# * Setup FastAPI configurations
FastAPISetup.setup_openapi(app)
FastAPISetup.setup_middlewares(app)
FastAPISetup.setup_routes(app)


def start_server():
    """Start the server based on the configuration"""
    server = Server("backend.api:app")
    server.start()
