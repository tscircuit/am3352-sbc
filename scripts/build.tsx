import type { FanoutTracePath } from "@tscircuit/props";
import { Circuit } from "@tscircuit/core";
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg";
import { Resvg } from "@resvg/resvg-js";
import Board from "../ddr.circuit";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("output", { recursive: true });
const circuit = new Circuit();
circuit.schematicDisabled = true;
let savedPaths: FanoutTracePath[] | undefined;
const asyncErrors: string[] = [];
circuit.on("asyncEffect:end", (event) => {
  if (event.error) asyncErrors.push(event.error);
});
circuit.on("autorouting:start", (event) => {
  void writeFile(
    "output/ddr.srj.json",
    JSON.stringify(event.simpleRouteJson, null, 2),
  );
  console.log(
    "Routing:",
    event.simpleRouteJson.connections.length,
    "connections",
  );
});
circuit.on("autorouting:end", (event) => {
  if (event.pcbTracePaths) {
    savedPaths = event.pcbTracePaths as FanoutTracePath[];
  }
});
circuit.add(<Board />);
await circuit.renderUntilSettled();
const json = circuit.getCircuitJson();
await writeFile("output/ddr.circuit.json", JSON.stringify(json, null, 2));
const errors = json.filter((e) => e.type.endsWith("_error"));
console.log(
  JSON.stringify(
    {
      elements: json.length,
      traces: json.filter((e) => e.type === "pcb_trace").length,
      errors: errors.length,
      firstErrors: errors.slice(0, 3),
    },
    null,
    2,
  ),
);
for (const layer of ["top", "inner1", "inner2", "bottom"] as const) {
  const svg = convertCircuitJsonToPcbSvg(json, {
    layer,
    width: 1200,
    height: 1200,
    hiddenLayerOpacity: 0.05,
  });
  await writeFile(`output/ddr-${layer}.svg`, svg);
  await writeFile(`output/ddr-${layer}.png`, new Resvg(svg).render().asPng());
}
const blockers = errors.filter(
  (e) =>
    !["pcb_port_not_connected_error", "pcb_trace_missing_error"].includes(
      e.type,
    ) &&
    !(
      e.type === "pcb_trace_error" &&
      e.message.includes("has dangling endpoint")
    ),
);
if (blockers.length || asyncErrors.length || savedPaths?.length !== 47) {
  console.error({ asyncErrors, savedRouteCount: savedPaths?.length });
  process.exitCode = 1;
} else {
  await writeFile(
    "design/ddr-routes.json",
    JSON.stringify(savedPaths, null, 2),
  );
}
