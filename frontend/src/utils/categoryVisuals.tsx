import type { ComponentType } from 'react'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import ArticleIcon from '@mui/icons-material/Article'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement'
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts'
import CategoryIcon from '@mui/icons-material/Category'
import type { SvgIconProps } from '@mui/material'
import { TablaIcon } from '../components/icons/TablaIcon'
import { AmritBataIcon } from '../components/icons/AmritBataIcon'

export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'cross' | 'wye' | 'triangleDown'

interface CategoryVisual {
  icon: ComponentType<SvgIconProps>
  color: string
  shape: MarkerShape
}

// Colors are a validated categorical palette (fixed hue order, CVD-checked
// for adjacent pairs) rather than picked by eye — with 8 series in play, no
// ordering of 8 truly distinct hues clears all-pairs colorblind separation,
// so each category also gets a distinct marker shape as a secondary channel
// (see MarkerShape / renderCategoryDot in ProgressOverTimeChart) — that's
// what actually carries "which line is which" once color alone can't.
const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  'Gurbani Reading': { icon: MenuBookIcon, color: '#2a78d6', shape: 'circle' },
  Kirtan: { icon: MusicNoteIcon, color: '#eb6834', shape: 'square' },
  Tabla: { icon: TablaIcon, color: '#4a3aa7', shape: 'triangle' },
  Gatka: { icon: SportsMartialArtsIcon, color: '#eda100', shape: 'diamond' },
  'Nitnem Gurbani Kanth': { icon: AutoStoriesIcon, color: '#e87ba4', shape: 'star' },
  'Daily Paath Recitation': { icon: ArticleIcon, color: '#008300', shape: 'cross' },
  // Achromatic on purpose — every hued slot in the 8-color set had already
  // been claimed by another category and kept reading as "too close" to one
  // of them next to Daily Paath's green. Grey has no hue to clash with.
  'Daily Simran Recitation': { icon: SelfImprovementIcon, color: '#3d3d3d', shape: 'wye' },
  'Amrit Status & Intention': { icon: AmritBataIcon, color: '#e34948', shape: 'triangleDown' },
}

export function getCategoryVisual(categoryName: string): CategoryVisual {
  return CATEGORY_VISUALS[categoryName] ?? { icon: CategoryIcon, color: '#6b6b6b', shape: 'circle' }
}
