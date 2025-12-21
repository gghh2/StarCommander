from multiprocessing import Process
from bots.bot import run_bot


def start_bot(bot_id: str, token: str) -> Process:
    process = Process(target=run_bot, args=(token,), name=f"bot-{bot_id}", daemon=True)
    process.start()
    return process


def stop_bot(process: Process):
    process.terminate()
