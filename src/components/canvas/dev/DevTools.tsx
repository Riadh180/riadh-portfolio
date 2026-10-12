'use client'

// Development only (lazy-loaded behind NODE_ENV): live palette + scene tuning and GPU stats.
// Tweak here, press "copy values", then paste the result into tokens.ts / scene.ts.

import { StatsGl } from '@react-three/drei'
import { button, useControls } from 'leva'
import { useEffect } from 'react'
import type { Color } from 'three'
import { type SceneColor, sceneColors, sceneConfig } from '@/styles/scene'
import { palette } from '@/styles/tokens'

type Palette = Record<SceneColor, string>
type Slider = {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}
type ColorInput = { value: string; onChange: (v: string) => void }

const presets: Record<string, Palette> = {
  Current: {
    bg: palette.bg,
    blue: palette.blue,
    teal: palette.teal,
    emerald: palette.emerald,
    glow: palette.glow,
  },
  'Deeper ocean': {
    bg: '#03080E',
    blue: '#2F63D9',
    teal: '#0E8F95',
    emerald: '#0FB38A',
    glow: '#6FE3D6',
  },
  'More emerald': {
    bg: '#040C0C',
    blue: '#2E6FE0',
    teal: '#10B89A',
    emerald: '#19E3A0',
    glow: '#9BFFE0',
  },
  'Colder blue': {
    bg: '#050913',
    blue: '#4A86FF',
    teal: '#1AA6C9',
    emerald: '#12C7A8',
    glow: '#8CEBFF',
  },
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
      drift: [0, 0.6, 0.01],
      streamPull: [0, 2, 0.01],
    }),
  )
  useControls(
    'Cursor',
    sliders(sceneConfig.cursor, {
      strength: [0, 3, 0.05],
      radius: [0.001, 0.03, 0.0005],
    }),
  )
  useControls('Light', sliders(sceneConfig.light, { pools: [0, 1, 0.01] }))
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
