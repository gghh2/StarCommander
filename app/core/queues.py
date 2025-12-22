from multiprocessing import Queue

event_queue = Queue()
"""Queue for bot events to be processed by the API server.

***Note***: Each object in the queue is expected to be a dictionary with the following structure:

```python
{
    "source": str,  # Source of the event, e.g., "bot"
    "bot_id": str,  # Unique identifier for the bot
    "type": str,    # Type of event, e.g., "ready", "shutting_down"
    "payload": dict # Additional data associated with the event
}
```
"""

command_queues = {}
"""Dictionary mapping bot IDs to their command queues.
Key: bot_id (`str`), Value: (`multiprocessing.Queue`)

***Note***: Each VoiceRelayBot and ManagerBot instance should have its own unique command queue.
  Each object in the queue is expected to be a dictionary with the following structure:

  ```python
  {
      "command": str,  # Command to be executed by the bot
      "params": dict,  # Parameters associated with the command
  }
  ```
"""

audio_queues = {}
"""Dictionary mapping bot IDs to their audio queues.
Key: bot_id (`str`), Value: (`multiprocessing.Queue`)

***Note***: Each VoiceRelayBot instance should have its own unique audio queue.
  Each object in the queue is expected to be a dictionary with the following structure:

  ```python
  {
      "user_id": int,  # Discord user ID of the audio source
      "audio_data": bytes,  # Raw audio data in PCM format
  }
  ```
"""
