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

interface CategoryVisual {
  icon: ComponentType<SvgIconProps>
  color: string
}

const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  'Gurbani Reading': { icon: MenuBookIcon, color: '#0B3D91' },
  Kirtan: { icon: MusicNoteIcon, color: '#96791C' },
  Tabla: { icon: TablaIcon, color: '#8E24AA' },
  Gatka: { icon: SportsMartialArtsIcon, color: '#C62828' },
  'Nitnem Gurbani Kanth': { icon: AutoStoriesIcon, color: '#00838F' },
  'Daily Paath Recitation': { icon: ArticleIcon, color: '#2E7D32' },
  'Daily Simran Recitation': { icon: SelfImprovementIcon, color: '#5E35B1' },
  'Amrit Status & Intention': { icon: AmritBataIcon, color: '#C9A227' },
}

export function getCategoryVisual(categoryName: string): CategoryVisual {
  return CATEGORY_VISUALS[categoryName] ?? { icon: CategoryIcon, color: '#6b6b6b' }
}
