import { useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RestoreIcon from '@mui/icons-material/Restore'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import {
  createCategory,
  createLevel,
  deactivateCategory,
  deactivateLevel,
  listCategories,
  listLevels,
  restoreCategory,
  restoreLevel,
  updateCategory,
  updateLevel,
} from '../api/categories'
import type { CategoryOut, LevelOut } from '../api/types'
import { getCategoryVisual } from '../utils/categoryVisuals'

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data?.detail) {
    return String(err.response.data.detail)
  }
  return fallback
}

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryOut[]>([])
  const [levelsByCategory, setLevelsByCategory] = useState<Record<number, LevelOut[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [categoryDialog, setCategoryDialog] = useState<{ mode: 'add' | 'edit'; category?: CategoryOut } | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)

  const [levelDialog, setLevelDialog] = useState<{ mode: 'add' | 'edit'; categoryId: number; level?: LevelOut } | null>(
    null,
  )
  const [levelNumber, setLevelNumber] = useState('')
  const [levelDescription, setLevelDescription] = useState('')
  const [savingLevel, setSavingLevel] = useState(false)

  async function loadCategories() {
    setLoading(true)
    setError(null)
    try {
      const data = await listCategories(true)
      setCategories(data)
    } catch {
      setError('Unable to load categories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadLevels(categoryId: number) {
    const data = await listLevels(categoryId, true)
    setLevelsByCategory((prev) => ({ ...prev, [categoryId]: data }))
  }

  function openAddCategory() {
    setCategoryName('')
    setCategoryDialog({ mode: 'add' })
  }

  function openEditCategory(category: CategoryOut) {
    setCategoryName(category.category_name)
    setCategoryDialog({ mode: 'edit', category })
  }

  async function handleSaveCategory() {
    if (!categoryDialog || !categoryName.trim()) return
    setSavingCategory(true)
    setError(null)
    try {
      if (categoryDialog.mode === 'add') {
        const created = await createCategory({ category_name: categoryName.trim() })
        setCategories((prev) => [...prev, created])
      } else if (categoryDialog.category) {
        const updated = await updateCategory(categoryDialog.category.id, { category_name: categoryName.trim() })
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      }
      setCategoryDialog(null)
    } catch (err) {
      setError(errorMessage(err, 'Unable to save category.'))
    } finally {
      setSavingCategory(false)
    }
  }

  async function handleToggleCategoryActive(category: CategoryOut) {
    setError(null)
    try {
      if (category.active) {
        await deactivateCategory(category.id)
        setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, active: false } : c)))
      } else {
        const updated = await restoreCategory(category.id)
        setCategories((prev) => prev.map((c) => (c.id === category.id ? updated : c)))
      }
    } catch (err) {
      setError(errorMessage(err, 'Unable to update category.'))
    }
  }

  function openAddLevel(categoryId: number) {
    setLevelNumber('')
    setLevelDescription('')
    setLevelDialog({ mode: 'add', categoryId })
  }

  function openEditLevel(categoryId: number, level: LevelOut) {
    setLevelNumber(String(level.level_number))
    setLevelDescription(level.description)
    setLevelDialog({ mode: 'edit', categoryId, level })
  }

  async function handleSaveLevel() {
    if (!levelDialog) return
    const parsedLevel = Number(levelNumber)
    if (!levelNumber.trim() || Number.isNaN(parsedLevel) || !levelDescription.trim()) return

    setSavingLevel(true)
    setError(null)
    try {
      if (levelDialog.mode === 'add') {
        const created = await createLevel(levelDialog.categoryId, {
          level_number: parsedLevel,
          description: levelDescription.trim(),
        })
        setLevelsByCategory((prev) => ({
          ...prev,
          [levelDialog.categoryId]: [...(prev[levelDialog.categoryId] ?? []), created].sort(
            (a, b) => a.level_number - b.level_number,
          ),
        }))
      } else if (levelDialog.level) {
        const updated = await updateLevel(levelDialog.categoryId, levelDialog.level.id, {
          level_number: parsedLevel,
          description: levelDescription.trim(),
        })
        setLevelsByCategory((prev) => ({
          ...prev,
          [levelDialog.categoryId]: (prev[levelDialog.categoryId] ?? [])
            .map((l) => (l.id === updated.id ? updated : l))
            .sort((a, b) => a.level_number - b.level_number),
        }))
      }
      setLevelDialog(null)
    } catch (err) {
      setError(errorMessage(err, 'Unable to save level.'))
    } finally {
      setSavingLevel(false)
    }
  }

  async function handleToggleLevelActive(categoryId: number, level: LevelOut) {
    setError(null)
    try {
      if (level.active) {
        await deactivateLevel(categoryId, level.id)
        setLevelsByCategory((prev) => ({
          ...prev,
          [categoryId]: (prev[categoryId] ?? []).map((l) => (l.id === level.id ? { ...l, active: false } : l)),
        }))
      } else {
        const updated = await restoreLevel(categoryId, level.id)
        setLevelsByCategory((prev) => ({
          ...prev,
          [categoryId]: (prev[categoryId] ?? []).map((l) => (l.id === level.id ? updated : l)),
        }))
      }
    } catch (err) {
      setError(errorMessage(err, 'Unable to update level.'))
    }
  }

  const activeCount = categories.filter((c) => c.active).length
  const inactiveCount = categories.length - activeCount

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Manage Categories
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {activeCount} active {activeCount === 1 ? 'category' : 'categories'}
            {inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ''}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAddCategory}>
          Add Category
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack spacing={2}>
        {categories.map((category) => {
          const { icon: CategoryIcon, color } = getCategoryVisual(category.category_name)
          return (
            <Accordion
              key={category.id}
              disableGutters
              elevation={0}
              onChange={(_, expanded) => {
                if (expanded && !levelsByCategory[category.id]) {
                  loadLevels(category.id)
                }
              }}
              sx={{
                opacity: category.active ? 1 : 0.6,
                border: '1px solid',
                borderColor: 'divider',
                borderLeft: '4px solid',
                borderLeftColor: color,
                borderRadius: 2,
                overflow: 'hidden',
                '&:before': { display: 'none' },
                '&:hover': { boxShadow: '0 4px 14px rgba(11,61,145,0.10)' },
                transition: 'box-shadow 0.15s ease',
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexGrow: 1, pr: 8 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: `${color}1A`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CategoryIcon sx={{ fontSize: 18, color }} />
                    </Box>
                    <Typography sx={{ fontWeight: 600, flexGrow: 1 }}>{category.category_name}</Typography>
                    {!category.active && <Chip size="small" label="Inactive" />}
                  </Stack>
                </AccordionSummary>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    right: 44,
                    transform: 'translateY(-50%)',
                  }}
                >
                <Tooltip title="Edit name">
                  <IconButton
                    size="small"
                    onClick={() => openEditCategory(category)}
                    sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={category.active ? 'Deactivate category' : 'Restore category'}>
                  <IconButton
                    size="small"
                    color={category.active ? 'error' : 'success'}
                    onClick={() => handleToggleCategoryActive(category)}
                    sx={{
                      border: '1px solid',
                      borderColor: category.active ? 'error.main' : 'success.main',
                      bgcolor: 'background.paper',
                    }}
                  >
                    {category.active ? <DeleteOutlineIcon fontSize="small" /> : <RestoreIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                </Stack>
              </Box>
              <AccordionDetails sx={{ bgcolor: '#FAF8F2', borderTop: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={1.5}>
                    <Box>
                      <Button size="small" startIcon={<AddIcon />} onClick={() => openAddLevel(category.id)}>
                        Add Level
                      </Button>
                    </Box>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#E3E9F4' }}>
                            <TableCell sx={{ width: '10%' }}>Level</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell sx={{ width: '15%' }}>Status</TableCell>
                            <TableCell sx={{ width: '1%' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(levelsByCategory[category.id] ?? []).map((level) => (
                            <TableRow
                              key={level.id}
                              sx={{ opacity: level.active ? 1 : 0.6, bgcolor: 'background.paper' }}
                            >
                              <TableCell sx={{ fontWeight: 600 }}>{level.level_number}</TableCell>
                              <TableCell>{level.description}</TableCell>
                              <TableCell>
                                {level.active ? (
                                  <Chip size="small" label="Active" color="success" variant="outlined" />
                                ) : (
                                  <Chip size="small" label="Inactive" variant="outlined" />
                                )}
                              </TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                <Tooltip title="Edit level">
                                  <IconButton size="small" onClick={() => openEditLevel(category.id, level)}>
                                    <EditOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={level.active ? 'Deactivate level' : 'Restore level'}>
                                  <IconButton
                                    size="small"
                                    color={level.active ? 'error' : 'success'}
                                    onClick={() => handleToggleLevelActive(category.id, level)}
                                  >
                                    {level.active ? (
                                      <DeleteOutlineIcon fontSize="small" />
                                    ) : (
                                      <RestoreIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(levelsByCategory[category.id] ?? []).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4}>
                                <Box sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>No levels yet.</Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Stack>
                </AccordionDetails>
            </Accordion>
          )
        })}
        {categories.length === 0 && !loading && (
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>No categories found.</Box>
        )}
      </Stack>

      <Dialog open={categoryDialog !== null} onClose={() => setCategoryDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {categoryDialog?.mode === 'add' ? 'Add Category' : 'Edit Category'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Category name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCategoryDialog(null)} disabled={savingCategory}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveCategory}
            variant="contained"
            disabled={savingCategory || !categoryName.trim()}
          >
            {savingCategory ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={levelDialog !== null} onClose={() => setLevelDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{levelDialog?.mode === 'add' ? 'Add Level' : 'Edit Level'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              type="number"
              label="Level number"
              value={levelNumber}
              onChange={(e) => setLevelNumber(e.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Description"
              value={levelDescription}
              onChange={(e) => setLevelDescription(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setLevelDialog(null)} disabled={savingLevel}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveLevel}
            variant="contained"
            disabled={savingLevel || !levelNumber.trim() || !levelDescription.trim()}
          >
            {savingLevel ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
