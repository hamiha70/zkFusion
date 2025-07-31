"""Configuration management for social media capture tool."""

import os
from pathlib import Path
from typing import List, Optional, Union

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field, validator


class DiscordChannelConfig(BaseModel):
    """Configuration for a Discord channel or thread."""
    
    name: str
    guild_id: Optional[str] = None
    channel_id: str
    thread_id: Optional[str] = None
    last_message_id: Optional[str] = None
    enabled: bool = True
    max_history: int = 200
    
    @validator('channel_id', 'thread_id', 'guild_id', 'last_message_id')
    def validate_ids(cls, v):
        """Validate Discord IDs are strings of digits."""
        if v is not None and not (isinstance(v, str) and v.isdigit()):
            raise ValueError("Discord IDs must be strings of digits")
        return v


class YouTubeVideoConfig(BaseModel):
    """Configuration for a YouTube video."""
    
    name: str
    url: str
    video_id: Optional[str] = None
    last_updated: Optional[str] = None
    enabled: bool = True
    languages: List[str] = ["en", "en-US"]
    
    @validator('url')
    def validate_youtube_url(cls, v):
        """Validate YouTube URL format."""
        if not ("youtube.com/watch" in v or "youtu.be/" in v):
            raise ValueError("Must be a valid YouTube URL")
        return v


class DiscordConfig(BaseModel):
    """Discord configuration section."""
    
    channels: List[DiscordChannelConfig] = []


class YouTubeConfig(BaseModel):
    """YouTube configuration section."""
    
    videos: List[YouTubeVideoConfig] = []


class GlobalSettings(BaseModel):
    """Global settings for the capture tool."""
    
    output_format: str = "markdown"
    output_directory: str = "./capture"
    discord_delay: float = 2.5
    youtube_delay: float = 1.0
    include_metadata: bool = True
    include_attachments: bool = False
    max_message_length: int = 2000
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    log_level: str = "INFO"
    log_to_file: bool = True
    
    @validator('output_format')
    def validate_output_format(cls, v):
        """Validate output format."""
        valid_formats = ["markdown", "json", "both"]
        if v not in valid_formats:
            raise ValueError(f"output_format must be one of {valid_formats}")
        return v
    
    @validator('log_level')
    def validate_log_level(cls, v):
        """Validate log level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR"]
        if v not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return v


class Config(BaseModel):
    """Main configuration class."""
    
    discord: DiscordConfig = DiscordConfig()
    youtube: YouTubeConfig = YouTubeConfig()
    settings: GlobalSettings = GlobalSettings()


class EnvironmentConfig:
    """Environment variable configuration."""
    
    def __init__(self, env_file: Optional[str] = None):
        """Load environment variables from .env file."""
        if env_file:
            load_dotenv(env_file)
        else:
            # Try to find .env file in current directory or parent directories
            current_dir = Path.cwd()
            for parent in [current_dir] + list(current_dir.parents):
                env_path = parent / ".env"
                if env_path.exists():
                    load_dotenv(env_path)
                    break
    
    @property
    def discord_user_token(self) -> str:
        """Get Discord user token from environment."""
        token = os.getenv("DISCORD_USER_TOKEN")
        if not token:
            raise ValueError(
                "DISCORD_USER_TOKEN not found in environment. "
                "Please copy .env.example to .env and configure it."
            )
        return token
    
    @property
    def discord_rate_limit_delay(self) -> float:
        """Get Discord rate limit delay."""
        return float(os.getenv("DISCORD_RATE_LIMIT_DELAY", "2.5"))
    
    @property
    def discord_max_messages_per_batch(self) -> int:
        """Get max messages per batch."""
        return int(os.getenv("DISCORD_MAX_MESSAGES_PER_BATCH", "50"))
    
    @property
    def youtube_rate_limit_delay(self) -> float:
        """Get YouTube rate limit delay."""
        return float(os.getenv("YOUTUBE_RATE_LIMIT_DELAY", "1.0"))
    
    @property
    def youtube_default_languages(self) -> List[str]:
        """Get default YouTube languages."""
        langs = os.getenv("YOUTUBE_DEFAULT_LANGUAGES", "en,en-US")
        return [lang.strip() for lang in langs.split(",")]
    
    @property
    def log_level(self) -> str:
        """Get log level."""
        return os.getenv("LOG_LEVEL", "INFO")
    
    @property
    def log_to_file(self) -> bool:
        """Get whether to log to file."""
        return os.getenv("LOG_TO_FILE", "true").lower() == "true"
    
    @property
    def output_format(self) -> str:
        """Get output format."""
        return os.getenv("OUTPUT_FORMAT", "markdown")
    
    @property
    def include_metadata(self) -> bool:
        """Get whether to include metadata."""
        return os.getenv("INCLUDE_METADATA", "true").lower() == "true"
    
    @property
    def include_attachments(self) -> bool:
        """Get whether to include attachments."""
        return os.getenv("INCLUDE_ATTACHMENTS", "false").lower() == "true"


def load_config(config_file: str = "config.yaml") -> tuple[Config, EnvironmentConfig]:
    """
    Load configuration from YAML file and environment variables.
    
    Args:
        config_file: Path to the YAML configuration file
        
    Returns:
        Tuple of (Config, EnvironmentConfig) objects
        
    Raises:
        FileNotFoundError: If config file doesn't exist
        ValueError: If configuration is invalid
    """
    config_path = Path(config_file)
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_file}")
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = yaml.safe_load(f)
        
        config = Config(**config_data)
        env_config = EnvironmentConfig()
        
        return config, env_config
        
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML in config file: {e}")
    except Exception as e:
        raise ValueError(f"Invalid configuration: {e}")


def save_config(config: Config, config_file: str = "config.yaml") -> None:
    """
    Save configuration to YAML file.
    
    Args:
        config: Configuration object to save
        config_file: Path to save the configuration file
    """
    config_data = config.dict()
    
    with open(config_file, 'w', encoding='utf-8') as f:
        yaml.dump(config_data, f, default_flow_style=False, indent=2) 