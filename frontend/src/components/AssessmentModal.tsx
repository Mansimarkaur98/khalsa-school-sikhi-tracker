import { useEffect, useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { isAxiosError } from 'axios'
import dayjs, { type Dayjs } from 'dayjs'
import { createAssessment, updateAssessment } from '../api/assessments'
import { listCategories, listLevels } from '../api/categories'
import { createGoal } from '../api/goals'
import type { AssessmentOut, CategoryOut, GoalOut, LevelOut } from '../api/types'
import { useAuth } from '../context/AuthContext'

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
  onGoalSaved?: (goal: GoalOut) => void
  studentId: string
  assessment?: AssessmentOut | null // present => edit mode, absent => add mode
  goals?: GoalOut[] // used to prefill an existing target when editing
}

export function AssessmentModal({
  open,
  onClose,
  onSaved,
  onGoalSaved,
  studentId,
  assessment,
  goals = [],
}: AssessmentModalProps) {
  const isEdit = Boolean(assessment)
  const { displayName } = useAuth()

  const [categories, setCategories] = useState<CategoryOut[]>([])
  const [levels, setLevels] = useState<LevelOut[]>([])
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [levelId, setLevelId] = useState<number | ''>('')
  const [assessmentDate, setAssessmentDate] = useState<Dayjs | null>(defaultAssessmentDate())
  const [assessedBy, setAssessedBy] = useState('')
  const [comments, setComments] = useState('')
  const [targetLevelId, setTargetLevelId] = useState<number | ''>('')
  const [targetDate, setTargetDate] = useState<Dayjs | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      listCategories().then(setCategories)
      setCategoryId(assessment?.category_id ?? '')
      setLevelId(assessment?.level_id ?? '')
      setAssessmentDate(assessment ? dayjs(assessment.assessment_date) : defaultAssessmentDate())
      setAssessedBy(assessment?.assessed_by ?? displayName ?? '')
      setComments(assessment?.comments ?? '')
      // When editing, prefill the target from whatever goal currently exists
      // for this category (goals arrive most-recent-first) so it's visible
      // and adjustable rather than looking unset.
      const existingGoal = assessment ? goals.find((g) => g.category_id === assessment.category_id) : undefined
      setTargetLevelId(existingGoal?.target_level_id ?? '')
      setTargetDate(existingGoal ? dayjs(existingGoal.target_date) : null)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const selectedLevel = levels.find((l) => l.id === levelId)
  const maxLevelNumber = levels.length > 0 ? Math.max(...levels.map((l) => l.level_number)) : 0
  const isAtMaxLevel = Boolean(selectedLevel) && selectedLevel!.level_number === maxLevelNumber
  // Before an achievement level is chosen, offer every level in the category —
  // narrow it down to "above the achievement level" once one is picked.
  const targetLevelOptions = selectedLevel ? levels.filter((l) => l.level_number > selectedLevel.level_number) : levels

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (categoryId === '' || levelId === '' || !assessmentDate) return
    if (targetLevelId !== '' && !targetDate) {
      setError('Choose a target date, or clear the target level.')
      return
    }
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

      if (targetLevelId !== '' && targetDate) {
        try {
          const savedGoal = await createGoal(studentId, {
            category_id: categoryId,
            target_level_id: targetLevelId,
            target_date: targetDate.format('YYYY-MM-DD'),
          })
          onGoalSaved?.(savedGoal)
        } catch (goalErr) {
          const detail = isAxiosError(goalErr) && goalErr.response?.status === 400 ? goalErr.response.data.detail : null
          setError(
            `Assessment saved, but the target could not be set: ${typeof detail === 'string' ? detail : 'please try again.'}`,
          )
          setSubmitting(false)
          return
        }
      }

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
      <DialogTitle
        sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}
      >
        {isEdit ? 'Edit assessment' : 'Add assessment'}
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Category"
              select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(Number(e.target.value))
                // A target level tied to the old category's levels is no
                // longer meaningful once the category itself changes.
                setTargetLevelId('')
                setTargetDate(null)
              }}
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
              onChange={(e) => {
                setLevelId(Number(e.target.value))
                // The target level is only meaningful relative to the
                // achievement level just picked — clear it if it's no longer
                // "above" the new one.
                setTargetLevelId('')
                setTargetDate(null)
              }}
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
                disabled
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
            <Divider>
              <Typography variant="caption" color="text.secondary">
                Set a target for this category (optional)
              </Typography>
            </Divider>
            {isAtMaxLevel ? (
              <Alert severity="success" variant="outlined">
                Already at maximum level
              </Alert>
            ) : (
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Target level"
                  select
                  value={targetLevelId}
                  onChange={(e) => setTargetLevelId(Number(e.target.value))}
                  fullWidth
                  disabled={categoryId === ''}
                  slotProps={{
                    inputLabel: { shrink: true },
                    select: {
                      displayEmpty: true,
                      MenuProps: { slotProps: { paper: { sx: { maxWidth: 480 } } } },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>No target</em>
                  </MenuItem>
                  {targetLevelOptions.map((l) => (
                    <MenuItem key={l.id} value={l.id} sx={{ whiteSpace: 'normal' }}>
                      {l.level_number} — {l.description}
                    </MenuItem>
                  ))}
                </TextField>
                <DatePicker
                  label="Target date"
                  value={targetDate}
                  onChange={(newVal) => setTargetDate(newVal)}
                  minDate={dayjs().add(1, 'day')}
                  disabled={targetLevelId === ''}
                  slotProps={{ textField: { fullWidth: true, required: targetLevelId !== '' } }}
                />
              </Stack>
            )}
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
