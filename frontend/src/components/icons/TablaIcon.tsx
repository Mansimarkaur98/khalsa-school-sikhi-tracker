import { SvgIcon, type SvgIconProps } from '@mui/material'

// A simplified side-view rendering of a tabla pair: the larger bayan (left)
// and the smaller dayan (right), each a barrel-shaped body with a drum
// head and an off-center syahi (tuning paste) dot. The head/base ellipses
// provide the top/bottom closure, so the body is just two open side walls —
// no straight closing segment cutting across the ellipses.
export function TablaIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M2.3 6.3 C1.8 9.8 1.8 13.6 2.65 17.1 M10.9 6.3 C11.4 9.8 11.4 13.6 10.65 17.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <ellipse cx="6.6" cy="6.3" rx="4.3" ry="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="6.6" cy="17.1" rx="4" ry="0.9" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="7.5" cy="6.3" r="1.05" fill="currentColor" />

      <path
        d="M13.1 8.5 C12.7 11.4 12.7 14.3 13.3 17.1 M20.1 8.5 C20.5 11.4 20.5 14.3 19.9 17.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <ellipse cx="16.6" cy="8.5" rx="3.5" ry="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="16.6" cy="17.1" rx="3.3" ry="0.8" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="17.35" cy="8.5" r="0.9" fill="currentColor" />
    </SvgIcon>
  )
}
