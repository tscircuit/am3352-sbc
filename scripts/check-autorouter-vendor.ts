import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { SOLVERS } from "@tscircuit/core";
import { AutoroutingPipelineSolver9_PreloadedTraceGraph } from "@tscircuit/capacity-autorouter";

/** Verify both the committed package and the implementation used by core. */
export function verifyAutorouterVendor() {
  const directory = resolve(import.meta.dir, "../design/vendor");
  const provenance = JSON.parse(readFileSync(resolve(directory, "capacity-autorouter.provenance.json"), "utf8"));
  if (!/^[a-f0-9]{40}$/.test(provenance.sourceCommit))
    throw new Error("The native outer router must identify an exact source commit");
  const installedEntry = Bun.resolveSync("@tscircuit/capacity-autorouter", import.meta.dir);
  const installedRoot = resolve(dirname(installedEntry), "..");
  const installedPackage = JSON.parse(readFileSync(resolve(installedRoot, "package.json"), "utf8"));
  const declarations = installedPackage.types ?? installedPackage.typings ?? "dist/index.d.ts";
  if (typeof declarations !== "string")
    throw new Error("The native outer-router package must publish declarations");
  const packagePath = (file: string) => {
    const path = resolve(installedRoot, file);
    const local = relative(installedRoot, path);
    if (isAbsolute(file) || local === ".." || local.startsWith("../"))
      throw new Error(`Native outer-router manifest escapes its package: ${file}`);
    return path;
  };
  const coreEntry = Bun.resolveSync("@tscircuit/core", import.meta.dir);
  if (Bun.resolveSync("@tscircuit/capacity-autorouter", dirname(coreEntry)) !== installedEntry ||
    (SOLVERS.AutoroutingPipelineSolver9_PreloadedTraceGraph as unknown) !== AutoroutingPipelineSolver9_PreloadedTraceGraph)
    throw new Error("Core must use the committed native outer-router package");
  const files: [string, string][] = [
    [resolve(directory, provenance.packageFile), provenance.packageSha256],
    [installedEntry, provenance.bundleSha256],
    [packagePath(declarations), provenance.declarationsSha256],
    ...Object.entries(provenance.packageFiles ?? {}).map(([file, expected]): [string, string] => [packagePath(file), expected as string]),
  ];
  for (const evidence of [provenance.sourceArchive, provenance.sourcePatch]) {
    if (evidence) files.push([resolve(directory, evidence.file), evidence.sha256]);
  }
  if (declarations !== "dist/index.d.ts" && !provenance.packageFiles)
    throw new Error("The native outer-router declaration closure must have a complete file manifest");
  for (const [file, expected] of files) {
    if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected))
      throw new Error(`Native outer-router manifest has no SHA-256 for ${file}`);
    const actual = createHash("sha256").update(readFileSync(file)).digest("hex");
    if (actual !== expected) throw new Error(`Native outer-router hash mismatch: ${file}`);
  }
  return { sourceCommit: provenance.sourceCommit, packageFile: provenance.packageFile, verifiedFiles: files.length };
}

if (import.meta.main) console.log(JSON.stringify(verifyAutorouterVendor()));
