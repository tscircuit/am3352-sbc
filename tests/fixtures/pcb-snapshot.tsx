import { Circuit } from "@tscircuit/core";
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg";
import { cloneElement } from "react";
import Board from "../../index.circuit";

export const pcbLayers = ["top", "inner1", "inner2", "bottom"] as const;

/** Replay authored/saved copper; CI does not rerun a long autorouter search.
 * This is a DDR checkpoint, not complete-board routing signoff. */
export async function renderPcbCheckpoint() {
  const circuit = new Circuit();
  circuit.schematicDisabled = true;
  // Replay DDR_FIRST, but leave unrelated unphased connections unrouted.
  // The full-board audit remains the separate signoff gate.
  const noPeripheralRoutes = async () => {
    let complete: ((result: { traces: [] }) => void) | undefined;
    return {
      on(event: string, handler: (result: { traces: [] }) => void) {
        if (event === "complete") complete = handler;
      },
      start() { complete?.({ traces: [] }); },
      stop() {},
    };
  };
  circuit.add(cloneElement(Board({ routePeripherals: false }), {
    autorouter: { algorithmFn: noPeripheralRoutes },
  }));
  await circuit.renderUntilSettled();
  return circuit.getCircuitJson();
}

export function pcbLayerSvg(json: Awaited<ReturnType<typeof renderPcbCheckpoint>>, layer: typeof pcbLayers[number]) {
  return convertCircuitJsonToPcbSvg(json, {
    layer, width: 1600, height: 1280, hiddenLayerOpacity: 0,
    includeVersion: false, shouldDrawRatsNest: false, shouldDrawErrors: false,
  });
}
