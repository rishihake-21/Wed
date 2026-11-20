import { Color } from 'three'
import { colors } from '../../theme/tokens'

/** Every colour the groom's scene uses, derived from the theme tokens so a palette change flows through. */
export function groomColors() {
  const c = (hex: string) => new Color(hex)
  const midnight = c(colors.midnight)
  const yamuna = c(colors.yamuna)
  const peacock = c(colors.peacock)
  const gold = c(colors.gold)
  const marigold = c(colors.marigold)
  return {
    gold,
    marigold,
    cream: c(colors.cream),
    teal: yamuna.clone(),
    rim: marigold.clone(),
    deep: midnight.clone().lerp(yamuna, 0.4),
    leaf: peacock.clone().lerp(yamuna, 0.25),
    bark: midnight.clone().lerp(marigold, 0.1),
    barkLit: midnight.clone().lerp(gold, 0.28),
    groundCenter: yamuna.clone().lerp(midnight, 0.62),
    groundEdge: midnight.clone().lerp(yamuna, 0.15),
    grassDeep: peacock.clone().lerp(midnight, 0.6),
    grassTip: peacock.clone().lerp(gold, 0.35),
  }
}
export type GroomColors = ReturnType<typeof groomColors>
