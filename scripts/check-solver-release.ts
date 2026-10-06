import { mkdirSync, writeFileSync } from "node:fs";

export function resolveCoreVersion(versions: string[], range: string) {
  return versions.filter(v => !v.includes("-") && Bun.semver.satisfies(v, range))
    .sort(Bun.semver.order).at(-1);
}

async function metadata(path: string, compact = false): Promise<any> {
  const response = await fetch(`https://registry.npmjs.org/${path}`, {
    headers: { accept: compact ? "application/vnd.npm.install-v1+json" : "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Package metadata request failed: ${response.status}`);
  return response.json();
}

if (import.meta.main) {
  const [tscircuit, coreVersions] = await Promise.all([
    metadata("tscircuit/latest"), metadata("@tscircuit%2fcore", true),
  ]);
  const coreRange = tscircuit.dependencies?.["@tscircuit/core"];
  if (!coreRange) throw new Error("Latest tscircuit has no declared core dependency; inspect its release manually");
  const coreVersion = resolveCoreVersion(Object.keys(coreVersions.versions), coreRange);
  if (!coreVersion) throw new Error("Cannot resolve tscircuit's published core dependency");
  const core = await metadata(`@tscircuit%2fcore/${coreVersion}`);
  const solverSpec = core.dependencies?.["@tscircuit/bus-lanes-solver"] ?? core.devDependencies?.["@tscircuit/bus-lanes-solver"];
  const solverVersion = solverSpec?.match(/(?:\/|^)(\d+\.\d+\.\d+)(?:\.tgz|$)/)?.[1];
  if (!solverVersion) throw new Error("Cannot identify core's exact bus-lanes solver version; inspect its release manually");
  const ready = Bun.semver.order(solverVersion, "0.0.15") >= 0;
  const report = { checkedAt: new Date().toISOString(), tscircuitVersion: tscircuit.version,
    coreRange, resolvedCoreVersion: coreVersion, solverSpec, solverVersion,
    requiredSolverVersion: ">=0.0.15", ready };
  mkdirSync("output", { recursive: true });
  writeFileSync("output/solver-release-status.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  process.exitCode = ready ? 0 : 3;
}
