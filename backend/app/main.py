from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, students, assessments, categories, grades, schools, admin

app = FastAPI(title="Khalsa School Sikhi Progress Tracker API", version="1.0.0")

# Vite falls back to 5174, 5175, etc. whenever its default port is taken, so match
# any localhost dev port rather than hardcoding 5173 — add your deployed frontend
# origin to allow_origins later for production.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(assessments.router)
app.include_router(categories.router)
app.include_router(grades.router)
app.include_router(schools.router)
app.include_router(admin.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
