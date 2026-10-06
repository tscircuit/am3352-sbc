import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import type { AnyCircuitElement } from "circuit-json";
import { auditInnerGroundPlanes } from "./inner-ground-plane-audit";

const file = process.argv[2];
if (!file) throw new Error("Usage: bun scripts/audit-inner-ground-planes.ts <native.circuit.json> [report.json]");
const bytes = await readFile(file);
const report = {
  circuitSha256: createHash("sha256").update(bytes).digest("hex"),
  ...auditInnerGroundPlanes(JSON.parse(bytes.toString()) as AnyCircuitElement[]),
  scope: "Native inner GND connectivity, full-stack barrels, non-GND via antipads and signal-layer exclusivity; whole-board routing/DDR/impedance acceptance remains separate.",
};
if (process.argv[3]) await writeFile(process.argv[3], `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
