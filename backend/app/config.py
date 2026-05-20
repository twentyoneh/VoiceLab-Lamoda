from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    db_host: str
    db_port: int = 5432
    db_name: str
    db_user: str
    db_password: str
    db_schema: str = "lamoda"

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # Comma-separated "user:pass" pairs
    users: str

    class Config:
        env_file = ".env"

    def get_users_dict(self) -> dict[str, str]:
        result = {}
        for pair in self.users.split(","):
            pair = pair.strip()
            if ":" in pair:
                username, password = pair.split(":", 1)
                result[username.strip()] = password.strip()
        return result


@lru_cache
def get_settings() -> Settings:
    return Settings()
