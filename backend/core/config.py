from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEMO_MODE: bool = True
    
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    
    DATABASE_URL: str = "sqlite:///./agentic_soc.db"
    
    JWT_SECRET: str = "supersecret_demo_key_do_not_use_in_prod"
    
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
