// Optional local core build for validating an upstream fix without changing the lockfile.
const { Circuit }: typeof import("@tscircuit/core") = await import(process.env.SBC_CORE_PATH ?? "@tscircuit/core");
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg";
import { Resvg } from "@resvg/resvg-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { FanoutTracePath } from "@tscircuit/props";
import Board from "../index.circuit";

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
await mkdir("output", { recursive: true });
const ddrRoutes: FanoutTracePath[] =
  placementOnly || powerOnly
    ? []
    : JSON.parse(await readFile("design/ddr-routes.json", "utf8"));
if (!placementOnly && !powerOnly && ddrRoutes.length !== 47)
  console.warn(
    "DDR remains unrouted on the requested four-layer stackup; no incompatible cached copper will be loaded.",
  );
const circuit = new Circuit();
circuit.schematicDisabled = true;
const asyncErrors: string[] = [];
circuit.on("asyncEffect:end", (event) => {
  if (event.error) asyncErrors.push(event.error);
});
const pendingWrites: Promise<void>[] = [];
let phase = 0;
if (process.argv.includes("--debug"))
  circuit.on("renderable:renderLifecycle:anyEvent", (event) => {
    if (event.componentDisplayName.startsWith("<board"))
      console.log(event.type);
  });
circuit.on("autorouting:start", (event) => {
  if (process.argv.includes("--export-lcd") && event.simpleRouteJson.connections.length === 20) {
    require("node:fs").writeFileSync("output/lcd-signal-first.srj.json", JSON.stringify(event.simpleRouteJson));
    require("node:fs").writeFileSync("output/lcd-signal-first.circuit.json", JSON.stringify(circuit.getCircuitJson()));
    process.exit(0);
  }
  if (process.argv.includes("--export-pairs") && event.simpleRouteJson.connections.length === 24) {
    require("node:fs").writeFileSync("output/peripheral-signal-first.srj.json", JSON.stringify(event.simpleRouteJson));
    require("node:fs").writeFileSync("output/peripheral-signal-first.audit.json", JSON.stringify(circuit.getCircuitJson()));
    process.exit(0);
  }
  console.log(
    `Phase ${++phase}: ${event.autorouterName}, ${event.simpleRouteJson.connections.length} connections`,
  );
  pendingWrites.push(
    writeFile(
      `output/${stem}-phase-${phase}.srj.json`,
      JSON.stringify(event.simpleRouteJson, null, 2),
    ),
  );
});
circuit.on("autorouting:end", (event) => {
  if (event.pcbTracePaths)
    pendingWrites.push(
      writeFile(
        `output/${stem}-phase-${phase}.paths.json`,
        JSON.stringify(event.pcbTracePaths, null, 2),
      ),
    );
});
circuit.add(
  <Board
    ddrRoutes={ddrRoutes}
    routePeripherals={!ddrOnly && !powerOnly && !pairsOnly}
    peripheralRoutes={!process.argv.includes("--fresh-peripherals") && !ddrOnly && !powerOnly && !placementOnly ? JSON.parse(await readFile("design/peripheral-routes.json", "utf8")) : []}
    placementOnly={placementOnly}
  />,
);
await circuit.renderUntilSettled();
await Promise.all(pendingWrites);
const json = circuit.getCircuitJson();
await writeFile(`output/${stem}.circuit.json`, JSON.stringify(json, null, 2));
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
await writeFile(`output/${stem}-errors.json`, JSON.stringify(errors, null, 2));
await writeFile(
  `output/${stem}-summary.json`,
  JSON.stringify(summary, null, 2),
);
// Candidate checks use circuit JSON; render images only for requested previews.
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
const unexpectedCheckpointErrors = errors.filter(
  (e) =>
    !["pcb_port_not_connected_error", "pcb_trace_missing_error"].includes(
      e.type,
    ),
);
if (
  asyncErrors.length ||
  ((!ddrOnly || placementOnly) && errors.length) ||
  (ddrOnly && (ddrRoutes.length !== 47 || unexpectedCheckpointErrors.length))
)
  process.exitCode = 1;
