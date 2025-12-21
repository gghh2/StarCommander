from fastapi import FastAPI

from .libs import FastAPISetup, Logger, Server

# * Initialize Loggers
log = Logger.get_logger(__name__)

# * Initialize FastAPI app
app = FastAPI(lifespan=FastAPISetup.lifespan)

# * Setup FastAPI configurations
FastAPISetup.setup_openapi(app)
FastAPISetup.setup_middlewares(app)
FastAPISetup.setup_routes(app)


def start_server():
    """Start the backend server using Uvicorn"""
    log.info("Starting backend server...")
    server = Server("backend.api:app")
    server.start()
