import { useMemo, useState } from 'react'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AssessmentOut, CategoryOut, LevelOut } from '../api/types'
import { shortCategoryLabel } from '../utils/categoryLabels'
import { getCategoryVisual } from '../utils/categoryVisuals'

interface ProgressOverTimeChartProps {
  assessments: AssessmentOut[]
  categories: CategoryOut[]
  levelById: Map<number, LevelOut>
}

type ChartRow = { period: string; sortKey: number } & Record<string, number | string | null>

export function ProgressOverTimeChart({ assessments, categories, levelById }: ProgressOverTimeChartProps) {
  const [hiddenCategories, setHiddenCategories] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  const assessedCategoryIds = useMemo(
    () => new Set(assessments.map((a) => a.category_id)),
    [assessments],
  )

  const chartCategories = useMemo(
    () => categories.filter((c) => assessedCategoryIds.has(c.id)),
    [categories, assessedCategoryIds],
  )

  const chartData = useMemo(() => {
    // Group by academic year + term, keeping the most recent assessment per category within each period.
    const periods = new Map<string, { sortKey: number; byCategory: Map<number, AssessmentOut> }>()

    for (const a of assessments) {
      const periodKey = `${a.academic_year}-T${a.assessment_term}`
      const startYear = parseInt(a.academic_year.slice(0, 4), 10)
      const sortKey = startYear * 10 + a.assessment_term

      if (!periods.has(periodKey)) {
        periods.set(periodKey, { sortKey, byCategory: new Map() })
      }
      const period = periods.get(periodKey)!
      const existing = period.byCategory.get(a.category_id)
      if (!existing || a.assessment_date > existing.assessment_date) {
        period.byCategory.set(a.category_id, a)
      }
    }

    const rows: ChartRow[] = Array.from(periods.entries()).map(([periodKey, { sortKey, byCategory }]) => {
      const [year, term] = periodKey.split('-T')
      const row: ChartRow = { period: `T${term} ${year}`, sortKey }
      for (const category of chartCategories) {
        const a = byCategory.get(category.id)
        row[shortCategoryLabel(category.category_name)] = a ? levelById.get(a.level_id)?.level_number ?? null : null
      }
      return row
    })

    return rows.sort((a, b) => a.sortKey - b.sortKey)
  }, [assessments, chartCategories, levelById])

  function toggleCategory(categoryId: number) {
    setHiddenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  if (chartCategories.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          This student has not been assessed in any category yet.
        </Typography>
      </Paper>
    )
  }

  if (chartData.length < 2) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Add assessments across more terms to see a progress trend here.
        </Typography>
      </Paper>
    )
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Level achieved per category, by term and academic year.
          {viewMode === 'chart' && ' Click a legend item to show or hide it.'}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={viewMode}
          onChange={(_e, val) => val && setViewMode(val)}
        >
          <ToggleButton value="chart" aria-label="Chart view">
            <BarChartOutlinedIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="table" aria-label="Table view">
            <TableChartOutlinedIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {viewMode === 'chart' ? (
        <Paper sx={{ p: { xs: 1, sm: 3 } }}>
          <Box sx={{ width: '100%', height: 360 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D2" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend
                  onClick={(e) => {
                    const category = chartCategories.find((c) => shortCategoryLabel(c.category_name) === e.dataKey)
                    if (category) toggleCategory(category.id)
                  }}
                  wrapperStyle={{ cursor: 'pointer', fontSize: 13 }}
                />
                {chartCategories.map((category) => {
                  const { color } = getCategoryVisual(category.category_name)
                  const key = shortCategoryLabel(category.category_name)
                  return (
                    <Line
                      key={category.id}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                      hide={hiddenCategories.has(category.id)}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#E3E9F4' }}>
                <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Term</TableCell>
                {chartCategories.map((category) => (
                  <TableCell key={category.id} align="center" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {shortCategoryLabel(category.category_name)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {chartData.map((row) => (
                <TableRow key={row.period} sx={{ '&:nth-of-type(odd)': { bgcolor: '#FAF8F2' } }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.period}</TableCell>
                  {chartCategories.map((category) => {
                    const value = row[shortCategoryLabel(category.category_name)]
                    return (
                      <TableCell key={category.id} align="center">
                        {value == null ? '—' : `${value}/10`}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
