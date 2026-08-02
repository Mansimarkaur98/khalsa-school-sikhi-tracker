import { useEffect, useState } from 'react'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { deleteUser, listUsers, updateUserSchool } from '../api/admin'
import { listSchools } from '../api/schools'
import type { AdminUserOut, SchoolOut } from '../api/types'
import { useAuth } from '../context/AuthContext'

export function AdminUsersPage() {
  const { email: currentUserEmail } = useAuth()
  const [users, setUsers] = useState<AdminUserOut[]>([])
  const [schools, setSchools] = useState<SchoolOut[]>([])
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<number | null>(null)
  const [deletingUser, setDeletingUser] = useState<AdminUserOut | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingSchoolChange, setPendingSchoolChange] = useState<{ user: AdminUserOut; newSchoolId: number } | null>(
    null,
  )

  async function loadAll() {
    setLoading(true)
    try {
      const [userData, schoolData] = await Promise.all([listUsers(), listSchools()])
      setUsers(userData)
      setSchools(schoolData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleSchoolChange(userId: number, schoolId: number) {
    setSavingUserId(userId)
    setError(null)
    try {
      const updated = await updateUserSchool(userId, { school_id: schoolId })
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
    } catch {
      setError('Unable to update school. Please try again.')
    } finally {
      setSavingUserId(null)
    }
  }

  async function handleConfirmSchoolChange() {
    if (!pendingSchoolChange) return
    const { user, newSchoolId } = pendingSchoolChange
    setPendingSchoolChange(null)
    await handleSchoolChange(user.id, newSchoolId)
  }

  async function handleConfirmDelete() {
    if (!deletingUser) return
    setDeleting(true)
    setError(null)
    try {
      await deleteUser(deletingUser.id)
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id))
      setDeletingUser(null)
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setError(String(err.response.data.detail))
      } else {
        setError('Unable to delete this account. Please try again.')
      }
      setDeletingUser(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 600 }}>
        Manage Users
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#E3E9F4' }}>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Email</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>School</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Role</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Verified</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: '1%', pr: 3 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} sx={{ '&:nth-of-type(odd)': { bgcolor: '#FAF8F2' } }}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {u.first_name} {u.last_name}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{u.email}</TableCell>
                <TableCell sx={{ minWidth: 220 }}>
                  <TextField
                    select
                    size="small"
                    value={u.school_id ?? ''}
                    disabled={savingUserId === u.id}
                    onChange={(e) => {
                      const newSchoolId = Number(e.target.value)
                      if (newSchoolId === u.school_id) return
                      setPendingSchoolChange({ user: u, newSchoolId })
                    }}
                    fullWidth
                  >
                    {schools.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Chip
                    size="small"
                    label={u.role}
                    color={u.role === 'admin' ? 'secondary' : 'default'}
                    sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Chip
                    size="small"
                    label={u.email_verified ? 'Verified' : 'Unverified'}
                    color={u.email_verified ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: '1%', pr: 3 }}>
                  <Tooltip title={u.email === currentUserEmail ? 'You cannot delete your own account' : 'Delete account'}>
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={u.email === currentUserEmail}
                        onClick={() => setDeletingUser(u)}
                        sx={{ border: '1px solid', borderColor: 'error.main' }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>No user accounts found.</Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={pendingSchoolChange !== null}
        onClose={() => setPendingSchoolChange(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Change this user's school?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingSchoolChange && (
              <>
                Move{' '}
                <strong>
                  {pendingSchoolChange.user.first_name} {pendingSchoolChange.user.last_name}
                </strong>{' '}
                from{' '}
                <strong>
                  {schools.find((s) => s.id === pendingSchoolChange.user.school_id)?.name ?? 'no school'}
                </strong>{' '}
                to <strong>{schools.find((s) => s.id === pendingSchoolChange.newSchoolId)?.name}</strong>? They will
                only see and manage that school's students afterward.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setPendingSchoolChange(null)} disabled={savingUserId !== null}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSchoolChange} variant="contained" disabled={savingUserId !== null}>
            {savingUserId !== null ? 'Saving…' : 'Confirm change'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deletingUser !== null} onClose={() => setDeletingUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete this account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deletingUser && (
              <>
                This permanently deletes the account for{' '}
                <strong>
                  {deletingUser.first_name} {deletingUser.last_name}
                </strong>{' '}
                ({deletingUser.email}). This cannot be undone.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeletingUser(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
