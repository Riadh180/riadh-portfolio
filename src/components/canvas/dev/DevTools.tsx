'use client'

// Development only (lazy-loaded behind NODE_ENV): live palette + scene tuning and GPU stats.
// Tweak here, press "copy values", then paste the result into tokens.ts / scene.ts.

import { StatsGl } from '@react-three/drei'
import { button, useControls } from 'leva'
import { useEffect } from 'react'
import type { Color } from 'three'
import { type SceneColor, sceneColors, sceneConfig } from '@/styles/scene'
import { palette } from '@/styles/tokens'
import { sampleRoundedRect } from '../particles/targets'
import { dissolveParticles, formParticles } from '../particles/transitions'

type Palette = Record<SceneColor, string>
type Slider = {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}
type ColorInput = { value: string; onChange: (v: string) => void }

const current: Palette = {
  bg: palette.bg,
  blue: palette.blue,
  teal: palette.teal,
  violet: palette.violet,
  pink: palette.pink,
  emerald: palette.emerald,
  glow: palette.glow,
  warm: palette.warm,
  glass: palette.text,
}

const presets: Record<string, Palette> = {
  Current: current,
  Colder: { ...current, teal: '#1AA6C9', blue: '#4A86FF', violet: '#7C7CFF', glow: '#8CEBFF' },
  'More violet': { ...current, blue: '#5468FF', violet: '#A274FF', teal: '#14A3B8' },
}

const colorKeys = Object.keys(sceneColors) as SceneColor[]
const hex = (color: Color) => `#${color.getHexString().toUpperCase()}`

function applyColor(key: SceneColor, value: string) {
  sceneColors[key].set(value)
  if (key === 'bg') document.documentElement.style.setProperty('--bg', value)
}

/** Binds a numeric config group to leva sliders that write straight back into it. */
function sliders<T extends Record<string, number>>(
  group: T,
  ranges: Record<keyof T, [min: number, max: number, step: number]>,
): Record<string, Slider> {
  return Object.fromEntries(
    Object.entries(group).map(([key, value]) => {
      const [min, max, step] = ranges[key as keyof T]
      const onChange = (next: number) => Object.assign(group, { [key]: next })
      return [key, { value, min, max, step, onChange }]
    }),
  )
}

export default function DevTools() {
  const [{ preset }, setPalette] = useControls('Palette', () => ({
    preset: { options: Object.keys(presets), value: 'Current' },
    ...(Object.fromEntries(
      colorKeys.map((key) => [
        key,
        { value: hex(sceneColors[key]), onChange: (v: string) => applyColor(key, v) },
      ]),
    ) as Record<SceneColor, ColorInput>),
  }))

  useEffect(() => {
    const colors = presets[preset]
    if (colors) setPalette(colors)
  }, [preset, setPalette])

  useControls(
    'Particles',
    sliders(sceneConfig.particles, {
      size: [0.005, 0.08, 0.001],
      aperture: [0, 3, 0.05],
      focusDistance: [4, 20, 0.1],
      brightness: [0, 3, 0.05],
    }),
  )
  useControls(
    'Flow',
    sliders(sceneConfig.flow, {
      speed: [0, 1.5, 0.01],
      scale: [0.02, 0.6, 0.005],
      drift: [0, 0.3, 0.005],
    }),
  )
  useControls(
    'Emblem',
    sliders(sceneConfig.emblem, {
      scale: [0.3, 1.2, 0.01],
      tilt: [0, 1.2, 0.01],
      float: [0, 0.3, 0.005],
      halfTurn: [1, 12, 0.05],
      dwell: [0, 0.99, 0.01],
    }),
  )
  useControls(
    'Glass',
    sliders(sceneConfig.glass, {
      transmission: [0, 1, 0.01],
      thickness: [0, 3, 0.01],
      roughness: [0, 1, 0.005],
      ior: [1, 2.3, 0.01],
      dispersion: [0, 5, 0.05],
      iridescence: [0, 1, 0.01],
      iridescenceIOR: [1, 2.3, 0.01],
      iridescenceMin: [0, 1000, 10],
      iridescenceMax: [0, 1000, 10],
    }),
  )
  useControls(
    'Light',
    sliders(sceneConfig.light, {
      corners: [0, 0.4, 0.005],
      warmPeriod: [3, 20, 0.5],
      warmth: [0, 1, 0.01],
    }),
  )
  useControls(
    'Cursor',
    sliders(sceneConfig.cursor, {
      strength: [0, 3, 0.05],
      radius: [0.001, 0.03, 0.0005],
    }),
  )
  useControls('Transition', {
    'form card': button(() => formParticles(sampleRoundedRect(6000))),
    dissolve: button(dissolveParticles),
  })
  useControls(
    'Bloom',
    sliders(sceneConfig.bloom, {
      intensity: [0, 4, 0.05],
      threshold: [0, 1.5, 0.01],
      smoothing: [0, 1, 0.01],
      radius: [0, 1, 0.01],
    }),
  )
  useControls(
    'Chromatic',
    sliders(sceneConfig.chromatic, {
      offset: [0, 0.01, 0.0001],
      modulationOffset: [0, 1, 0.01],
    }),
  )
  useControls(
    'Grade',
    sliders(sceneConfig.grade, {
      contrast: [0.7, 1.5, 0.01],
      grain: [0, 0.3, 0.005],
      vignette: [0, 1.5, 0.01],
    }),
  )
  useControls('Export', {
    'copy values': button(() => {
      const colors = Object.fromEntries(colorKeys.map((key) => [key, hex(sceneColors[key])]))
      void navigator.clipboard.writeText(JSON.stringify({ colors, scene: sceneConfig }, null, 2))
    }),
  })

  return <StatsGl className="top-auto! bottom-3! left-3!" />
}
