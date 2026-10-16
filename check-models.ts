import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonTo3D } from "circuit-json-to-gltf"

/** Read-only model coverage, HTTP/CORS, format, and actual mesh validation.
 * Usage: bun --smol check-models.ts [native JSON] [report JSON] [viewer origin]
 * Bare PCB test pads must also render; unsupported built-in footprint models
 * otherwise disappear silently. Component-only conversion excludes expensive
 * PCB drill/texture geometry.
 * The native board file is never changed.
 */
const input = resolve(process.argv[2] ?? "dist/index/circuit.json")
const report = resolve(process.argv[3] ?? ".tscircuit/model-check-report.json")
const origin = process.argv[4] ?? "https://tscircuit.com"
const bytes = readFileSync(input)
const rows = JSON.parse(bytes.toString()) as CircuitJson
const sha256 = createHash("sha256").update(bytes).digest("hex")
const parts = rows.filter((r) => r.type === "source_component")
const ids = new Set(parts.map((r) => r.source_component_id))
const cad = rows.filter((r): r is Extract<CircuitJson[number], { type: "cad_component" }> =>
  r.type === "cad_component" && ids.has(r.source_component_id))
const pcb = rows.filter((r): r is Extract<CircuitJson[number], { type: "pcb_component" }> =>
  r.type === "pcb_component" && ids.has(r.source_component_id))
const errors: string[] = []
const seen = new Set<string>()
for (const part of parts) {
  const matches = cad.filter((r) => r.source_component_id === part.source_component_id)
  if (matches.length !== 1) errors.push(`${part.name}: expected one native CAD model, got ${matches.length}`)
  if (matches.some((r) => r.show_as_bounding_box)) errors.push(`${part.name}: generic bounding box`)
}

const urls = [...new Set(cad.flatMap((r) => [r.model_obj_url, r.model_step_url]).filter((u): u is string => !!u))]
const assets: Array<{ url: string; bytes?: number; status?: number; cors?: string | null; valid: boolean; error?: string }> = []
for (const url of urls) {
  try {
    const response = await fetch(url, { headers: { Origin: origin }, signal: AbortSignal.timeout(45_000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const cors = response.headers.get("Access-Control-Allow-Origin")
    if (cors !== "*" && cors !== origin) throw new Error(`CORS permits ${cors}, expected ${origin}`)
    const body = await response.text()
    const isStep = new URL(url).pathname.endsWith(".step")
    const valid = isStep
      ? body.includes("ISO-10303-21;") && body.includes("END-ISO-10303-21;")
      : /^v\s+[-+.\d]/m.test(body) && /^f\s+\d/m.test(body)
    if (!valid) errors.push(`${url}: invalid or empty ${isStep ? "STEP" : "OBJ"}`)
    assets.push({ url, bytes: body.length, status: response.status, cors, valid })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`${url}: ${message}`)
    assets.push({ url, valid: false, error: message })
  }
  Bun.gc(true)
}

// The official converter must produce actual meshes for every physical part,
// including built-in footprint models. This read-only projection is never
// saved or passed to fabrication: it only omits board drills and copper textures.
const scene = await convertCircuitJsonTo3D([...parts, ...pcb, ...cad], {
  renderBoardTextures: false,
  drawFauxBoard: false,
  foldPcbs: false,
  showBoundingBoxes: false,
}).catch((error: unknown) => {
  errors.push(`Model conversion failed: ${error instanceof Error ? error.message : String(error)}`)
  return { boxes: [] }
})
const partNames = new Set(parts.map((p) => p.name))
const models = scene.boxes.filter((b) => b.label && partNames.has(b.label))
const details = models.map((b) => {
  const bounds = b.mesh?.boundingBox
  const finite = !!b.mesh?.triangles.length && !!bounds
    && Object.values(bounds.min).every(Number.isFinite)
    && Object.values(bounds.max).every(Number.isFinite)
    && Object.values(b.center).every(Number.isFinite)
  if (!finite) errors.push(`${b.label}: no finite, non-empty mesh`)
  if (seen.has(b.label!)) errors.push(`${b.label}: duplicate model`)
  seen.add(b.label!)
  return { name: b.label, triangles: b.mesh?.triangles.length ?? 0, bounds, size: b.size, center: b.center, rotation: b.rotation, source: b.meshUrl ?? "native" }
})
for (const part of parts) if (!seen.has(part.name)) errors.push(`${part.name}: missing rendered model`)
const result = { pass: errors.length === 0, nativeSha256: sha256, origin, parts: parts.length, cadModels: cad.length, loadedModels: models.length, assets, errors, details }
mkdirSync(dirname(report), { recursive: true })
writeFileSync(report, JSON.stringify(result, null, 2))
console.log(JSON.stringify({ pass: result.pass, parts: result.parts, cadModels: result.cadModels, loadedModels: result.loadedModels, assets: assets.length, errors }))
process.exit(errors.length ? 1 : 0)
