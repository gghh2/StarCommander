from multiprocessing import Queue
from queue import Empty

import discord
from backend.libs.logger import Logger

FRAME_SIZE = 3840  # 20ms of 48kHz 16-bit stereo PCM

log = Logger.get_logger(__name__)


class PCMStream(discord.AudioSource):
    def __init__(self, audio_queue: Queue):
        self.queue = audio_queue
        self._closed = False

    def read(self):
        if self._closed:
            return b""

        try:
            queued_data = self.queue.get(timeout=1)
            log.debug(
                f"PCMStream read data for user {queued_data['user_id']} size {len(queued_data['pcm'])}"
            )
            return queued_data["pcm"]

        except Empty:
            return b"\x00" * FRAME_SIZE  # Silence

    def is_opus(self):
        return False

    def cleanup(self):
        self._closed = True
