import { useEffect, useMemo, useState, type FormEvent } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link as MuiLink,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { isAxiosError } from 'axios'
import { createStudent, removeStudentPhoto, updateStudent, uploadStudentPhoto } from '../api/students'
import { listSchools } from '../api/schools'
import { GRADE_OPTIONS, type SchoolOut, type StudentConflictDetail, type StudentOut } from '../api/types'
import { useAuth } from '../context/AuthContext'

interface AddEditStudentModalProps {
  open: boolean
  onClose: () => void
  onSaved: (student: StudentOut) => void
  student?: StudentOut | null // present => edit mode, absent => add mode
  defaultSchoolId?: number // admin only: pre-select whichever school is currently being viewed
}

export function AddEditStudentModal({ open, onClose, onSaved, student, defaultSchoolId }: AddEditStudentModalProps) {
  const isEdit = Boolean(student)
  const idLocked = isEdit && Boolean(student?.has_assessments)
  const { isAdmin, schoolId: ownSchoolId } = useAuth()

  const [schools, setSchools] = useState<SchoolOut[]>([])
  const [studentId, setStudentId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [grade, setGrade] = useState('')
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | ''>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<StudentConflictDetail['conflicting_student'] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [studentIdTouched, setStudentIdTouched] = useState(false)

  const studentIdInvalid = studentId.length > 0 && !/^\d{9}$/.test(studentId)

  useEffect(() => {
    listSchools().then(setSchools)
  }, [])

  useEffect(() => {
    if (open) {
      setStudentId(student?.student_id ?? '')
      setFirstName(student?.first_name ?? '')
      setLastName(student?.last_name ?? '')
      setGrade(student?.grade ?? '')
      setPhotoFile(null)
      setRemovePhoto(false)
      setError(null)
      setConflict(null)
      setStudentIdTouched(false)
      if (isEdit) {
        setSelectedSchoolId(student?.school_id ?? '')
      } else if (isAdmin) {
        // Prefer whichever school is currently being viewed on the list page; otherwise
        // fall back to the admin's own school from signup. Always editable either way.
        setSelectedSchoolId(defaultSchoolId ?? ownSchoolId ?? '')
      } else {
        setSelectedSchoolId(ownSchoolId ?? '')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student])

  const activeSchool = useMemo(
    () => schools.find((s) => s.id === selectedSchoolId) ?? null,
    [schools, selectedSchoolId],
  )

  const allowedGrades = useMemo(() => {
    if (!activeSchool) return []
    return GRADE_OPTIONS.filter((g) => {
      const n = Number(g)
      return !Number.isNaN(n) && n >= activeSchool.min_grade && n <= activeSchool.max_grade
    })
  }, [activeSchool])

  function handleSchoolChange(newSchoolId: number) {
    setSelectedSchoolId(newSchoolId)
    const school = schools.find((s) => s.id === newSchoolId)
    if (school && grade) {
      const n = Number(grade)
      if (Number.isNaN(n) || n < school.min_grade || n > school.max_grade) {
        setGrade('')
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setConflict(null)
    if (studentIdInvalid) {
      setStudentIdTouched(true)
      setError('Invalid student ID - enter a 9 digit ID.')
      return
    }
    if (isAdmin && !selectedSchoolId) {
      setError('Please select a school.')
      return
    }
    setSubmitting(true)
    try {
      let saved: StudentOut
      if (isEdit && student) {
        saved = await updateStudent(student.student_id, {
          student_id: studentId,
          first_name: firstName,
          last_name: lastName,
          grade,
          school_id: isAdmin ? (selectedSchoolId as number) : undefined,
        })
      } else {
        saved = await createStudent({
          student_id: studentId,
          first_name: firstName,
          last_name: lastName,
          grade,
          school_id: isAdmin ? (selectedSchoolId as number) : undefined,
        })
      }
      if (photoFile) {
        saved = await uploadStudentPhoto(saved.student_id, photoFile)
      } else if (removePhoto) {
        saved = await removeStudentPhoto(saved.student_id)
      }
      onSaved(saved)
      onClose()
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        const detail = err.response.data.detail as StudentConflictDetail
        setError(detail.message)
        setConflict(detail.conflicting_student)
      } else if (isAxiosError(err) && err.response?.status === 400) {
        setError(typeof err.response.data.detail === 'string' ? err.response.data.detail : 'Photo upload failed.')
      } else if (isAxiosError(err) && err.response?.status === 422) {
        setError('Invalid student ID - enter a 9 digit ID.')
      } else {
        setError('Unable to save student. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isEdit ? 'Edit student' : 'Add student'}
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2.5}>
            {error && (
              <Alert severity="error">
                {error}
                {conflict && (
                  <Box sx={{ mt: 1 }}>
                    Existing: {conflict.first_name} {conflict.last_name} — Grade {conflict.grade} (ID{' '}
                    {conflict.student_id})
                  </Box>
                )}
              </Alert>
            )}

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Avatar
                variant="rounded"
                src={
                  photoFile
                    ? URL.createObjectURL(photoFile)
                    : removePhoto
                      ? undefined
                      : student?.photo_url ?? undefined
                }
                sx={{ width: 64, height: 64, bgcolor: 'grey.100', color: 'grey.400', border: '1px dashed', borderColor: 'grey.300' }}
              >
                <PhotoCameraOutlinedIcon />
              </Avatar>
              <Box>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <MuiLink component="button" type="button" underline="hover" sx={{ fontWeight: 600 }}>
                    <label style={{ cursor: 'pointer' }}>
                      {student?.photo_url && !removePhoto ? 'Replace photo' : 'Upload photo'}
                      <input
                        type="file"
                        hidden
                        accept="image/jpeg,image/png"
                        onChange={(e) => {
                          setPhotoFile(e.target.files?.[0] ?? null)
                          setRemovePhoto(false)
                        }}
                      />
                    </label>
                  </MuiLink>
                  {(photoFile || (student?.photo_url && !removePhoto)) && (
                    <MuiLink
                      component="button"
                      type="button"
                      underline="hover"
                      color="error"
                      sx={{ fontWeight: 600 }}
                      onClick={() => {
                        setPhotoFile(null)
                        setRemovePhoto(true)
                      }}
                    >
                      Remove
                    </MuiLink>
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Optional
                </Typography>
              </Box>
            </Stack>

            <TextField
              label="Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onBlur={() => setStudentIdTouched(true)}
              required
              fullWidth
              disabled={idLocked}
              error={!idLocked && studentIdTouched && studentIdInvalid}
              helperText={
                idLocked
                  ? 'This student has assessment history, so their Student ID cannot be changed.'
                  : studentIdTouched && studentIdInvalid
                    ? 'Invalid student ID - enter a 9 digit ID.'
                    : undefined
              }
              slotProps={{ htmlInput: { maxLength: 9, inputMode: 'numeric' } }}
            />
            <TextField
              label="School"
              select
              value={selectedSchoolId}
              onChange={(e) => handleSchoolChange(Number(e.target.value))}
              required
              fullWidth
              disabled={!isAdmin}
              helperText={
                !isAdmin
                  ? isEdit
                    ? 'Only an admin can move a student to a different school.'
                    : 'Students are added to your own school.'
                  : isEdit
                    ? 'Moving schools also updates their grade options — double-check the grade below.'
                    : undefined
              }
            >
              {schools.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                fullWidth
              />
            </Stack>
            <TextField
              label="Grade"
              select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
              fullWidth
              disabled={!activeSchool}
              helperText={!activeSchool ? 'Select a school to see available grades.' : undefined}
            >
              {allowedGrades.map((g) => (
                <MenuItem key={g} value={g}>
                  {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save student'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
