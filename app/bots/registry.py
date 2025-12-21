from multiprocessing import Process
from threading import Lock
from typing import Dict


class BotRegistry:
    def __init__(self):
        self._bots: Dict[str, Process] = {}
        self._lock = Lock()

    # --------- CRUD runtime ---------

    def register(self, bot_id: str, process: Process):
        with self._lock:
            self._bots[bot_id] = process

    def unregister(self, bot_id: str):
        with self._lock:
            self._bots.pop(bot_id, None)

    def get(self, bot_id: str) -> Process | None:
        with self._lock:
            return self._bots.get(bot_id)

    def list_ids(self) -> list[str]:
        with self._lock:
            return list(self._bots.keys())

    # --------- Status ---------

    def is_running(self, bot_id: str) -> bool:
        with self._lock:
            process = self._bots.get(bot_id)
            return process is not None and process.is_alive()

    def count(self) -> int:
        with self._lock:
            return len(self._bots)

    # --------- Cleanup ---------

    def stop_all(self):
        with self._lock:
            for process in self._bots.values():
                if process.is_alive():
                    process.terminate()
            self._bots.clear()


# Singleton instance
bot_registry = BotRegistry()
