from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/healthz")
def health():
    return JSONResponse(content={"message": "healthy"}, status_code=200)
