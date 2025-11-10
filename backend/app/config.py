"""
Application configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings"""

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # CORS
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")

    # MongoDB
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/GemeloDigitalCujai")
    MONGODB_DB: str = os.getenv("MONGODB_DB", "GemeloDigitalCujai")

    # Location (La Habana, Cuba)
    LATITUDE: float = 23.1136
    LONGITUDE: float = -82.3666


settings = Settings()
