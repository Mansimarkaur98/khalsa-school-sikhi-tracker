import { useEffect, useMemo, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import ClearIcon from '@mui/icons-material/Clear'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/Edit'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import SchoolIcon from '@mui/icons-material/School'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { isAxiosError } from 'axios'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  archiveStudent,
  getStudent,
  permanentlyDeleteStudent,
  restoreStudent,
  searchStudents,
} from '../api/students'
import { GRADE_OPTIONS, type StudentListItem, type StudentOut } from '../api/types'
import { AddEditStudentModal } from '../components/AddEditStudentModal'

const pillFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' },
}

export function StudentListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view: 'active' | 'archived' = searchParams.get('view') === 'archived' ? 'archived' : 'active'
  const [studentId, setStudentId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [grade, setGrade] = useState('')
  const [allResults, setAllResults] = useState<StudentListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentOut | null>(null)
  const [archivingStudent, setArchivingStudent] = useState<StudentListItem | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<StudentListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function runSearch() {
    setLoading(true)
    try {
      const results = await searchStudents({
        student_id: studentId || undefined,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        grade: grade || undefined,
        include_inactive: true,
      })
      setAllResults(results)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(runSearch, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, firstName, lastName, grade])

  const students = useMemo(
    () => allResults.filter((s) => s.active_status === (view === 'active')),
    [allResults, view],
  )

  function handleStudentAdded(student: StudentOut) {
    setAllResults((prev) => [...prev, { ...student }])
  }

  function handleStudentEdited(student: StudentOut) {
    // Match on the pre-edit ID, not the (possibly just-changed) new one, otherwise
    // renaming a student's ID leaves the old row in the list untouched.
    const originalId = editingStudent?.student_id
    setAllResults((prev) => prev.map((s) => (s.student_id === originalId ? { ...s, ...student } : s)))
  }

  async function handleEditClick(studentId: string) {
    const full = await getStudent(studentId)
    setEditingStudent(full)
  }

  function handleClearFilters() {
    setStudentId('')
    setFirstName('')
    setLastName('')
    setGrade('')
  }

  async function handleConfirmArchive() {
    if (!archivingStudent) return
    setArchiving(true)
    try {
      await archiveStudent(archivingStudent.student_id)
      setAllResults((prev) =>
        prev.map((s) => (s.student_id === archivingStudent.student_id ? { ...s, active_status: false } : s)),
      )
      setArchivingStudent(null)
    } finally {
      setArchiving(false)
    }
  }

  async function handleRestore(student: StudentListItem) {
    setRestoringId(student.student_id)
    try {
      await restoreStudent(student.student_id)
      setAllResults((prev) =>
        prev.map((s) => (s.student_id === student.student_id ? { ...s, active_status: true } : s)),
      )
    } finally {
      setRestoringId(null)
    }
  }

  async function handleConfirmPermanentDelete() {
    if (!deletingStudent) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await permanentlyDeleteStudent(deletingStudent.student_id)
      setAllResults((prev) => prev.filter((s) => s.student_id !== deletingStudent.student_id))
      setDeletingStudent(null)
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setDeleteError(
          typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : 'This student has assessment history and cannot be permanently deleted.',
        )
      } else {
        setDeleteError('Unable to delete this student. Please try again.')
      }
    } finally {
      setDeleting(false)
    }
  }

  const hasFilters = Boolean(studentId || firstName || lastName || grade)

  const gradeCount = useMemo(() => new Set(students.map((s) => s.grade)).size, [students])

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {view === 'archived' ? 'Archived Students' : 'Active Students'}
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Paper sx={{ p: 2, flex: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'rgba(11,61,145,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PeopleAltIcon sx={{ color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {students.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {view === 'active' ? 'Active student' : 'Archived student'}
              {students.length === 1 ? '' : 's'} shown
            </Typography>
          </Box>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'rgba(201,162,39,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <SchoolIcon sx={{ color: 'secondary.dark' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {gradeCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Grade{gradeCount === 1 ? '' : 's'} represented
            </Typography>
          </Box>
        </Paper>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
        <TextField
          placeholder="Student ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          size="small"
          fullWidth
          helperText="Start typing to search — results update automatically."
          slotProps={{ formHelperText: { sx: { whiteSpace: 'nowrap' } } }}
          sx={pillFieldSx}
        />
        <TextField
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          size="small"
          fullWidth
          sx={pillFieldSx}
        />
        <TextField
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          size="small"
          fullWidth
          sx={pillFieldSx}
        />
        <TextField
          select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          size="small"
          slotProps={{ select: { displayEmpty: true } }}
          sx={{ minWidth: 140, ...pillFieldSx }}
        >
          <MenuItem value="">All grades</MenuItem>
          {GRADE_OPTIONS.map((g) => (
            <MenuItem key={g} value={g}>
              {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          startIcon={<ClearIcon />}
          onClick={handleClearFilters}
          disabled={!hasFilters}
          sx={{ whiteSpace: 'nowrap', borderRadius: 999, flexShrink: 0 }}
        >
          Clear
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ whiteSpace: 'nowrap', borderRadius: 999, flexShrink: 0 }}
        >
          Add student
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#E3E9F4' }}>
              <TableCell />
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Student ID</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>First Name</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Last Name</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Grade</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: '1%', pr: 3 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.student_id} hover sx={{ '&:nth-of-type(odd)': { bgcolor: '#FAF8F2' } }}>
                <TableCell sx={{ width: 56, py: 1 }}>
                  <Avatar
                    variant="rounded"
                    src={s.photo_url ?? undefined}
                    sx={{ width: 36, height: 36, bgcolor: 'grey.200', color: 'text.secondary' }}
                  >
                    {s.first_name.charAt(0)}
                  </Avatar>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', py: 1 }}>{s.student_id}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', py: 1 }}>{s.first_name}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', py: 1 }}>{s.last_name}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', py: 1 }}>{s.grade === 'K' ? 'Kindergarten' : `Grade ${s.grade}`}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: '1%', pr: 3, py: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<VisibilityIcon fontSize="small" />}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/students/${s.student_id}`)
                      }}
                      sx={{ borderRadius: 999 }}
                    >
                      View
                    </Button>
                    {view === 'active' ? (
                      <>
                        <Tooltip title="Edit student">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditClick(s.student_id)
                            }}
                            sx={{ border: '1px solid', borderColor: 'warning.main' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Archive student">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              setArchivingStudent(s)
                            }}
                            sx={{ border: '1px solid', borderColor: 'text.secondary', color: 'text.secondary' }}
                          >
                            <ArchiveOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip title="Restore student">
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={restoringId === s.student_id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRestore(s)
                            }}
                            sx={{ border: '1px solid', borderColor: 'primary.main' }}
                          >
                            <UnarchiveOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete permanently">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteError(null)
                              setDeletingStudent(s)
                            }}
                            sx={{ border: '1px solid', borderColor: 'error.main' }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {students.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                    {view === 'active' ? 'No students found.' : 'No archived students.'}
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <AddEditStudentModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={handleStudentAdded} />
      <AddEditStudentModal
        open={editingStudent !== null}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        onSaved={handleStudentEdited}
      />

      <Dialog open={archivingStudent !== null} onClose={() => setArchivingStudent(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Archive student?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {archivingStudent && (
              <>
                This removes <strong>{archivingStudent.first_name} {archivingStudent.last_name}</strong> (ID{' '}
                {archivingStudent.student_id}) from the active student list. Their assessment history is kept, and
                they can be restored any time from the Archived view.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setArchivingStudent(null)} disabled={archiving}>
            Cancel
          </Button>
          <Button onClick={handleConfirmArchive} variant="contained" disabled={archiving}>
            {archiving ? 'Archiving…' : 'Archive student'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deletingStudent !== null}
        onClose={() => (!deleting ? setDeletingStudent(null) : undefined)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Permanently delete student?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
            <DialogContentText>
              {deletingStudent && (
                <>
                  This <strong>permanently</strong> deletes{' '}
                  <strong>{deletingStudent.first_name} {deletingStudent.last_name}</strong> (ID{' '}
                  {deletingStudent.student_id}) and cannot be undone. Only allowed if they have no assessment
                  history — otherwise, keep them archived.
                </>
              )}
            </DialogContentText>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeletingStudent(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleConfirmPermanentDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
