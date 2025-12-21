from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, Response
from uuid import UUID

from ..controllers.bot_controller import BotController
from ..libs import Logger
from ..libs.database import get_db
from ..models.bot import Bot, BotCreate

log = Logger.get_logger(__name__)

# --------------------------------------------------------------------------- #
# Routers
# --------------------------------------------------------------------------- #

bot_crud_router = APIRouter(
    prefix="/bots",
    tags=["Bots CRUD"],
)
"""Bot CRUD API Router"""

bot_operations_router = APIRouter(
    prefix="/bots/operations",
    tags=["Bots Operations"],
)
"""Bot Operations API Router"""

# --------------------------------------------------------------------------- #
# Common docs components
# --------------------------------------------------------------------------- #
example_bot = {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "manager",
    "name": "My Bot",
    "description": "This is a test bot.",
    "is_active": True,
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z",
}

# --------------------------------------------------------------------------- #
# Bot CRUD Endpoints
# --------------------------------------------------------------------------- #


@bot_crud_router.post(
    "/",
    summary="Create Bot",
    description="Create a new bot in the system.",
    response_description="The created Bot instance",
    response_model=Bot,
    responses={
        201: {
            "description": "Bot created successfully.",
            "content": {"application/json": {"example": example_bot}},
        },
        409: {
            "description": "Conflict. Token hash already exists.",
        },
    },
)
def create_bot_endpoint(bot_data: BotCreate, db=Depends(get_db)):
    """Create a new bot in the system."""

    log.debug("Create Bot endpoint called.")
    controller = BotController(db)
    new_bot = controller.create_bot(bot_data)
    if new_bot:
        return new_bot
    else:
        log.error("Bot creation failed due to existing token hash.")
        return JSONResponse(
            status_code=409, content={"error": "Token hash already exists."}
        )


@bot_crud_router.get(
    "/",
    summary="List Bots",
    description="Retrieve a list of all bots in the system.",
    response_description="A list of Bot instances",
    response_model=list[Bot],
    responses={
        200: {
            "description": "List of bots retrieved successfully.",
            "content": {"application/json": {"example": [example_bot]}},
        },
    },
)
def list_bots_endpoint(db=Depends(get_db)):
    """Retrieve a list of all bots in the system."""

    log.debug("List Bots endpoint called.")
    controller = BotController(db)
    bots = controller.list_bots()
    return bots


def parse_bot_id(bot_id: str):
    try:
        return UUID(bot_id), None
    except Exception:
        return None, JSONResponse(
            status_code=422, content={"error": "Value must be a Guid."}
        )


@bot_crud_router.get(
    "/{bot_id}",
    summary="Get Bot by ID",
    description="Retrieve a bot by its ID.",
    response_description="The requested Bot instance",
    response_model=Bot,
    responses={
        200: {
            "description": "Bot retrieved successfully.",
            "content": {"application/json": {"example": example_bot}},
        },
        404: {
            "description": "Bot not found.",
        },
    },
)
def get_bot_by_id_endpoint(bot_id: str, db=Depends(get_db)):
    """Retrieve a bot by its ID."""

    log.debug(f"Get Bot by ID endpoint called with bot_id: {bot_id}")
    controller = BotController(db)
    bot_uuid, error = parse_bot_id(bot_id)
    if error:
        return error
    bot = controller.get_bot_by_id(bot_uuid)
    if bot:
        return bot
    else:
        log.warning(f"Bot with ID {bot_id} not found.")
        return JSONResponse(status_code=404, content={"error": "Bot not found."})


@bot_crud_router.put(
    "/{bot_id}",
    summary="Update Bot",
    description="Update an existing bot's information.",
    response_description="The updated Bot instance",
    response_model=Bot,
    responses={
        200: {
            "description": "Bot updated successfully.",
            "content": {"application/json": {"example": example_bot}},
        },
        404: {
            "description": "Bot not found.",
        },
        409: {
            "description": "Conflict. Token hash already exists.",
        },
    },
)
def update_bot_endpoint(bot_id: str, bot_update: BotCreate, db=Depends(get_db)):
    """Update an existing bot's information."""

    log.debug(f"Update Bot endpoint called with bot_id: {bot_id}")
    controller = BotController(db)
    bot_uuid, error = parse_bot_id(bot_id)
    if error:
        return error
    updated_bot = controller.update_bot(bot_uuid, bot_update)
    if isinstance(updated_bot, Bot):
        return updated_bot
    else:
        log.warning(updated_bot[1])
        return JSONResponse(
            status_code=updated_bot[0], content={"error": updated_bot[1]}
        )


@bot_crud_router.patch(
    "/{bot_id}/switch-activation",
    summary="Switch Bot Activation",
    description="Toggle the activation status of a bot.",
    response_description="The Bot instance with updated activation status",
    response_model=Bot,
    responses={
        200: {
            "description": "Bot activation status switched successfully.",
            "content": {"application/json": {"example": example_bot}},
        },
        404: {
            "description": "Bot not found.",
        },
    },
)
def switch_bot_activation_endpoint(bot_id: str, db=Depends(get_db)):
    """Toggle the activation status of a bot."""

    log.debug(f"Switch Bot Activation endpoint called with bot_id: {bot_id}")
    controller = BotController(db)
    bot_uuid, error = parse_bot_id(bot_id)
    if error:
        return error
    switched_bot = controller.switch_bot_status(bot_uuid)
    if switched_bot:
        return switched_bot
    else:
        log.warning(f"Bot with ID {bot_id} not found for activation switch.")
        return JSONResponse(status_code=404, content={"error": "Bot not found."})


@bot_crud_router.delete(
    "/{bot_id}",
    summary="Delete Bot",
    description="Delete a bot by its ID.",
    status_code=204,
    responses={
        204: {
            "description": "Bot deleted successfully.",
        },
        404: {
            "description": "Bot not found.",
        },
    },
)
def delete_bot_endpoint(bot_id: str, db=Depends(get_db)):
    """Delete a bot by its ID."""

    log.debug(f"Delete Bot endpoint called with bot_id: {bot_id}")
    controller = BotController(db)
    bot_uuid, error = parse_bot_id(bot_id)
    if error:
        return error
    success = controller.delete_bot(bot_uuid)
    if success:
        return Response(status_code=204)
    else:
        log.warning(f"Bot with ID {bot_id} not found for deletion.")
        return JSONResponse(status_code=404, content={"error": "Bot not found."})


# --------------------------------------------------------------------------- #
# Bot Operations Endpoints
# --------------------------------------------------------------------------- #


@bot_operations_router.post(
    "/{bot_id}/start",
    summary="Start Bot",
    description="Start the operation of a bot.",
    response_description="Bot start status message",
    responses={
        200: {
            "description": "Bot started successfully.",
        },
        404: {
            "description": "Bot not found.",
        },
    },
)
def start_bot_endpoint(bot_id: str, db=Depends(get_db)):
    """Start the operation of a bot."""

    log.debug(f"Start Bot endpoint called with bot_id: {bot_id}")
    controller = BotController(db)
    bot_uuid, error = parse_bot_id(bot_id)
    if error:
        return error
    success = controller.start_bot(bot_uuid)
    if success:
        return {"message": "Bot started successfully."}
    else:
        log.warning(f"Bot with ID {bot_id} not found for starting.")
        return JSONResponse(status_code=404, content={"error": "Bot not found."})


@bot_operations_router.post(
    "/{bot_id}/stop",
    summary="Stop Bot",
    description="Stop the operation of a bot.",
    response_description="Bot stop status message",
    responses={
        200: {
            "description": "Bot stopped successfully.",
        },
        404: {
            "description": "Bot not found.",
        },
    },
)
def stop_bot_endpoint(bot_id: str, db=Depends(get_db)):
    """Stop the operation of a bot."""

    log.debug(f"Stop Bot endpoint called with bot_id: {bot_id}")
    controller = BotController(db)
    bot_uuid, error = parse_bot_id(bot_id)
    if error:
        return error
    success = controller.stop_bot(bot_uuid)
    if success:
        return {"message": "Bot stopped successfully."}
    else:
        log.warning(f"Bot with ID {bot_id} not found for stopping.")
        return JSONResponse(status_code=404, content={"error": "Bot not found."})
