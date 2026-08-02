from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.rate_limit import limiter
from app.routers import auth, students, assessments, categories, goals, grades, schools, admin

_is_production = settings.environment == "production"

app = FastAPI(
    title="Khalsa School Sikhi Progress Tracker API",
    version="1.0.0",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Vite falls back to 5174, 5175, etc. whenever its default port is taken, so match
# any localhost dev port rather than hardcoding 5173. FRONTEND_URL (set in .env)
# is added explicitly so the deployed frontend's real origin is allowed too.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(assessments.router)
app.include_router(goals.router)
app.include_router(categories.router)
app.include_router(grades.router)
app.include_router(schools.router)
app.include_router(admin.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
