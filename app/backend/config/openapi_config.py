from pydantic_settings import BaseSettings, SettingsConfigDict


class OpenAPIConfig(BaseSettings):
    """OpenAPI configuration settings"""

    model_config = SettingsConfigDict(case_sensitive=False, env_prefix="OPENAPI_")

    url: str = "/openapi.json"
    """The URL path where the OpenAPI schema is served (left empty to disable)"""
    title: str = "StarCommander Backend API"
    """The title of the OpenAPI documentation"""
    version: str = "v1"
    """The version of the OpenAPI documentation"""
    description: str = "API documentation for the StarCommander Backend service."
    """A brief description of the API"""
