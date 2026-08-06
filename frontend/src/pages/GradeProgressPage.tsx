import { useEffect, useMemo, useState } from 'react'
import { Box, Chip, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { getGradeProgress } from '../api/grades'
import { listSchools } from '../api/schools'
import { GRADE_OPTIONS, type GradeProgressItem, type SchoolOut } from '../api/types'
import { getCategoryVisual } from '../utils/categoryVisuals'
import { useAuth } from '../context/AuthContext'

export function GradeProgressPage() {
  const { isAdmin, schoolId: ownSchoolId, schoolName: ownSchoolName } = useAuth()
  const [schools, setSchools] = useState<SchoolOut[]>([])
  const [schoolFilter, setSchoolFilter] = useState<number | ''>('')
  const [grade, setGrade] = useState<string>(GRADE_OPTIONS[5])
  const [progress, setProgress] = useState<GradeProgressItem[]>([])

  useEffect(() => {
    listSchools().then(setSchools)
  }, [])

  const selectedSchool = isAdmin
    ? schools.find((s) => s.id === schoolFilter)
    : schools.find((s) => s.id === ownSchoolId)

  const availableGrades = useMemo(() => {
    if (!selectedSchool) return GRADE_OPTIONS
    return GRADE_OPTIONS.filter((g) => {
      const n = Number(g)
      return !Number.isNaN(n) && n >= selectedSchool.min_grade && n <= selectedSchool.max_grade
    })
  }, [selectedSchool])

  useEffect(() => {
    if (availableGrades.length > 0 && !(availableGrades as string[]).includes(grade)) {
      setGrade(availableGrades[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableGrades])

  useEffect(() => {
    if (!grade) return
    getGradeProgress(grade, isAdmin && schoolFilter !== '' ? schoolFilter : undefined).then(setProgress)
  }, [grade, isAdmin, schoolFilter])

  const gradeLabel = grade === 'K' ? 'Kindergarten' : `Grade ${grade}`
  const schoolLabel = isAdmin ? (schoolFilter === '' ? undefined : selectedSchool?.name) : ownSchoolName

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Grade Progress
        </Typography>
        <Stack direction="row" spacing={1.5}>
          {isAdmin && (
            <TextField
              select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value === '' ? '' : Number(e.target.value))}
              slotProps={{ select: { displayEmpty: true } }}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All Schools</MenuItem>
              {schools.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField select value={grade} onChange={(e) => setGrade(e.target.value)} sx={{ minWidth: 160 }}>
            {availableGrades.map((g) => (
              <MenuItem key={g} value={g}>
                {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Average achievement level per category, across all {gradeLabel} students
        {schoolLabel ? ` in ${schoolLabel}` : ''}.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        {progress.map((p) => {
          const pct = p.average_level != null && p.max_level > 0 ? (p.average_level / p.max_level) * 100 : 0
          const atMax = p.average_level != null && p.max_level > 0 && p.average_level >= p.max_level
          const { icon: CategoryIcon, color } = getCategoryVisual(p.category_name)
          return (
            <Paper
              key={p.category_id}
              sx={{
                p: 2,
                borderLeft: '4px solid',
                borderLeftColor: atMax ? 'success.main' : color,
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
                    {p.category_name}
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  label={
                    p.average_level != null
                      ? `${p.average_level.toFixed(1)} / ${p.max_level}${atMax ? ' ✓' : ''}`
                      : `— / ${p.max_level}`
                  }
                  color={atMax ? 'success' : undefined}
                  sx={{
                    fontWeight: 600,
                    ...(atMax || p.average_level == null ? {} : { bgcolor: `${color}1A`, color }),
                  }}
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': { bgcolor: atMax ? 'success.main' : color },
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {p.average_level != null
                  ? `${p.student_count} student${p.student_count === 1 ? '' : 's'} assessed`
                  : 'No assessments yet'}
              </Typography>
            </Paper>
          )
        })}
      </Box>
    </Stack>
  )
}
