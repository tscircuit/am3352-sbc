import { Fragment } from "react";
import { phaseForNet } from "./nets";
import { DDR_RULES, ddrTimingGroups, ddrPairs } from "./ddr-rules";
import { cpuConnections } from "./ddr-netlist";

// Disjoint layer cohorts retain one shared length window for each original bus.
const ddrLayerGroups = ddrTimingGroups.flatMap((group) => {
  const cohorts: Record<"top" | "bottom", string[]> = { top: [], bottom: [] };
  for (const signal of group.signals) {
    const pin = cpuConnections.find((connection) => connection.net === signal)?.pin;
    if (!pin) throw new Error(`No CPU terminal for DDR signal ${signal}`);
    cohorts[/^[A-Z]+[12]$/.test(pin) ? "top" : "bottom"].push(signal);
  }
  return (["top", "bottom"] as const)
    .filter((layer) => cohorts[layer].length > 0)
    .map((layer) => ({ group, layer, signals: cohorts[layer] }));
});

export function TimingConstraints() {
  return (
    <>
      {ddrLayerGroups.map(({ group, layer, signals }) => (
        <Fragment key={`${group.name}_${layer}`}>
        <bus
          name={`${group.name}_${layer.toUpperCase()}`}
          connections={signals}
          routingPhaseIndex={phaseForNet(group.signals[0])}
          maxLengthSkew={group.maxLengthSkew}
          targetLength={{
            reference: "longest_manhattan",
            of: group.signals,
            offset: DDR_RULES.caManhattanAllowanceMm - group.maxLengthSkew / 2,
          }}
          lengthTolerance={group.maxLengthSkew / 2}
          pcbTraceWidth={DDR_RULES.provisionalTraceWidthMm}
          pcbAllowedLayers={[layer]}
          targetImpedance={DDR_RULES.singleEndedImpedanceOhm}
        />
        </Fragment>
      ))}
      {ddrPairs.map((pair) => (
        <Fragment key={pair.name}>
        <differentialpair
          name={pair.name}
          positiveConnection={pair.signals[0]}
          negativeConnection={pair.signals[1]}
          maxLengthSkew={DDR_RULES.pairSkewMm}
          targetDifferentialImpedance={DDR_RULES.differentialImpedanceOhm}
          pcbTraceGap={DDR_RULES.provisionalPairGapMm}
        />
        </Fragment>
      ))}
      {/* RESET# is not in TI Table 7-67's clocked ADDR_CTRL class. */}
      <bus
        name="DDR_RESET_LAYER"
        connections={["DDR_RESETn_SIGNAL"]}
        pcbAllowedLayers={[...DDR_RULES.signalLayers]}
      />
    </>
  );
}
