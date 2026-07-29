// Mirrors backend/app/schemas.py exactly — keep these in sync with the FastAPI Pydantic models.

export type Grade = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12'

export const GRADE_OPTIONS: Grade[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

// ---------- Auth ----------
export interface LoginRequest {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// ---------- Students ----------
export interface StudentListItem {
  student_id: string
  first_name: string
  last_name: string
  grade: string
  photo_url: string | null
  active_status: boolean
}

export interface StudentOut {
  student_id: string
  first_name: string
  last_name: string
  grade: string
  photo_url: string | null
  active_status: boolean
  created_at: string
  updated_at: string
}

export interface StudentCreate {
  student_id: string
  first_name: string
  last_name: string
  grade: string
}

export interface StudentUpdate {
  first_name: string
  last_name: string
  grade: string
}

export interface ConflictingStudent {
  student_id: string
  first_name: string
  last_name: string
  grade: string
}

export interface StudentConflictDetail {
  message: string
  conflicting_student: ConflictingStudent
}

// ---------- Categories & Levels ----------
export interface CategoryOut {
  id: number
  category_name: string
}

export interface LevelOut {
  id: number
  category_id: number
  level_number: number
  description: string
}

// ---------- Assessments ----------
export interface AssessmentCreate {
  category_id: number
  level_id: number
  assessment_date: string // YYYY-MM-DD
  assessed_by: string
  comments?: string | null
}

export interface AssessmentOut {
  id: number
  student_id: string
  category_id: number
  level_id: number
  assessment_date: string
  academic_year: string
  assessment_term: number
  assessed_by: string
  comments: string | null
}

// ---------- Grade Progress ----------
export interface GradeProgressItem {
  category_id: number
  category_name: string
  average_level: number | null
  max_level: number
  student_count: number
}
