/**
 * Ball colour configuration
 * ─────────────────────────
 * Palettes are cycled round-robin across the team members.
 *
 * primary   — the dominant ball colour
 * secondary — the darker edge/shadow colour
 */
export interface BallColors {
  primary: string
  secondary: string
}

export const BALL_PALETTES: BallColors[] = [
  { primary: '#DC392D', secondary: '#007EB3' },
  { primary: '#9E4398', secondary: '#007EB3' },
  { primary: '#583788', secondary: '#2E754B' },
  { primary: '#F3D008', secondary: '#047706' },
  { primary: '#3653A4', secondary: '#6A7884' },
  { primary: '#00838A', secondary: '#EC7E00' },
  { primary: '#003380', secondary: '#EABB0D' },
  { primary: '#C2C5C4', secondary: '#FFB700' },
  { primary: '#0D829C', secondary: '#00606F' },
  { primary: '#CC1580', secondary: '#8E136F' },
  { primary: '#1E1E1E', secondary: '#DE0000' },
  { primary: '#DA3832', secondary: '#666666' },
  { primary: '#E62239', secondary: '#666666' },
  { primary: '#F26F1D', secondary: '#666666' },
]
