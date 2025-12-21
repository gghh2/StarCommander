from pydantic_settings import BaseSettings, SettingsConfigDict


class BackendConfig(BaseSettings):
    """Backend configuration settings"""

    model_config = SettingsConfigDict(case_sensitive=False, env_prefix="BACKEND_")

    server_dev_mode: bool = False
    """Enable development mode for the server"""
    server_reload: bool = False
    """Enable server auto-reload on code changes (for development)"""
    server_log_level: str = "INFO"
    """Logging level for the server"""


# --------------------------------------------------------------------------- #

backend_config = BackendConfig()
"""Backend configuration instance"""
