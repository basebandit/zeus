from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "shipping"
    port: int = 8085
    host: str = "0.0.0.0"
    environment: str = "development"

    db_host: str = "localhost"
    db_port: int = 5437
    db_user: str = "postgres"
    db_password: str = "postgres"
    db_name: str = "shipping"

    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    rabbitmq_exchange: str = "basebandit.events"

    carrier: str = "ZeusExpress"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"


settings = Settings()
