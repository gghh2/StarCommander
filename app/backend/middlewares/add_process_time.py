import time

from fastapi import Request
from fastapi.responses import JSONResponse, Response

from ..libs import Logger

log = Logger.get_logger(__name__)


class AddProcessTimeMiddleware:
    def __init__(self):
        pass

    async def __call__(self, request: Request, call_next):
        start_time = time.time()
        response: Response | JSONResponse = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        if not request.url.path.__contains__("healthcheck"):
            log.debug(f"Request {request.url.path} processed in {process_time} seconds")
        return response
