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

export interface SignupRequest {
  first_name: string
  last_name: string
  school_id: number
  email: string
  password: string
}

export interface SignupResponse {
  message: string
  email: string
}

export interface ResendVerificationRequest {
  email: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface MessageResponse {
  message: string
}

export interface CurrentUserResponse {
  first_name: string | null
  last_name: string | null
  email: string | null
  display_name: string
  role: string
  school_id: number | null
  school_name: string | null
}

// ---------- Schools ----------
export interface SchoolOut {
  id: number
  name: string
  min_grade: number
  max_grade: number
}

// ---------- Admin ----------
export interface AdminUserOut {
  id: number
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string
  email_verified: boolean
  school_id: number | null
  school_name: string | null
}

export interface AdminUserSchoolUpdate {
  school_id: number
}

// ---------- Students ----------
export interface StudentListItem {
  student_id: string
  first_name: string
  last_name: string
  grade: string
  photo_url: string | null
  active_status: boolean
  school_id: number
  school_name: string | null
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
  has_assessments: boolean
  school_id: number
  school_name: string | null
}

export interface StudentCreate {
  student_id: string
  first_name: string
  last_name: string
  grade: string
  school_id?: number
}

export interface StudentUpdate {
  first_name: string
  last_name: string
  grade: string
  student_id?: string
  school_id?: number
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
  active: boolean
}

export interface CategoryCreate {
  category_name: string
}

export interface CategoryUpdate {
  category_name: string
}

export interface LevelOut {
  id: number
  category_id: number
  level_number: number
  description: string
  active: boolean
}

export interface CategoryLevelCreate {
  level_number: number
  description: string
}

export interface CategoryLevelUpdate {
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

// ---------- Goals ----------
export interface GoalCreate {
  category_id: number
  target_level_id: number
  target_date: string // YYYY-MM-DD
}

export interface GoalOut {
  id: number
  student_id: string
  category_id: number
  target_level_id: number
  target_date: string
  set_by: string
  created_at: string
}

// ---------- Grade Progress ----------
export interface GradeProgressItem {
  category_id: number
  category_name: string
  average_level: number | null
  max_level: number
  student_count: number
}
