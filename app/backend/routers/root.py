from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response
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


@core_router.delete(
    "/purge-logs",
    summary="Purge Logs",
    description="Purge all log files from the server.",
    status_code=204,
    responses={
        204: {
            "description": "Logs purged successfully.",
        },
        500: {
            "description": "Error occurred while purging logs.",
            "content": {
                "application/json": {"example": {"error": "Failed to purge logs."}}
            },
        },
    },
)
def purge_logs():
    """
    Purge all log files from the server by deleting files in the logs directory.
    """
    import os
    import glob

    log.debug("Purge Logs endpoint called.")
    logs_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "..", "logs"
    )
    try:
        log_files = glob.glob(os.path.join(logs_path, "*.log"))
        for log_file in log_files:
            os.remove(log_file)
        log.info("All log files purged successfully.")
        return Response(status_code=204)
    except Exception as e:
        log.error(f"Failed to purge logs: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to purge logs."})
