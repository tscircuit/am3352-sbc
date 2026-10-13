import * as checks from "@tscircuit/checks"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"

/** All default runAllRoutingChecks checks in @tscircuit/checks 0.0.252.
 * Run sequentially in fresh processes so geometry allocations are released
 * between checks. This is validation only: no generated files are modified.
 *
 * Usage: bun check-routing.ts [native Circuit JSON path]
 */
const checkNames = [
  "checkEachPcbPortConnectedToPcbTraces",
  "checkSourceTracesHavePcbTraces",
  "checkSourceTracesMatchPcbTraceThickness",
  "checkPcbBendZoneTraces",
  "checkPcbTraceLengths",
  "checkPcbTraceStyle",
  "checkPcbBusLengthSkew",
  "checkPcbRoutingConstraints",
  "checkPcbTraceViaCounts",
  "checkEachPcbTraceNonOverlapping",
  "checkCopperPourShorts",
  "checkPadTraceClearance",
  "checkHoleTraceClearance",
  "checkViaTraceClearance",
  "checkViaPadClearance",
  "checkSameNetViaSpacing",
  "checkDifferentNetViaSpacing",
  "checkTracesAreContiguous",
  "checkDanglingTraces",
  "checkPcbTracesOutOfBoard",
] as const

type CheckName = typeof checkNames[number]
type Finding = AnyCircuitElement & { error_type?: string; message?: string }
type WorkerResult = {
  check: CheckName
  nativeSha256: string
  findings: Finding[]
  storedErrors?: Finding[]
  officialCheckInput?: string
}
const protocolPrefix = "PCB_ROUTING_CHECK_RESULT:"
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex")
const isError = (finding: Finding) => finding.type.endsWith("_error") || Boolean(finding.error_type)

async function runWorker() {
  const [, name, nativePath, expectedSha256] = process.argv.slice(2)
  if (!checkNames.includes(name as CheckName)) throw new Error(`Unknown routing check: ${name}`)
  const bytes = readFileSync(nativePath!)
  const nativeSha256 = sha256(bytes)
  if (nativeSha256 !== expectedSha256) throw new Error("Generated native changed between checks")
  const first = name === checkNames[0]
  const rows: AnyCircuitElement[] = JSON.parse(first ? bytes.toString("utf8") : await Bun.stdin.text())
  if (!Array.isArray(rows)) throw new Error("Native Circuit JSON must be an array")
  const fn = checks[name as CheckName] as (
    circuit: AnyCircuitElement[],
    options?: { connMap: ReturnType<typeof getFullConnectivityMapFromCircuitJson> },
  ) => AnyCircuitElement[] | Promise<AnyCircuitElement[]>
  // The public first check performs upstream's endpoint annotation helper and
  // constructs its complete indexed PCB connectivity map internally. That
  // builder is private to @tscircuit/checks; its public default is authoritative.
  // Retain only this private in-memory check input for subsequent workers,
  // matching the aggregator without repeating its heavy first check 20 times.
  const findings = await (first ? fn(rows) : fn(rows, { connMap: getFullConnectivityMapFromCircuitJson(rows) }))
  if (!Array.isArray(findings)) throw new Error(`${name} did not return a finding array`)
  if (sha256(readFileSync(nativePath!)) !== nativeSha256) throw new Error("Generated native changed during a check")
  const result: WorkerResult = {
    check: name as CheckName, nativeSha256, findings: findings as Finding[],
    ...(first ? { storedErrors: rows.filter(row => isError(row as Finding)) as Finding[],
      officialCheckInput: JSON.stringify(rows) } : {}),
  }
  console.log(protocolPrefix + JSON.stringify(result))
}

async function runChecks() {
  const nativePath = resolve(process.argv[2] ?? ".tscircuit/generated/index.circuit.json")
  const nativeSha256 = sha256(readFileSync(nativePath))
  const scriptPath = fileURLToPath(import.meta.url)
  let officialCheckInput: string | undefined
  let errorCount = 0
  let warningCount = 0
  for (const name of checkNames) {
    const child = Bun.spawn([process.execPath, "--smol", scriptPath, "--worker", name, nativePath, nativeSha256], {
      stdin: "pipe", stdout: "pipe", stderr: "inherit",
    })
    if (officialCheckInput) child.stdin.write(officialCheckInput)
    child.stdin.end()
    const [output, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited])
    if (exitCode !== 0) throw new Error(`${name} worker exited with code ${exitCode}`)
    const position = output.lastIndexOf(protocolPrefix)
    if (position < 0) throw new Error(`${name} worker returned no result`)
    const result = JSON.parse(output.slice(position + protocolPrefix.length).trim()) as WorkerResult
    if (result.check !== name || result.nativeSha256 !== nativeSha256 || !Array.isArray(result.findings)) {
      throw new Error(`${name} worker returned inconsistent evidence`)
    }
    if (name === checkNames[0]) {
      if (!result.officialCheckInput) throw new Error("First check returned no official private check input")
      officialCheckInput = result.officialCheckInput
      const storedErrors = result.storedErrors ?? []
      errorCount += storedErrors.length
      for (const finding of storedErrors) console.error(`Stored error: ${JSON.stringify(finding)}`)
    }
    const errors = result.findings.filter(isError)
    errorCount += errors.length
    warningCount += result.findings.length - errors.length
    console.log(`${name}: ${errors.length} errors, ${result.findings.length - errors.length} warnings`)
    for (const finding of result.findings) {
      const display = `${name}: ${JSON.stringify(finding)}`
      if (isError(finding)) console.error(display)
      else console.log(display)
    }
  }
  if (sha256(readFileSync(nativePath)) !== nativeSha256) throw new Error("Generated native changed during routing validation")
  console.log(`${checkNames.length} routing checks completed: ${errorCount} errors, ${warningCount} warnings.`)
  process.exitCode = errorCount ? 1 : 0
}

try {
  if (process.argv[2] === "--worker") await runWorker()
  else await runChecks()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
