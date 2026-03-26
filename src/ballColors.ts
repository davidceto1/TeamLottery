/**
 * Ball colour configuration
 * ─────────────────────────
 * Brand palettes are cycled round-robin across the team members.
 *
 * primary   — the dominant ball colour (brand primary.main)
 * secondary — the darker edge/shadow colour (brand secondary.main)
 */
export interface BallColors {
  primary: string
  secondary: string
}

export const BRAND_PALETTES: BallColors[] = [
  { primary: '#DC392D', secondary: '#007EB3' },   // sat
  { primary: '#9E4398', secondary: '#007EB3' },   // mw
  { primary: '#583788', secondary: '#2E754B' },   // ww
  { primary: '#F3D008', secondary: '#047706' },   // oz
  { primary: '#3653A4', secondary: '#6A7884' },   // pb
  { primary: '#00838A', secondary: '#EC7E00' },   // sfl
  { primary: '#003380', secondary: '#EABB0D' },   // mfl
  { primary: '#C2C5C4', secondary: '#FFB700' },   // lky
  { primary: '#0D829C', secondary: '#00606F' },   // lkysup
  { primary: '#CC1580', secondary: '#8E136F' },   // lkymeg
  { primary: '#1E1E1E', secondary: '#DE0000' },   // lucky
  { primary: '#DA3832', secondary: '#666666' },   // s66
  { primary: '#E62239', secondary: '#666666' },   // sal66
  { primary: '#F26F1D', secondary: '#666666' },   // strk
]
