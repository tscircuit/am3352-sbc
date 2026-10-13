import { Circuit } from "@tscircuit/core"
import { copyFile, mkdir, rename, rm } from "node:fs/promises"
import { dirname, join } from "node:path"
import Board from "./index.circuit"

const projectDir = dirname(import.meta.path)
const output = join(projectDir, ".tscircuit/generated/index.circuit.json")

async function generate() {
  const circuit = new Circuit({ platform: { partsEngineDisabled: true, routingDrcChecksDisabled: true } })
  const releaseMemoryAt = new Set(["PcbCopperPourCleanup:start", "PcbCopperPourCleanup:end", "PcbViaStitchRender:start", "SchematicTraceRender:end", "PcbDesignRuleChecks:end"])
  circuit.on("renderable:renderLifecycle:anyEvent", event => {
    if (event.componentDisplayName.startsWith("<board") && releaseMemoryAt.has(event.type.replace("renderable:renderLifecycle:", ""))) Bun.gc(true)
  })
  circuit.on("autorouting:start", event => console.log(`Routing phase ${event.phaseName}: ${event.simpleRouteJson?.connections.length ?? 0} connections`))
  circuit.add(<Board />)
  await circuit.renderUntilSettled()
  Bun.gc(true)
  const native = circuit.getCircuitJson()
  const errors = native.filter((row) => row.type.endsWith("_error") ||
    row.type === "source_ambiguous_port_reference")
  if (errors.length) throw new Error(`Native TSX generation reported ${errors.length} errors: ${errors.slice(0, 4).map((row) => JSON.stringify(row)).join("\n")}`)
  await mkdir(dirname(output), { recursive: true })
  const temporaryOutput = `${output}.${process.pid}.tmp`
  await rm(temporaryOutput, { force: true })
  const writer = Bun.file(temporaryOutput).writer()
  writer.write("[\n")
  for (const [index, row] of native.entries()) writer.write(`${index ? ",\n" : ""}${JSON.stringify(row)}`)
  writer.write("\n]\n")
  await writer.end()
  await rename(temporaryOutput, output)
  console.log(`Generated ${native.filter((row) => row.type === "source_component").length} parts, ${native.filter((row) => row.type === "pcb_trace").length} traces, ${native.filter((row) => row.type === "schematic_sheet").length} schematic sheets from TSX.`)
}

await generate()
Bun.gc(true)
const localCli = join(projectDir, "node_modules/tscircuit/cli.mjs")
const command = await Bun.file(localCli).exists() ? [process.execPath, "--smol", localCli] : [Bun.which("tsci") ?? "tsci"]
// Use the source entry's basename so the official CLI emits dist/index/*.
// This temporary input is an exact copy of freshly generated native output.
const cliInput = join(projectDir, "index.circuit.json")
await copyFile(output, cliInput)
let buildExitCode = 0
try {
  const cli = Bun.spawn([...command, "build", cliInput, "--ignore-config", "--svgs",
    ...(process.argv.includes("--site") ? ["--site", "--use-cdn-javascript"] : [])],
    { cwd: projectDir, stdout: "inherit", stderr: "inherit" })
  buildExitCode = await cli.exited
} finally {
  await rm(cliInput, { force: true })
}
if (buildExitCode === 0 && process.argv.includes("--site")) {
  await rm(join(projectDir, "dist/standalone.min.js"), { force: true })
}
process.exit(buildExitCode)
