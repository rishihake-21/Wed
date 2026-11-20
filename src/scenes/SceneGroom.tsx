import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { SCENE_ORIGINS } from '../core/layout'
import type { SceneProps } from '../core/types'
import { FlutterField } from '../shared/FlutterField'
import { Glow } from '../shared/Glow'
import { sceneFade } from '../shared/sceneFade'
import { makeFeatherTexture } from '../shared/textures'
import { budgetFor, GROOM_SCALE, GROUND_Y, GROVE_INNER, GROVE_OUTER, REVEAL } from './groom/config'
import { Grove } from './groom/Grove'
import { GroomStack } from './groom/GroomStack'
import type { Framing } from './groom/GroomStack'
import { groomColors } from './groom/palette'
import { ARRIVAL_YAW, GROOM_POSITION, GROOM_SCENE, GROOM_SPOT } from './groom/stage'

/**
 * Scene 2: the groom's world. A moonlit kadamba grove, peacock feathers drifting down, a flute melody
 * that draws itself around a stylised figure, and (as HTML, ui/overlays/PersonOverlays.tsx) the
 * groom's name rising in gold. Lite draws nothing here: the sky is the whole scene.
 *
 * The room is authored in its own units around the middle of the figure (groom/config.ts) and set
 * down at the hero's spot (core/layout.ts HERO_SPOTS), scaled so the figure stands HERO_HEIGHT tall.
 * The camera holds its gaze on that spot from 0.2 to 0.68 of the scene. `progress` is a ref-style
 * box read inside useFrame, never state; useFrame here uses the default priority (0), which runs
 * after the camera and never turns off R3F's automatic render.
 */
export function SceneGroom({ progress, quality }: SceneProps) {
  if (quality === 'lite') return null
  return <GroomWorld progress={progress} quality={quality} />
}

function GroomWorld({ progress, quality }: SceneProps) {
  const budget = useMemo(() => budgetFor(quality), [quality])
  const colors = useMemo(groomColors, [])
  const feather = useMemo(() => makeFeatherTexture(budget.texture / 2, budget.texture), [budget.texture])
  const ambient = useRef(0)
  /** 1 while the scene plays, easing to 0 at its end so the solid parts dissolve before the unmount. */
  const fade = useMemo(() => ({ value: 1 }), [])
  const debug = useMemo(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('groomDebug'),
    [],
  )

  // Where the figure stands in the world, and where the camera arrives from: both from the layout.
  const framing = useMemo<Framing>(() => {
    const [ox, , oz] = SCENE_ORIGINS[GROOM_SCENE]
    return { yaw: ARRIVAL_YAW, x: ox + GROOM_SPOT[0], z: oz + GROOM_SPOT[2] }
  }, [])

  // The scene owns the textures it made by hand and releases them on unmount (CLAUDE.md).
  useEffect(() => () => feather.dispose(), [feather])

  useFrame(() => {
    ambient.current = REVEAL.ambient(progress.current)
    fade.value = sceneFade(progress.current)
  })

  return (
    <group position={GROOM_POSITION} scale={GROOM_SCALE}>
      <Grove budget={budget} fade={fade} />
      <Glow color={colors.gold} size={9 * GROOM_SCALE} intensity={0.9} push={GROOM_SCALE} position={[0, 0.2, 0]} opacity={ambient} />
      <GroomStack progress={progress} budget={budget} framing={framing} />
      <FlutterField
        texture={feather}
        count={budget.feathers}
        radius={GROVE_INNER + 3}
        innerRadius={1.3}
        height={9}
        baseY={GROUND_Y}
        size={[0.5, 1.15]}
        fall={0.42}
        sway={1.1}
        spin={1.4}
        glow={0.3}
        opacity={ambient}
      />
      {debug && (
        <>
          <axesHelper args={[3]} />
          <gridHelper args={[GROVE_OUTER * 2, 38]} position={[0, GROUND_Y, 0]} />
        </>
      )}
    </group>
  )
}

export default SceneGroom
