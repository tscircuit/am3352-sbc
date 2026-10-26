import type { LayerRef } from "circuit-json"
export function getViaBoardLayers(layerCount: number): LayerRef[] {
  if (layerCount <= 1) return ["top"]
  return [
    "top",
    ...Array.from(
      { length: layerCount - 2 },
      (_, index) => `inner${index + 1}` as LayerRef,
    ),
    "bottom",
  ]
}
