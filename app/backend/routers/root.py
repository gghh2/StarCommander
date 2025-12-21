from fastapi import APIRouter

from ..libs import Logger

log = Logger.get_logger(__name__)

# --------------------------------------------------------------------------- #
# Routers
# --------------------------------------------------------------------------- #

root_router = APIRouter()
"""Root API Router"""

core_router = APIRouter(
    prefix="/core",
    tags=["Core"],
)
"""Core API Router for system endpoints"""

# --------------------------------------------------------------------------- #
# Root Endpoints
# --------------------------------------------------------------------------- #


@root_router.get(
    "/",
    summary="API Root",
    description="Root endpoint of the API.",
    response_description="API status message",
    response_model=dict,
    responses={
        200: {
            "description": "API is running.",
            "content": {
                "application/json": {
                    "example": {"message": "API is running", "status": "OK"}
                }
            },
        }
    },
    include_in_schema=False,
)
def api_root():
    """Root endpoint of the API."""
    log.debug("API Root endpoint called.")
    return {"message": "API is running", "status": "OK"}


# --------------------------------------------------------------------------- #
# Core Endpoints
# --------------------------------------------------------------------------- #


@core_router.get(
    "/healthcheck",
    summary="Healthcheck",
    description="Healthcheck endpoint to verify if service is running.",
    response_description="Status of service",
    response_model=dict,
    responses={
        200: {
            "description": "Service is running.",
            "content": {
                "application/json": {
                    "example": {"message": "API is running", "status": "OK"}
                }
            },
        }
    },
)
def healthcheck():
    """Healthcheck endpoint to verify if service is running."""
    # log.debug("Healthcheck endpoint called.")
    return {"message": "API is running", "status": "OK"}
