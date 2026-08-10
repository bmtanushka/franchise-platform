from fastapi import FastAPI

app = FastAPI(title="Franchise Platform Agent")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
