import { useMemo, useState, type Key } from 'react'
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
  type LegendType,
} from 'recharts'
import type { AssessmentOut, CategoryOut, GoalOut, LevelOut } from '../api/types'
import { shortCategoryLabel } from '../utils/categoryLabels'
import { getCategoryVisual, type MarkerShape } from '../utils/categoryVisuals'

interface ProgressOverTimeChartProps {
  assessments: AssessmentOut[]
  categories: CategoryOut[]
  levelById: Map<number, LevelOut>
  goals: GoalOut[]
}

type ChartRow = { period: string; sortKey: number } & Record<string, number | string | null>

// With 8 categories in play, no set of 8 truly distinct hues clears
// colorblind-safe separation for every pair (validated — see
// categoryVisuals.tsx) — so each category also gets a distinct marker shape.
// That's the channel that actually carries "which line is this" once two
// colors get hard to tell apart.
function starPoints(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const step = Math.PI / points
  const coords: string[] = []
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = i * step - Math.PI / 2
    coords.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return coords.join(' ')
}

function renderShapeDot(shape: MarkerShape, color: string, size = 4) {
  return (props: { cx?: number; cy?: number; key?: Key | null }) => {
    const { cx, cy, key } = props
    if (cx == null || cy == null) return <g key={key} />
    const fillProps = { fill: '#fff', stroke: color, strokeWidth: 1.6 }
    switch (shape) {
      case 'square':
        return <rect key={key} x={cx - size} y={cy - size} width={size * 2} height={size * 2} {...fillProps} />
      case 'triangle': {
        const h = size * 1.3
        const points = `${cx},${cy - h} ${cx - h},${cy + h * 0.7} ${cx + h},${cy + h * 0.7}`
        return <polygon key={key} points={points} {...fillProps} />
      }
      case 'triangleDown': {
        const h = size * 1.3
        const points = `${cx},${cy + h} ${cx - h},${cy - h * 0.7} ${cx + h},${cy - h * 0.7}`
        return <polygon key={key} points={points} {...fillProps} />
      }
      case 'diamond': {
        const d = size * 1.4
        const points = `${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`
        return <polygon key={key} points={points} {...fillProps} />
      }
      case 'star':
        return <polygon key={key} points={starPoints(cx, cy, size * 1.5, size * 0.6, 5)} {...fillProps} />
      case 'cross': {
        const s = size
        const t = size * 0.55
        const points = [
          [cx - t, cy - s], [cx + t, cy - s], [cx + t, cy - t],
          [cx + s, cy - t], [cx + s, cy + t], [cx + t, cy + t],
          [cx + t, cy + s], [cx - t, cy + s], [cx - t, cy + t],
          [cx - s, cy + t], [cx - s, cy - t], [cx - t, cy - t],
        ]
          .map((p) => p.join(','))
          .join(' ')
        return <polygon key={key} points={points} {...fillProps} />
      }
      case 'wye': {
        const s = size * 1.4
        const angles = [-90, 30, 150].map((a) => (a * Math.PI) / 180)
        const d = angles.map((a) => `M${cx},${cy} L${cx + s * Math.cos(a)},${cy + s * Math.sin(a)}`).join(' ')
        return <path key={key} d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
      }
      case 'circle':
      default:
        return <circle key={key} cx={cx} cy={cy} r={size} {...fillProps} />
    }
  }
}

// Recharts' built-in legend icons cover 7 of d3's symbol shapes; triangleDown
// isn't one of them, so its legend swatch falls back to a plain triangle
// (the plotted dot still uses the real inverted shape).
function legendIconFor(shape: MarkerShape): LegendType {
  return shape === 'triangleDown' ? 'triangle' : shape
}

// Mirrors backend/app/term_utils.py's compute_term_and_year, for placing a
// goal's target_date on the same term/academic-year x-axis as assessments.
// Unlike assessment dates, a target_date can legally fall in Jul/Aug (no
// active term then) — those trail onto the term-3 bucket just finished.
function termPeriodFor(dateStr: string): { period: string; sortKey: number } {
  const [yearStr, monthStr] = dateStr.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  let term: number
  let startYear: number
  if (month >= 9) {
    term = 1
    startYear = year
  } else if (month <= 3) {
    term = 2
    startYear = year - 1
  } else {
    term = 3
    startYear = year - 1
  }
  return { period: `T${term} ${startYear}-${startYear + 1}`, sortKey: startYear * 10 + term }
}

export function ProgressOverTimeChart({ assessments, categories, levelById, goals }: ProgressOverTimeChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  const assessedCategoryIds = useMemo(
    () => new Set(assessments.map((a) => a.category_id)),
    [assessments],
  )

  const chartCategories = useMemo(
    () => categories.filter((c) => assessedCategoryIds.has(c.id)),
    [categories, assessedCategoryIds],
  )

  const currentGoalByCategory = useMemo(() => {
    const map = new Map<number, GoalOut>()
    for (const g of goals) {
      if (!map.has(g.category_id)) map.set(g.category_id, g)
    }
    return map
  }, [goals])

  const { chartData, targetKeys } = useMemo(() => {
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

    const rows = new Map<number, ChartRow>() // keyed by sortKey
    for (const [periodKey, { sortKey, byCategory }] of periods) {
      const [year, term] = periodKey.split('-T')
      const row: ChartRow = { period: `T${term} ${year}`, sortKey }
      for (const category of chartCategories) {
        const a = byCategory.get(category.id)
        row[shortCategoryLabel(category.category_name)] = a ? levelById.get(a.level_id)?.level_number ?? null : null
      }
      rows.set(sortKey, row)
    }

    // Latest actual period per category — the starting point each target line draws from.
    const latestPeriodSortKeyByCategory = new Map<number, number>()
    for (const [sortKey, row] of rows) {
      for (const category of chartCategories) {
        if (row[shortCategoryLabel(category.category_name)] != null) {
          const prev = latestPeriodSortKeyByCategory.get(category.id)
          if (prev === undefined || sortKey > prev) latestPeriodSortKeyByCategory.set(category.id, sortKey)
        }
      }
    }

    const targetKeys = new Set<string>()
    for (const category of chartCategories) {
      const goal = currentGoalByCategory.get(category.id)
      if (!goal) continue
      const targetLevelNumber = levelById.get(goal.target_level_id)?.level_number
      const startSortKey = latestPeriodSortKeyByCategory.get(category.id)
      if (targetLevelNumber === undefined || startSortKey === undefined) continue

      const targetKey = `${shortCategoryLabel(category.category_name)} (target)`
      targetKeys.add(targetKey)

      const { period: targetPeriod, sortKey: targetSortKey } = termPeriodFor(goal.target_date)
      if (!rows.has(targetSortKey)) {
        rows.set(targetSortKey, { period: targetPeriod, sortKey: targetSortKey })
      }

      const startRow = rows.get(startSortKey)!
      const currentLevelNumber = startRow[shortCategoryLabel(category.category_name)] as number
      startRow[targetKey] = currentLevelNumber
      rows.get(targetSortKey)![targetKey] = targetLevelNumber
    }

    const sortedRows = Array.from(rows.values()).sort((a, b) => a.sortKey - b.sortKey)
    return { chartData: sortedRows, targetKeys }
  }, [assessments, chartCategories, levelById, currentGoalByCategory])

  function toggleSeries(dataKey: string) {
    setHiddenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(dataKey)) next.delete(dataKey)
      else next.add(dataKey)
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
          {viewMode === 'chart' && ' Click a legend item to show or hide it. Dashed lines mark a set target.'}
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
          <Box sx={{ width: '100%', height: 420 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D2" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  wrapperStyle={{ zIndex: 1000, outline: 'none' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E7E1D2',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(20,20,20,0.18)',
                  }}
                />
                <Legend
                  onClick={(e) => {
                    if (typeof e.dataKey === 'string') toggleSeries(e.dataKey)
                  }}
                  wrapperStyle={{ cursor: 'pointer', fontSize: 13 }}
                />
                {chartCategories.map((category) => {
                  const { color, shape } = getCategoryVisual(category.category_name)
                  const key = shortCategoryLabel(category.category_name)
                  return (
                    <Line
                      key={category.id}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={renderShapeDot(shape, color)}
                      legendType={legendIconFor(shape)}
                      connectNulls
                      hide={hiddenSeries.has(key)}
                    />
                  )
                })}
                {chartCategories.map((category) => {
                  const { color, shape } = getCategoryVisual(category.category_name)
                  const key = `${shortCategoryLabel(category.category_name)} (target)`
                  if (!targetKeys.has(key)) return null
                  return (
                    <Line
                      key={key}
                      type="linear"
                      dataKey={key}
                      name={key}
                      stroke={color}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={renderShapeDot(shape, color, 3.5)}
                      legendType={legendIconFor(shape)}
                      connectNulls
                      hide={hiddenSeries.has(key)}
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
