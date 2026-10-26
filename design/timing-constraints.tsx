import { Fragment } from "react";
import { phaseForNet } from "./nets";
import { DDR_RULES, ddrTimingGroups, ddrPairs } from "./ddr-rules";

export function TimingConstraints() {
  return (
    <>
      {ddrTimingGroups.map((group) => (
        <Fragment key={group.name}>
        <bus
          name={group.name}
          connections={group.signals}
          routingPhaseIndex={phaseForNet(group.signals[0])}
          maxLengthSkew={group.maxLengthSkew}
          {...(group.name === "DDR_ADDR_CTRL_CK" ? {
            // TI Table 7-68: CACLM = longest Manhattan + 300 mil, +/-50 mil.
            targetLength: {
              reference: "longest_manhattan" as const,
              of: group.signals,
              offset: DDR_RULES.caManhattanAllowanceMm,
            },
            lengthTolerance: DDR_RULES.caNominalToleranceMm,
            maxLength: DDR_RULES.caMaximumLengthMm,
          } : {
            // TI Table 7-69: data bytes use their own DQLM, without CA's allowance.
            maxLength: {
              reference: "longest_manhattan" as const,
              of: group.signals,
            },
          })}
          pcbTraceWidth={DDR_RULES.provisionalTraceWidthMm}
          pcbAllowedLayers={[...DDR_RULES.signalLayers]}
          preferredLayer={group.name.startsWith("DDR_BYTE") ? "top" : "bottom"}
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
