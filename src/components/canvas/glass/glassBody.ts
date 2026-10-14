import type { Color, Material } from 'three'

/**
 * The shared "lit glass body": light held inside thick glass. Added to any physical
 * material, it brightens the body softly, more towards grazing angles (where the light
 * travels through more glass) and from above (the world's key light), so glass reads as
 * a thick, lit body rather than thin bright outlines on black. One treatment for every
 * glass object in the world: The Core, the cards, the capstone panel, the nodes.
 */
export function addGlassBody(
  material: Material,
  { color, strength, edge = 0.75 }: { color: Color; strength: number; edge?: number },
) {
  const uniforms = {
    uBodyColor: { value: color },
    uBodyStrength: { value: strength },
    uBodyEdge: { value: edge },
  }
  const previous = material.onBeforeCompile.bind(material)
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uBodyColor;
        uniform float uBodyStrength;
        uniform float uBodyEdge;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          float facing = abs(dot(normal, normalize(vViewPosition)));
          float through = mix(1.0 - uBodyEdge, 1.0, pow(1.0 - facing, 1.5));
          float above = 0.55 + 0.45 * clamp(normal.y, -1.0, 1.0);
          outgoingLight += uBodyColor * uBodyStrength * through * above;
        }
        #include <opaque_fragment>`,
      )
  }
  const key = material.customProgramCacheKey.bind(material)
  material.customProgramCacheKey = () => `${key()}|glassBody`
  return uniforms
}
