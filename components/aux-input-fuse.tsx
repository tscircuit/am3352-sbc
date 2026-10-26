import { auxFuseModel } from "../models"
import type { FuseProps } from "@tscircuit/props";

/** Littelfuse 0467001.NRHF / C151139, fast 1 A, 32 V, 0603.
 * Manufacturer reflow pattern: 0.762 × 1.09 mm lands, 1.02 mm inner gap.
 * The 1 A rating supports at most 0.75 A normal continuous current at 25 °C
 * after the documented 25% derating. Apply additional hot derating.
 * A fuse is not a precise current limiter; input/load limits are separate.
 */
export function AuxInputFuse(
  props: Omit<FuseProps, "currentRating" | "voltageRating" | "footprint">,
) {
  return (
    <fuse
      {...props}
      currentRating={1}
      voltageRating={32}
      manufacturerPartNumber="0467001.NRHF"
      supplierPartNumbers={{ jlcpcb: ["C151139"] }}
      cadModel={auxFuseModel}
      footprint={
        <footprint>
          <smtpad portHints={["pin1"]} pcbX={-0.891} pcbY={0} width={0.762} height={1.09} shape="rect" />
          <smtpad portHints={["pin2"]} pcbX={0.891} pcbY={0} width={0.762} height={1.09} shape="rect" />
          <silkscreentext text="{NAME}" pcbX={0} pcbY={1.25} fontSize={0.6} />
          <courtyardoutline outline={[
            { x: -1.525, y: -0.8 }, { x: 1.525, y: -0.8 },
            { x: 1.525, y: 0.8 }, { x: -1.525, y: 0.8 },
            { x: -1.525, y: -0.8 },
          ]} />
        </footprint>
      }
    />
  );
}
