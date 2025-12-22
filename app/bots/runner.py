from multiprocessing import Process

from bots.factory import create_bot


import asyncio


def run_bot(bot_id: str, token: str, bot_type: str):
    # Ensure an event loop exists in this process (required for discord.py in multiprocessing)
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        asyncio.set_event_loop(asyncio.new_event_loop())
    bot = create_bot(bot_type, bot_id=bot_id)
    bot.run(token)


def start_bot(bot_id: str, token: str, bot_type: str) -> Process:
    process = Process(target=run_bot, args=(bot_id, token, bot_type), daemon=True)
    process.start()
    return process


def stop_bot(process: Process):
    process.terminate()
