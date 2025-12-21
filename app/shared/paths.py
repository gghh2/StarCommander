import platform
from pathlib import Path
from os import getenv

APP_NAME = "StarCommander"


def get_app_data_dir() -> Path:
    """Get the application data directory based on the operating system

    Note: If DB_DEVMODE=true is set in the environment variables,
    the function will return a temporary directory for development purposes.

    Returns:
        Path: The path to the application data directory
    """
    if getenv("DB_DEVMODE", "false").lower() == "true":
        path = Path("/tmp") / APP_NAME
        path.mkdir(parents=True, exist_ok=True)
        return path

    system = platform.system()

    if system == "Windows":
        base = Path.home() / "AppData" / "Roaming"
    elif system == "Darwin":  # macOS
        base = Path.home() / "Library" / "Application Support"
    else:  # Linux
        base = Path.home() / ".local" / "share"

    path = base / APP_NAME
    path.mkdir(parents=True, exist_ok=True)
    return path
