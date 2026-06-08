from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://mtg_user:mtgpassword@localhost:5432/mtg_chicken_soup"

    # Claude API (production inference)
    anthropic_api_key: str = ""
    model_name: str = "claude-opus-4-8"

    # Ollama (local development inference — takes precedence over everything when set)
    ollama_base_url: str = "http://ollama:11434"
    ollama_model: str = ""  # e.g. "llama3.2" or "qwen2.5:7b"; empty = skip

    # Generic OpenAI-compatible free API (e.g. GitHub Models, Groq, Cerebras, OpenRouter)
    # Takes precedence over Claude when set; Ollama still wins if also set.
    free_api_key: str = ""
    free_api_base_url: str = ""
    free_model: str = ""

    # Preferred inference provider: "claude", "free", or "ollama".
    # That provider is tried first; the others follow in default order.
    # Leave empty to use the default order: ollama → free → claude.
    inference_provider: str = ""

    # RAG embeddings
    # Set EMBEDDING_PROVIDER=ollama to use local Ollama instead (requires nomic-embed-text pulled)
    embedding_provider: str = "openai"
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"
    ollama_embedding_model: str = "nomic-embed-text"

    # Auth
    jwt_secret: str = "change-me-in-production"

    # Public API keys — comma-separated; set at least one to enable /api/v1/*
    v1_api_keys: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
