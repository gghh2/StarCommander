from bots.manager.bot import ManagerBot
from bots.voice_relay.bot import VoiceRelayBot

BOT_TYPES = {"manager": ManagerBot, "voice_relay": VoiceRelayBot}


def create_bot(bot_type: str, *, bot_id: str) -> ManagerBot | VoiceRelayBot:
    if bot_type not in BOT_TYPES:
        raise ValueError(f"Unknown bot type: {bot_type}")

    return BOT_TYPES[bot_type](bot_id=bot_id)
