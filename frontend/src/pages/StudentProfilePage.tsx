import { useCallback, useEffect, useMemo, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/Edit'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link as MuiLink,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import { deleteAssessment, listAssessments } from '../api/assessments'
import { listCategories, listLevels } from '../api/categories'
import { listGoals } from '../api/goals'
import { getStudent } from '../api/students'
import type { AssessmentOut, CategoryOut, GoalOut, LevelOut, StudentOut } from '../api/types'
import { AssessmentModal } from '../components/AssessmentModal'
import { AddEditStudentModal } from '../components/AddEditStudentModal'
import { ProgressOverTimeChart } from '../components/ProgressOverTimeChart'
import { shortCategoryLabel } from '../utils/categoryLabels'
import { getCategoryVisual } from '../utils/categoryVisuals'

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMonthYear(iso: string): string {
  const [year, month] = iso.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>()

  const [student, setStudent] = useState<StudentOut | null>(null)
  const [categories, setCategories] = useState<CategoryOut[]>([])
  const [levelsByCategory, setLevelsByCategory] = useState<Record<number, LevelOut[]>>({})
  const [assessments, setAssessments] = useState<AssessmentOut[]>([])
  const [goals, setGoals] = useState<GoalOut[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [addAssessmentOpen, setAddAssessmentOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<AssessmentOut | null>(null)
  const [deletingAssessment, setDeletingAssessment] = useState<AssessmentOut | null>(null)
  const [deletingAssessmentBusy, setDeletingAssessmentBusy] = useState(false)
  const [progressTab, setProgressTab] = useState<'current' | 'over-time'>('current')
  const [historyTab, setHistoryTab] = useState<'assessments' | 'goals'>('assessments')

  const loadAll = useCallback(async () => {
    if (!studentId) return
    const [studentData, categoryData, assessmentData, goalData] = await Promise.all([
      getStudent(studentId),
      listCategories(),
      listAssessments(studentId),
      listGoals(studentId),
    ])
    setStudent(studentData)
    setCategories(categoryData)
    setAssessments(assessmentData)
    setGoals(goalData)

    const levelEntries = await Promise.all(categoryData.map((c) => listLevels(c.id).then((ls) => [c.id, ls] as const)))
    setLevelsByCategory(Object.fromEntries(levelEntries))
  }, [studentId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  function handleAssessmentSaved(saved: AssessmentOut) {
    setAssessments((prev) => {
      const exists = prev.some((a) => a.id === saved.id)
      const next = exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...prev]
      // Match the API's ordering: most recent date first, with same-date entries grouped by category.
      return [...next].sort((a, b) => {
        if (a.assessment_date !== b.assessment_date) return a.assessment_date < b.assessment_date ? 1 : -1
        return a.category_id - b.category_id
      })
    })
  }

  function handleGoalSaved(saved: GoalOut) {
    setGoals((prev) => [saved, ...prev])
  }

  async function handleConfirmDeleteAssessment() {
    if (!deletingAssessment || !studentId) return
    setDeletingAssessmentBusy(true)
    try {
      await deleteAssessment(studentId, deletingAssessment.id)
      setAssessments((prev) => prev.filter((a) => a.id !== deletingAssessment.id))
      setDeletingAssessment(null)
    } finally {
      setDeletingAssessmentBusy(false)
    }
  }

  const levelById = useMemo(() => {
    const map = new Map<number, LevelOut>()
    Object.values(levelsByCategory)
      .flat()
      .forEach((l) => map.set(l.id, l))
    return map
  }, [levelsByCategory])

  const currentLevelByCategory = useMemo(() => {
    const map = new Map<number, AssessmentOut>()
    // assessments are grouped by category with assessment_date desc within each
    // group, so the first match per category is that student's current (most recent) level.
    for (const a of assessments) {
      if (!map.has(a.category_id)) {
        map.set(a.category_id, a)
      }
    }
    return map
  }, [assessments])

  const currentGoalByCategory = useMemo(() => {
    const map = new Map<number, GoalOut>()
    // goals come back most-recent-first, so the first match per category is current.
    for (const g of goals) {
      if (!map.has(g.category_id)) {
        map.set(g.category_id, g)
      }
    }
    return map
  }, [goals])

  function isGoalAchieved(goal: GoalOut): boolean {
    const targetLevel = levelById.get(goal.target_level_id)
    const current = currentLevelByCategory.get(goal.category_id)
    if (!targetLevel || !current) return false
    const currentLevelNumber = levelById.get(current.level_id)?.level_number ?? 0
    return currentLevelNumber >= targetLevel.level_number
  }

  const progressData = useMemo(() => {
    return categories.map((category) => {
      const levels = levelsByCategory[category.id] ?? []
      const maxLevel = levels.length > 0 ? Math.max(...levels.map((l) => l.level_number)) : 0
      const current = currentLevelByCategory.get(category.id)
      const currentLevelNumber = current ? levelById.get(current.level_id)?.level_number ?? 0 : 0
      const atMax = maxLevel > 0 && currentLevelNumber === maxLevel
      const goal = currentGoalByCategory.get(category.id)
      const targetLevelNumber = goal ? levelById.get(goal.target_level_id)?.level_number : undefined
      return {
        id: category.id,
        category: shortCategoryLabel(category.category_name),
        fullName: category.category_name,
        level: currentLevelNumber,
        maxLevel,
        targetLevelNumber,
        targetDate: goal?.target_date,
        assessed: Boolean(current),
        atMax,
      }
    })
  }, [categories, levelsByCategory, currentLevelByCategory, currentGoalByCategory, levelById])

  if (!student) {
    return null
  }

  return (
    <Stack spacing={3}>
      <MuiLink
        component={Link}
        to="/students"
        underline="hover"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'primary.main', width: 'fit-content' }}
      >
        <ArrowBackIcon fontSize="small" /> Back to students
      </MuiLink>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Avatar
          variant="rounded"
          src={student.photo_url ?? undefined}
          sx={{ width: 64, height: 64, bgcolor: 'grey.200', color: 'text.secondary' }}
        >
          {student.first_name.charAt(0)}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {student.first_name} {student.last_name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Student ID {student.student_id} · {student.grade === 'K' ? 'Kindergarten' : `Grade ${student.grade}`}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
          Edit student
        </Button>
      </Stack>

      <Box>
        <Tabs
          value={progressTab}
          onChange={(_e, val) => setProgressTab(val)}
          sx={{ minHeight: 40, mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab label="Current Progress" value="current" sx={{ minHeight: 40, py: 1 }} />
          <Tab label="Progress Over Time" value="over-time" sx={{ minHeight: 40, py: 1 }} />
        </Tabs>

        {progressTab === 'current' ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
            }}
          >
            {progressData.map((d) => {
              const { icon: CategoryIcon, color } = getCategoryVisual(d.fullName)
              return (
                <Paper
                  key={d.id}
                  sx={{
                    p: 2,
                    borderLeft: '4px solid',
                    borderLeftColor: d.atMax ? 'success.main' : color,
                    '&:hover': { boxShadow: '0 6px 18px rgba(11,61,145,0.12)', transform: 'translateY(-2px)' },
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: `${color}1A`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CategoryIcon sx={{ fontSize: 16, color }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {d.fullName}
                      </Typography>
                    </Stack>
                    <Chip
                      size="small"
                      label={d.assessed ? `${d.level} of ${d.maxLevel}${d.atMax ? ' ✓' : ''}` : 'Not started'}
                      color={d.atMax ? 'success' : d.assessed ? 'secondary' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={d.maxLevel > 0 ? (d.level / d.maxLevel) * 100 : 0}
                    color={d.atMax ? 'success' : 'secondary'}
                    sx={{ height: 6, borderRadius: 3, bgcolor: 'grey.200' }}
                  />
                  {d.targetLevelNumber && d.targetDate && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                      Target: Level {d.targetLevelNumber} by {formatMonthYear(d.targetDate)}
                    </Typography>
                  )}
                </Paper>
              )
            })}
          </Box>
        ) : (
          <ProgressOverTimeChart assessments={assessments} categories={categories} levelById={levelById} goals={goals} />
        )}
      </Box>

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Tabs
          value={historyTab}
          onChange={(_e, val) => setHistoryTab(val)}
          sx={{ minHeight: 40, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab label="Assessment History" value="assessments" sx={{ minHeight: 40, py: 1 }} />
          <Tab label="Goals" value="goals" sx={{ minHeight: 40, py: 1 }} />
        </Tabs>
        {historyTab === 'assessments' && assessments.length > 0 && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddAssessmentOpen(true)}>
            Add assessment
          </Button>
        )}
      </Stack>

      {historyTab === 'assessments' ? (
        assessments.length === 0 ? (
          <Paper sx={{ py: 6, px: 3, textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'secondary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                opacity: 0.5,
              }}
            >
              <AssignmentOutlinedIcon sx={{ color: 'secondary.dark' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              No assessments yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This student has not been assessed in any category.
              <br />
              Add the first assessment to start tracking progress.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddAssessmentOpen(true)}>
              Add assessment
            </Button>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#E3E9F4' }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Date</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Academic Year</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Term</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Category</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Level</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Assessed By</TableCell>
                  <TableCell sx={{ width: 220 }}>Comments</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: '1%', pr: 3 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.map((a) => {
                  const level = levelById.get(a.level_id)
                  const category = categories.find((c) => c.id === a.category_id)
                  return (
                    <TableRow key={a.id} sx={{ '&:nth-of-type(odd)': { bgcolor: '#FAF8F2' } }}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(a.assessment_date)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{a.academic_year}</TableCell>
                      <TableCell>{a.assessment_term}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{category?.category_name ?? a.category_id}</TableCell>
                      <TableCell>{level ? `${level.level_number} — ${level.description}` : a.level_id}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{a.assessed_by}</TableCell>
                      <TableCell sx={{ width: 220 }}>{a.comments}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', width: '1%', pr: 3 }}>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Edit assessment">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => setEditingAssessment(a)}
                              sx={{ border: '1px solid', borderColor: 'warning.main' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete assessment">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeletingAssessment(a)}
                              sx={{ border: '1px solid', borderColor: 'error.main' }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : goals.length === 0 ? (
        <Paper sx={{ py: 6, px: 3, textAlign: 'center' }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: 'secondary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              opacity: 0.5,
            }}
          >
            <AssignmentOutlinedIcon sx={{ color: 'secondary.dark' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            No targets set yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set a target for a category when adding an assessment.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#E3E9F4' }}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>Date Set</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>Category</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>Target Level</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>Target Date</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  Achieved
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {goals.map((g) => {
                const category = categories.find((c) => c.id === g.category_id)
                const targetLevel = levelById.get(g.target_level_id)
                const achieved = isGoalAchieved(g)
                return (
                  <TableRow key={g.id} sx={{ '&:nth-of-type(odd)': { bgcolor: '#FAF8F2' } }}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(g.created_at.slice(0, 10))}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{category?.category_name ?? g.category_id}</TableCell>
                    <TableCell>
                      {targetLevel ? `${targetLevel.level_number} — ${targetLevel.description}` : g.target_level_id}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(g.target_date)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title={achieved ? 'Target reached' : 'Not reached yet'}>
                        <span style={{ display: 'inline-flex' }}>
                          {achieved ? (
                            <CheckCircleIcon fontSize="small" sx={{ color: '#0ca30c' }} />
                          ) : (
                            <RadioButtonUncheckedIcon fontSize="small" sx={{ color: '#c3c2b7' }} />
                          )}
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AddEditStudentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        student={student}
        onSaved={(updated) => setStudent(updated)}
      />
      <AssessmentModal
        open={addAssessmentOpen}
        onClose={() => setAddAssessmentOpen(false)}
        studentId={student.student_id}
        onSaved={handleAssessmentSaved}
        onGoalSaved={handleGoalSaved}
        goals={goals}
      />
      <AssessmentModal
        open={editingAssessment !== null}
        onClose={() => setEditingAssessment(null)}
        studentId={student.student_id}
        assessment={editingAssessment}
        onSaved={handleAssessmentSaved}
        onGoalSaved={handleGoalSaved}
        goals={goals}
      />

      <Dialog open={deletingAssessment !== null} onClose={() => setDeletingAssessment(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete assessment?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deletingAssessment && (
              <>
                This permanently removes the{' '}
                <strong>{categories.find((c) => c.id === deletingAssessment.category_id)?.category_name}</strong>{' '}
                assessment from {formatDate(deletingAssessment.assessment_date)}. This cannot be undone.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeletingAssessment(null)} disabled={deletingAssessmentBusy}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteAssessment}
            color="error"
            variant="contained"
            disabled={deletingAssessmentBusy}
          >
            {deletingAssessmentBusy ? 'Deleting…' : 'Delete assessment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
