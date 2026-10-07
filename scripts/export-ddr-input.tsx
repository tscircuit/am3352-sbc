import { Circuit } from "@tscircuit/core";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Board from "../index.circuit";
import { hydrateNativeFixedCopper } from "../design/native-fixed-copper";
import { compactRoutingInput } from "../design/compact-routing-input";

const outputArgument = process.argv.find(argument => argument.startsWith("--output-dir="));
const outputDirectory = resolve(outputArgument?.slice("--output-dir=".length) ?? "work/ddr-routing/native");
mkdirSync(outputDirectory, { recursive: true });
const circuit = new Circuit();
circuit.schematicDisabled = true;
circuit.on("autorouting:start", event => {
  if (event.phaseName !== "DDR_FIRST") return;
  if (event.simpleRouteJson.connections.length !== 47)
    throw new Error(`Native DDR phase has ${event.simpleRouteJson.connections.length} connections; expected47`);
  const native = circuit.getCircuitJson();
  const hydrated = hydrateNativeFixedCopper(event.simpleRouteJson, native);
  const input = compactRoutingInput(hydrated.input);
  const inputJson = JSON.stringify(input);
  const nativeJson = JSON.stringify(native);
  writeFileSync(resolve(outputDirectory, "input.simple-route.json"), inputJson);
  writeFileSync(resolve(outputDirectory, "native.circuit.json"), nativeJson);
  writeFileSync(resolve(outputDirectory, "capture.json"), JSON.stringify({
    phase: event.phaseName,
    inputSha256: createHash("sha256").update(inputJson).digest("hex"),
    nativeSha256: createHash("sha256").update(nativeJson).digest("hex"),
    connections: input.connections.length,
    physicalLayerCount: input.layerCount,
    suppliedTraces: input.traces?.length ?? 0,
    suppliedVias: native.filter(element => element.type === "pcb_via").length,
    obstacles: input.obstacles.length,
    buses: input.buses?.map((bus: any) => ({ name: bus.name ?? bus.busId, members: bus.connectionNames.length, maxLengthSkew: bus.maxLengthSkew, allowedLayers: bus.allowedLayers })),
    savedDdrCopperLoaded: false,
    fixedCopperHydration: hydrated.proof,
    note: "Fresh native pre-routing input. This capture is diagnostic input, not a routed artifact.",
  }, null, 2) + "\n");
  console.log(JSON.stringify({ outputDirectory, connections: input.connections.length, physicalLayerCount: input.layerCount, suppliedTraces: input.traces?.length ?? 0, nativeVias: native.filter(element => element.type === "pcb_via").length }));
  process.exit(0);
});
circuit.add(<Board ddrRoutes={[]} peripheralRoutes={[]} solveDdr />);
await circuit.renderUntilSettled();
throw new Error("No native DDR routing input was emitted");
