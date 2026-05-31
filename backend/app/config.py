from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://mtg_user:mtgpassword@localhost:5432/mtg_chicken_soup"
    model_name: str = "Qwen/Qwen2.5-7B-Instruct"
    model_path: str | None = None  # Path to fine-tuned model once ready

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
