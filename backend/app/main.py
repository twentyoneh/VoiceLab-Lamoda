from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, stats, dialogs, filters, refusals

app = FastAPI(title="VoiceLab API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(stats.router)
app.include_router(dialogs.router)
app.include_router(filters.router)
app.include_router(refusals.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
