from fastapi import Request
from fastapi.responses import JSONResponse, Response

from ..config import config
from ..libs import Logger

log = Logger.get_logger(__name__)


class CatchUnhandledErrorMiddleware:
    def __init__(self):
        pass

    async def __call__(self, request: Request, call_next):
        try:
            response: Response | JSONResponse = await call_next(request)
            return response

        except Exception as e:
            log.critical(f"Unhandled error for request {request.url.path}: {str(e)}")

            if config.server.dev_mode:
                return JSONResponse(
                    status_code=500,
                    content={
                        "message": "Internal Server Error",
                        "detail": str(e),
                    },
                )
            else:
                return JSONResponse(
                    status_code=500,
                    content={
                        "message": "Internal Server Error",
                        "detail": "An unexpected error occurred",
                    },
                )
