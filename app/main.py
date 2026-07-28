from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, students, assessments, categories, grades

app = FastAPI(title="Khalsa School Sikhi Progress Tracker API", version="1.0.0")

# Vite's default dev server port — adjust/add your deployed frontend origin later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(assessments.router)
app.include_router(categories.router)
app.include_router(grades.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
