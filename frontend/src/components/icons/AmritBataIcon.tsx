import { SvgIcon, type SvgIconProps } from '@mui/material'

// The amrit bata: the iron bowl used in the Amrit Sanchar ceremony, with
// the khanda (double-edged sword) resting in it.
export function AmritBataIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M4 13.5 C4 18.2 7.8 21 12 21 C16.2 21 20 18.2 20 13.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <ellipse cx="12" cy="13.5" rx="8" ry="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <line x1="7.6" y1="3" x2="14.8" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="7.6" cy="3" r="1.2" fill="currentColor" />
      <line x1="9.3" y1="6.4" x2="11.9" y2="5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </SvgIcon>
  )
}
