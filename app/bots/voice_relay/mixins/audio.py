from discord.sinks import RawData

from .pcm_stream import FRAME_SIZE


class AudioRelay:
    def __init__(self, *, audio_targets: dict):
        self.audio_targets = audio_targets  # bot_id -> queue

    def start_listening(self, vc, *, filter_fn):
        sink = RawData()
        vc.listen(sink)

        @sink.event
        async def on_packet(packet):
            if not filter_fn(packet):
                return

            pcm = packet.data
            if len(pcm) != FRAME_SIZE:
                # Incomplete frame, skip
                return

            for q in self.audio_targets.values():
                q.put({"user_id": packet.user_id, "pcm": packet.data})
