import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Verify the committed solver code, independently of any saved route files. */
export function verifyDdrVendor() {
  const directory = resolve(import.meta.dir, "../design/vendor");
  const provenance = JSON.parse(readFileSync(resolve(directory, "bus-lanes-outer.provenance.json"), "utf8"));
  for (const [file, expected] of [["bus-lanes-outer.js", provenance.bundleSha256], ["bus-lanes-outer.d.ts", provenance.declarationsSha256]]) {
    const actual = createHash("sha256").update(readFileSync(resolve(directory, file))).digest("hex");
    if (actual !== expected) throw new Error(`Vendored DDR solver hash mismatch: ${file}`);
  }
  if (!/^[a-f0-9]{40}$/.test(provenance.sourceCommit))
    throw new Error("Vendored DDR solver must identify an exact source commit");
  return provenance;
}

if (import.meta.main) console.log(JSON.stringify(verifyDdrVendor()));
