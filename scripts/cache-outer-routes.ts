import { createHash } from "node:crypto";
import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { AnyCircuitElement } from "circuit-json";
import type { FanoutTracePath } from "@tscircuit/props";
import { auditRoutedBoard } from "./audit-routed-board";

const directory = resolve(process.argv[2] ?? "work/builds/board");
const bytes = await readFile(join(directory, "board.circuit.json"));
const summary = JSON.parse(await readFile(join(directory, "board-summary.json"), "utf8"));
if (summary.stage !== "board" || summary.asyncErrors?.length || Object.keys(summary.errorCounts ?? {}).length)
  throw new Error("Cannot cache a partial or failed board render");
const audit = await auditRoutedBoard(JSON.parse(bytes.toString()) as AnyCircuitElement[]);
if (!audit.pass) throw new Error(`Cannot cache incomplete routing: ${audit.failures.join("; ")}`);
const manifest = JSON.parse(await readFile(join(directory, "phase-manifest.json"), "utf8")) as {
  name: string | null; paths?: string;
}[];
const names = ["USB_AND_TMDS", "LCD_BUS", "CONTROL_AND_BOOT", "POWER", "GROUND"];
const phases: Record<string, FanoutTracePath[]> = {};
for (const entry of manifest) {
  if (!entry.name || !names.includes(entry.name)) continue;
  if (!entry.paths) throw new Error(`Completed phase ${entry.name} has no recorded paths`);
  const paths = JSON.parse(await readFile(join(directory, entry.paths), "utf8")) as FanoutTracePath[];
  (phases[entry.name] ??= []).push(...paths);
}
if (phases.USB_AND_TMDS?.length !== 24)
  throw new Error("The accepted route cache must include all 24 USB/TMDS paths");
for (const name of ["LCD_BUS", "CONTROL_AND_BOOT", "POWER"])
  if (!phases[name]?.length) throw new Error(`The accepted route cache is missing ${name}`);
const file = resolve("design/accepted-outer-routes.json");
const temporary = `${file}.${process.pid}.tmp`;
await writeFile(temporary, JSON.stringify({
  schemaVersion: 1,
  circuitSha256: createHash("sha256").update(bytes).digest("hex"),
  phases,
}, null, 2) + "\n");
await rename(temporary, file);
console.log("Cached only the complete, independently audited board. Run build to validate source replay.");
