from multiprocessing import Process

from bots.factory import create_bot


def run_bot(bot_id: str, token: str, bot_type: str):
    bot = create_bot(bot_type, bot_id=bot_id)
    bot.run(token)


def start_bot(bot_id: str, token: str, bot_type: str) -> Process:
    process = Process(target=run_bot, args=(bot_id, token, bot_type), daemon=True)
    process.start()
    return process


def stop_bot(process: Process):
    process.terminate()
