from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    openai_api_key: str = ""
    resend_api_key: str = ""
    resend_from_email: str = "onboarding@resend.dev"
    # Base URL of the web app, for the "View this lead" link in the
    # lead-created email — same value as web's NEXT_PUBLIC_APP_URL.
    app_public_url: str = ""


settings = Settings()
