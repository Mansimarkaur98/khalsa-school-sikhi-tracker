import { useEffect, useState, type FormEvent } from 'react'
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
import { GRADE_OPTIONS, type StudentConflictDetail, type StudentOut } from '../api/types'

interface AddEditStudentModalProps {
  open: boolean
  onClose: () => void
  onSaved: (student: StudentOut) => void
  student?: StudentOut | null // present => edit mode, absent => add mode
}

export function AddEditStudentModal({ open, onClose, onSaved, student }: AddEditStudentModalProps) {
  const isEdit = Boolean(student)

  const [studentId, setStudentId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [grade, setGrade] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<StudentConflictDetail['conflicting_student'] | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
    }
  }, [open, student])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setConflict(null)
    setSubmitting(true)
    try {
      let saved: StudentOut
      if (isEdit && student) {
        saved = await updateStudent(student.student_id, { first_name: firstName, last_name: lastName, grade })
      } else {
        saved = await createStudent({ student_id: studentId, first_name: firstName, last_name: lastName, grade })
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
              required
              fullWidth
              disabled={isEdit}
              helperText={isEdit ? 'Student ID cannot be changed once created.' : undefined}
              slotProps={{ htmlInput: { maxLength: 9, inputMode: 'numeric' } }}
            />
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
            <TextField label="Grade" select value={grade} onChange={(e) => setGrade(e.target.value)} required fullWidth>
              {GRADE_OPTIONS.map((g) => (
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
