import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { SOLVERS } from "@tscircuit/core";
import { AutoroutingPipelineSolver9_PreloadedTraceGraph } from "@tscircuit/capacity-autorouter";

/** Verify both the committed package and the implementation used by core. */
export function verifyAutorouterVendor() {
  const directory = resolve(import.meta.dir, "../design/vendor");
  const provenance = JSON.parse(readFileSync(resolve(directory, "capacity-autorouter.provenance.json"), "utf8"));
  if (!/^[a-f0-9]{40}$/.test(provenance.sourceCommit))
    throw new Error("The native outer router must identify an exact source commit");
  const installedEntry = Bun.resolveSync("@tscircuit/capacity-autorouter", import.meta.dir);
  const coreEntry = Bun.resolveSync("@tscircuit/core", import.meta.dir);
  if (Bun.resolveSync("@tscircuit/capacity-autorouter", dirname(coreEntry)) !== installedEntry ||
    (SOLVERS.AutoroutingPipelineSolver9_PreloadedTraceGraph as unknown) !== AutoroutingPipelineSolver9_PreloadedTraceGraph)
    throw new Error("Core must use the committed native outer-router package");
  for (const [file, expected] of [
    [resolve(directory, provenance.packageFile), provenance.packageSha256],
    [installedEntry, provenance.bundleSha256],
    [resolve(dirname(installedEntry), "index.d.ts"), provenance.declarationsSha256],
  ]) {
    const actual = createHash("sha256").update(readFileSync(file)).digest("hex");
    if (actual !== expected) throw new Error(`Native outer-router hash mismatch: ${file}`);
  }
  return provenance;
}

if (import.meta.main) console.log(JSON.stringify(verifyAutorouterVendor()));
