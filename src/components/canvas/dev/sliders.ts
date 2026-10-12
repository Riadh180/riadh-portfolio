// Development only: binds plain config objects to leva sliders.

export type Slider = {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

/** Binds a numeric config group to leva sliders that write straight back into it. */
export function sliders<T extends Record<string, number>>(
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
