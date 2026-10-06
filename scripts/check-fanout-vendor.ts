import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildOutputSimpleRouteJson, routeMixedSurfaceSourcePrefixesSteps } from "@tscircuit/fanout-solver";

/** Verify the local source package, its review patch, and installed contents. */
export function verifyFanoutVendor() {
  const directory = resolve(import.meta.dir, "../design/vendor");
  const provenance = JSON.parse(readFileSync(resolve(directory, "fanout-solver.provenance.json"), "utf8"));
  if (!/^[a-f0-9]{40}$/.test(provenance.sourceCommit) || !/^[a-f0-9]{40}$/.test(provenance.baseCommit))
    throw new Error("The native fanout source must identify exact source and base commits");
  const root = resolve(dirname(Bun.resolveSync("@tscircuit/fanout-solver", import.meta.dir)), "..");
  const files: [string, string][] = [
    [resolve(directory, provenance.packageFile), provenance.packageSha256],
    [resolve(directory, provenance.patchFile), provenance.patchSha256],
    ...Object.entries(provenance.packageFiles as Record<string, string>).map(([file, expected]): [string, string] => [resolve(root, file), expected]),
  ];
  for (const [file, expected] of files) {
    const actual = createHash("sha256").update(readFileSync(file)).digest("hex");
    if (actual !== expected) throw new Error(`Native fanout hash mismatch: ${file}`);
  }
  if (typeof routeMixedSurfaceSourcePrefixesSteps !== "function" || typeof buildOutputSimpleRouteJson !== "function")
    throw new Error("The installed fanout package must expose native source planning and output APIs");
  return { sourceCommit: provenance.sourceCommit, packageFile: provenance.packageFile, verifiedFiles: files.length };
}

if (import.meta.main) console.log(JSON.stringify(verifyFanoutVendor()));
