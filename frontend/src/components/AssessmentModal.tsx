import { useEffect, useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { isAxiosError } from 'axios'
import dayjs, { type Dayjs } from 'dayjs'
import { createAssessment, updateAssessment } from '../api/assessments'
import { listCategories, listLevels } from '../api/categories'
import type { AssessmentOut, CategoryOut, LevelOut } from '../api/types'

function isBlockedMonth(date: Dayjs): boolean {
  const month = date.month() // 0-indexed: 6 = July, 7 = August
  return month === 6 || month === 7
}

function defaultAssessmentDate(): Dayjs | null {
  const today = dayjs()
  return isBlockedMonth(today) ? null : today
}

interface AssessmentModalProps {
  open: boolean
  onClose: () => void
  onSaved: (assessment: AssessmentOut) => void
  studentId: string
  assessment?: AssessmentOut | null // present => edit mode, absent => add mode
}

export function AssessmentModal({ open, onClose, onSaved, studentId, assessment }: AssessmentModalProps) {
  const isEdit = Boolean(assessment)

  const [categories, setCategories] = useState<CategoryOut[]>([])
  const [levels, setLevels] = useState<LevelOut[]>([])
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [levelId, setLevelId] = useState<number | ''>('')
  const [assessmentDate, setAssessmentDate] = useState<Dayjs | null>(defaultAssessmentDate())
  const [assessedBy, setAssessedBy] = useState('')
  const [comments, setComments] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      listCategories().then(setCategories)
      setCategoryId(assessment?.category_id ?? '')
      setLevelId(assessment?.level_id ?? '')
      setAssessmentDate(assessment ? dayjs(assessment.assessment_date) : defaultAssessmentDate())
      setAssessedBy(assessment?.assessed_by ?? '')
      setComments(assessment?.comments ?? '')
      setError(null)
    }
  }, [open, assessment])

  useEffect(() => {
    if (categoryId === '') {
      setLevels([])
      return
    }
    listLevels(categoryId).then(setLevels)
    // Only reset the selected level when the category actually changes away
    // from the assessment being edited — otherwise this clears the level we
    // just prefilled on open.
    setLevelId((prev) => (assessment && categoryId === assessment.category_id ? prev : ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (categoryId === '' || levelId === '' || !assessmentDate) return
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        category_id: categoryId,
        level_id: levelId,
        assessment_date: assessmentDate.format('YYYY-MM-DD'),
        assessed_by: assessedBy,
        comments: comments || null,
      }
      const saved =
        isEdit && assessment
          ? await updateAssessment(studentId, assessment.id, payload)
          : await createAssessment(studentId, payload)
      onSaved(saved)
      onClose()
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 400) {
        const detail = err.response.data.detail
        setError(typeof detail === 'string' ? detail : 'Unable to save assessment.')
      } else {
        setError('Unable to save assessment. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isEdit ? 'Edit assessment' : 'Add assessment'}
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Category"
              select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              required
              fullWidth
            >
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.category_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Achievement level"
              select
              value={levelId}
              onChange={(e) => setLevelId(Number(e.target.value))}
              required
              fullWidth
              disabled={categoryId === ''}
              slotProps={{
                select: {
                  MenuProps: { slotProps: { paper: { sx: { maxWidth: 480 } } } },
                },
              }}
            >
              {levels.map((l) => (
                <MenuItem key={l.id} value={l.id} sx={{ whiteSpace: 'normal' }}>
                  {l.level_number} — {l.description}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <DatePicker
                label="Assessment date"
                value={assessmentDate}
                onChange={(newVal) => setAssessmentDate(newVal)}
                maxDate={dayjs()}
                shouldDisableDate={isBlockedMonth}
                slotProps={{ textField: { required: true, fullWidth: true } }}
              />
              <TextField
                label="Assessed by"
                value={assessedBy}
                onChange={(e) => setAssessedBy(e.target.value)}
                required
                fullWidth
              />
            </Stack>
            <TextField
              label="Comments (optional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save assessment'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
