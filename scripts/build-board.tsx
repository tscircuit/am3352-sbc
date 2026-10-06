// Optional local core build for validating an upstream fix without changing the lockfile.
const { Circuit }: typeof import("@tscircuit/core") = await import(process.env.SBC_CORE_PATH ?? "@tscircuit/core");
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg";
import { Resvg } from "@resvg/resvg-js";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import type { FanoutTracePath } from "@tscircuit/props";
import Board from "../index.circuit";
import { verifyAutorouterVendor } from "./check-autorouter-vendor";
import { verifyFanoutVendor } from "./check-fanout-vendor";

verifyAutorouterVendor();
verifyFanoutVendor();

const pairsOnly = process.argv.includes("--pairs-only");
const powerOnly = process.argv.includes("--power-only");
const placementOnly = process.argv.includes("--placement");
const ddrOnly = process.argv.includes("--ddr-only");
const stem = pairsOnly ? "board-pairs" : powerOnly
  ? "power-escapes"
  : placementOnly
    ? "placement"
    : ddrOnly
      ? "board-ddr"
      : "board";
// Failed and partial attempts stay in work/. Published output is replaced only
// after the complete four-layer board passes the physical routing audit.
const candidateDir = process.env.SBC_BUILD_WORK_DIR ?? join("work", "builds", stem);
await mkdir(candidateDir, { recursive: true });
const ddrRoutes: FanoutTracePath[] =
  placementOnly || powerOnly
    ? []
    : JSON.parse(await readFile("design/ddr-routes.json", "utf8"));
if (!placementOnly && !powerOnly && (
  ddrRoutes.length !== 47 || ddrRoutes.some(path => path.route.some(point =>
    point.route_type === "wire" && !["top", "bottom"].includes(
      typeof point.layer === "string" ? point.layer : point.layer.name
    )
  ))
)) throw new Error("Build requires all 47 validated outer-layer DDR routes; run route:ddr-outer first.");
const circuit = new Circuit();
circuit.schematicDisabled = true;
const asyncErrors: string[] = [];
circuit.on("asyncEffect:end", (event) => {
  if (event.error) asyncErrors.push(event.error);
});
const pendingWrites: Promise<void>[] = [];
const phaseManifest: { sequence: number; name: string | null; connections: number; paths?: string }[] = [];
let phase = 0;
let lastProgressAt = 0;
if (process.argv.includes("--debug"))
  circuit.on("renderable:renderLifecycle:anyEvent", (event) => {
    if (event.componentDisplayName.startsWith("<board"))
      console.log(event.type);
  });
circuit.on("autorouting:progress", event => {
  if (performance.now() - lastProgressAt < 15000) return;
  lastProgressAt = performance.now();
  console.log(JSON.stringify({ event: "routing-progress", phase: event.phaseName, progress: event.progress }));
});
circuit.on("autorouting:start", (event) => {
  if (process.argv.includes("--export-lcd") && event.simpleRouteJson.connections.length === 20) {
    require("node:fs").writeFileSync(join(candidateDir, "lcd-signal-first.srj.json"), JSON.stringify(event.simpleRouteJson));
    require("node:fs").writeFileSync(join(candidateDir, "lcd-signal-first.circuit.json"), JSON.stringify(circuit.getCircuitJson()));
    process.exit(0);
  }
  if (process.argv.includes("--export-pairs") && event.simpleRouteJson.connections.length === 24) {
    require("node:fs").writeFileSync(join(candidateDir, "peripheral-signal-first.srj.json"), JSON.stringify(event.simpleRouteJson));
    require("node:fs").writeFileSync(join(candidateDir, "peripheral-signal-first.audit.json"), JSON.stringify(circuit.getCircuitJson()));
    process.exit(0);
  }
  console.log(
    `Phase ${++phase} ${event.phaseName ?? ""}: ${event.autorouterName}, ${event.simpleRouteJson.connections.length} connections`,
  );
  phaseManifest.push({ sequence: phase, name: event.phaseName ?? null, connections: event.simpleRouteJson.connections.length });
  pendingWrites.push(
    writeFile(
      join(candidateDir, `${stem}-phase-${phase}.srj.json`),
      JSON.stringify(event.simpleRouteJson, null, 2),
    ),
  );
});
circuit.on("autorouting:end", (event) => {
  if (event.pcbTracePaths) {
    phaseManifest[phaseManifest.length - 1].paths = `${stem}-phase-${phase}.paths.json`;
    pendingWrites.push(
      writeFile(
        join(candidateDir, `${stem}-phase-${phase}.paths.json`),
        JSON.stringify(event.pcbTracePaths, null, 2),
      ),
    );
  }
});
circuit.add(
  <Board
    ddrRoutes={ddrRoutes}
    routePeripherals={!ddrOnly && !powerOnly && !pairsOnly}
    peripheralRoutes={[]}
    placementOnly={placementOnly}
    freshRouting={process.argv.includes("--fresh") ? true : undefined}
  />,
);
await circuit.renderUntilSettled();
await Promise.all(pendingWrites);
await writeFile(join(candidateDir, "phase-manifest.json"), JSON.stringify(phaseManifest, null, 2));
const json = circuit.getCircuitJson();
await writeFile(join(candidateDir, `${stem}.circuit.json`), JSON.stringify(json, null, 2));
const errors = json.filter((e) => e.type.endsWith("_error"));
const summary = {
  stage: stem,
  asyncErrors,
  components: json.filter((e) => e.type === "source_component").length,
  sourceTraces: json.filter((e) => e.type === "source_trace").length,
  pcbTraces: json.filter((e) => e.type === "pcb_trace").length,
  errorCounts: Object.fromEntries(
    [...new Set(errors.map((e) => e.type))].map((type) => [
      type,
      errors.filter((e) => e.type === type).length,
    ]),
  ),
};
console.log(JSON.stringify(summary, null, 2));
await writeFile(join(candidateDir, `${stem}-errors.json`), JSON.stringify(errors, null, 2));
await writeFile(
  join(candidateDir, `${stem}-summary.json`),
  JSON.stringify(summary, null, 2),
);
const completeBuild = !pairsOnly && !powerOnly && !placementOnly && !ddrOnly;
if (asyncErrors.length || (completeBuild && errors.length)) {
  console.error(`Routing failed; diagnostics saved in ${candidateDir}`);
  process.exit(1);
}
if (!completeBuild) {
  console.log(`Partial build saved in ${candidateDir}; no routed board was published.`);
  process.exit(0);
}
const { auditRoutedBoard } = await import("./audit-routed-board");
const audit = await auditRoutedBoard(json);
await writeFile(join(candidateDir, "routing-audit.json"), JSON.stringify(audit, null, 2));
if (!audit.pass) {
  console.error(JSON.stringify(audit.failures, null, 2));
  throw new Error(`Full-board routing audit failed; diagnostics saved in ${candidateDir}`);
}
await mkdir("output", { recursive: true });
for (const file of [`${stem}.circuit.json`, `${stem}-summary.json`, `${stem}-errors.json`, "routing-audit.json"])
  await copyFile(join(candidateDir, file), join("output", file));
// Render previews only for the complete, audited board.
if (!process.argv.includes("--no-images")) {
for (const layer of ["top", "inner1", "inner2", "bottom"] as const) {
  const svg = convertCircuitJsonToPcbSvg(json, {
    layer,
    width: 1500,
    height: 1200,
    hiddenLayerOpacity: 0.08,
  });
  await writeFile(`output/${stem}-${layer}.svg`, svg);
  await writeFile(
    `output/${stem}-${layer}.png`,
    new Resvg(svg).render().asPng(),
  );
}
}
console.log("Complete outer-layer board passed the physical routing audit.");
