import { Circuit } from "@tscircuit/core";
import { Children, cloneElement, isValidElement } from "react";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FanoutTracePath } from "@tscircuit/props";
import Board from "../index.circuit";
import { compactRoutingInput } from "../design/compact-routing-input";

const outputArgument = process.argv.find(argument => argument.startsWith("--output-dir="));
const ddrArgument = process.argv.find(argument => argument.startsWith("--ddr-paths="));
const outputDirectory = resolve(outputArgument?.slice("--output-dir=".length) ?? "work/peripheral-routing/native");
const ddrPath = ddrArgument?.slice("--ddr-paths=".length);
const ddrRoutes: FanoutTracePath[] = ddrPath ? JSON.parse(readFileSync(resolve(ddrPath), "utf8")) : [];
if (ddrRoutes.length && ddrRoutes.length !== 47) throw new Error("Fresh fixed DDR capture requires exactly 47 accepted paths");
for (const trace of ddrRoutes) {
  for (const point of trace.route as any[]) {
    if (point.route_type === "wire" && !["top", "bottom"].includes(point.layer))
      throw new Error("DDR capture includes signal copper on an inner ground layer");
  }
}
mkdirSync(outputDirectory, { recursive: true });

// Diagnostic capture advances native phases without routing missing DDR or
// peripherals. It loads no cached signal paths unless explicitly supplied.
const noRoutes = async () => {
  let complete: ((result: { traces: [] }) => void) | undefined;
  return {
    on(event: string, handler: (result: { traces: [] }) => void) {
      if (event === "complete") complete = handler;
    },
    start() { complete?.({ traces: [] }); },
    stop() {},
  };
};
const board = Board({ ddrRoutes, routePeripherals: true, peripheralRoutes: [], freshRouting: true });
const children = Children.map(board.props.children, child => {
  if (!isValidElement(child) || child.type !== "autoroutingphase") return child;
  const props = child.props as Record<string, unknown>;
  if (props.name === "DDR_FIRST" && ddrRoutes.length) return child;
  return cloneElement(child, { autorouter: "bus_lanes", algorithmFn: noRoutes } as any);
});
const circuit = new Circuit();
circuit.schematicDisabled = true;
circuit.on("autorouting:start", event => {
  if (event.phaseName !== "USB_AND_TMDS") return;
  const input = compactRoutingInput(structuredClone(event.simpleRouteJson) as any);
  input.obstacles = input.obstacles.filter((obstacle: any) => !obstacle.isCopperPour);
  input.allowedLayers = ["top", "bottom"];
  for (const bus of input.buses ?? []) bus.allowedLayers = ["top", "bottom"];
  if (input.layerCount !== 4 || input.connections.length !== 24 || input.differentialPairs?.length !== 12)
    throw new Error("Expected 24 native peripheral connections, 12 differential pairs, and four physical layers");
  const native = circuit.getCircuitJson();
  const inputJson = JSON.stringify(input);
  const nativeJson = JSON.stringify(native);
  writeFileSync(resolve(outputDirectory, "input.simple-route.json"), inputJson);
  writeFileSync(resolve(outputDirectory, "native.circuit.json"), nativeJson);
  const capture = {
    phase: event.phaseName,
    diagnosticOnly: true,
    fixedDdrLoaded: ddrRoutes.length === 47,
    fixedDdrPath: ddrPath ? resolve(ddrPath) : null,
    inputSha256: createHash("sha256").update(inputJson).digest("hex"),
    nativeSha256: createHash("sha256").update(nativeJson).digest("hex"),
    connections: input.connections.length,
    physicalLayerCount: input.layerCount,
    allowedSignalLayers: input.allowedLayers,
    suppliedTraces: input.traces?.length ?? 0,
    nativeVias: native.filter(element => element.type === "pcb_via").length,
    obstacles: input.obstacles.length,
    buses: input.buses,
    differentialPairs: input.differentialPairs,
    note: ddrRoutes.length ? "Fresh supplied DDR must have independent acceptance before this capture is used for final peripheral routing." : "Local-feasibility input omits all DDR copper; it cannot establish full-board acceptance.",
  };
  writeFileSync(resolve(outputDirectory, "capture.json"), JSON.stringify(capture, null, 2) + "\n");
  console.log(JSON.stringify(capture));
  process.exit(0);
});
circuit.add(cloneElement(board, {}, children));
await circuit.renderUntilSettled();
throw new Error("No native peripheral routing input was emitted");
