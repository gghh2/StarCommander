from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI

from ..config import config
from .logger import Logger

log = Logger.get_logger(__name__)


class FastAPISetup:
    @classmethod
    def setup_openapi(cls, app: FastAPI) -> None:
        """Setup OpenAPI configuration for the FastAPI app

        Args:
            app (FastAPI): The FastAPI application instance

        Returns:
            None
        """
        log.info("Setting up OpenAPI configuration")

        def _custom_openapi():
            """Generate or return custom OpenAPI schema based on configuration"""
            from fastapi.openapi.utils import get_openapi

            if not app.openapi_schema:
                openapi_schema = get_openapi(
                    title=config.openapi.title,
                    version=config.openapi.version,
                    description=config.openapi.description,
                    routes=app.routes,
                )
                app.openapi_schema = openapi_schema
            return app.openapi_schema

        # Set OpenAPI metadata from configuration
        app.openapi = _custom_openapi

    @classmethod
    def setup_middlewares(cls, app: FastAPI) -> None:
        """Setup middlewares for the FastAPI app

        Args:
            app (FastAPI): The FastAPI application instance

        Returns:
            None
        """
        from starlette.middleware.base import BaseHTTPMiddleware

        from ..middlewares.add_process_time import AddProcessTimeMiddleware
        from ..middlewares.catch_unhandled_error import CatchUnhandledErrorMiddleware

        log.info("Setting up middlewares")

        app.add_middleware(BaseHTTPMiddleware, dispatch=AddProcessTimeMiddleware())
        app.add_middleware(BaseHTTPMiddleware, dispatch=CatchUnhandledErrorMiddleware())

    @classmethod
    def setup_routes(cls, app: FastAPI) -> None:
        """Setup API routes for the FastAPI app

        Args:
            app (FastAPI): The FastAPI application instance

        Returns:
            None
        """
        from ..routers.bot_routes import bot_crud_router, bot_operations_router
        from ..routers.root import core_router, root_router

        log.info("Setting up API routes")

        api_v1_router = APIRouter(prefix="/api/v1")
        api_v1_router.include_router(core_router)
        api_v1_router.include_router(bot_crud_router)
        api_v1_router.include_router(bot_operations_router)

        app.include_router(root_router)
        app.include_router(api_v1_router)

    @classmethod
    @asynccontextmanager
    async def lifespan(cls, app: FastAPI):
        try:
            # Startup logic (if any)
            log.info("FastAPI application startup.")
            yield
        except Exception as e:
            log.error(f"Exception during lifespan: {e}")
            raise
        finally:
            # Shutdown intercept logic
            log.info("FastAPI application shutdown.")
            # Place any cleanup or shutdown code here
