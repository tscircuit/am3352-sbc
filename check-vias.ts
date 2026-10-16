import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import type { CircuitJson } from "circuit-json"
import { VIA_RULES } from "./routing/via-rules"

/** Check the actual generated barrels, not just declared board defaults. */
const input = process.argv[2] ?? "dist/index/circuit.json"
const bytes = readFileSync(input)
const native = JSON.parse(bytes.toString("utf8")) as CircuitJson
const vias = native.filter(row => row.type === "pcb_via")
if (!vias.length) throw new Error("Generated board has no vias")
const undersized = vias.filter(via => via.hole_diameter < VIA_RULES.holeDiameter - 1e-7
  || via.outer_diameter < VIA_RULES.padDiameter - 1e-7
  || via.outer_diameter - via.hole_diameter < 0.15 - 1e-7)
const blind = vias.filter(via => !["top", "inner1", "inner2", "bottom"].every(layer => via.layers.includes(layer as typeof via.layers[number])))
console.log(JSON.stringify({ pass: undersized.length === 0 && blind.length === 0,
  nativeSha256: createHash("sha256").update(bytes).digest("hex"), vias: vias.length,
  minimumDrillDiameter: Math.min(...vias.map(via => via.hole_diameter)),
  minimumCopperDiameter: Math.min(...vias.map(via => via.outer_diameter)),
  undersized: undersized.map(via => via.pcb_via_id), blindOrBuried: blind.map(via => via.pcb_via_id) }))
process.exit(undersized.length || blind.length ? 1 : 0)
