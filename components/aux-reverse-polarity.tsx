import { auxPmosModel } from "../models"
import { PmosSymbol } from "./pmos-symbol";
import type { ChipProps } from "@tscircuit/props";

const pinLabels = { pin1: ["G"], pin2: ["S"], pin3: ["D"] } as const;

/** Verified Toshiba SOT-23F primary land pattern, matching corrected Q_PD.
 * Reverse-polarity usage is D = fused input, S = protected output, G = GND.
 * The input-to-output body diode starts the positive supply; a negative
 * input leaves the diode and channel off. This is not overvoltage protection.
 */
export function AuxReversePolarityPmos(props: ChipProps<typeof pinLabels>) {
  return (
    <chip
      {...props}
      symbol={<PmosSymbol name={props.name ?? "Q_AUX"} value="SSM3J338R,LF" />}
      pinLabels={pinLabels}
      manufacturerPartNumber="SSM3J338R,LF"
      supplierPartNumbers={{ jlcpcb: ["C146352"] }}
      cadModel={auxPmosModel}
      footprint={
        <footprint>
          <smtpad portHints={["pin1"]} pcbX={-1.05} pcbY={0.95} width={0.9} height={0.8} shape="rect" solderPasteMargin={0} />
          <smtpad portHints={["pin2"]} pcbX={-1.05} pcbY={-0.95} width={0.9} height={0.8} shape="rect" solderPasteMargin={0} />
          <smtpad portHints={["pin3"]} pcbX={1.05} pcbY={0} width={0.9} height={0.8} shape="rect" solderPasteMargin={0} />
          <silkscreenpath strokeWidth={0.15} route={[
            { x: -0.95, y: 1.55 }, { x: 0.95, y: 1.55 },
            { x: 0.95, y: -1.55 }, { x: -0.95, y: -1.55 },
            { x: -0.95, y: 1.55 },
          ]} />
          <silkscreencircle pcbX={-1.55} pcbY={2} radius={0.12} strokeWidth={0.15} />
          <courtyardoutline outline={[
            { x: -2.05, y: 1.5 }, { x: -1.05, y: 1.5 },
            { x: -1.05, y: 1.7 }, { x: 1.05, y: 1.7 },
            { x: 1.05, y: 0.55 }, { x: 2.05, y: 0.55 },
            { x: 2.05, y: -0.55 }, { x: 1.05, y: -0.55 },
            { x: 1.05, y: -1.7 }, { x: -1.05, y: -1.7 },
            { x: -1.05, y: -1.5 }, { x: -2.05, y: -1.5 },
            { x: -2.05, y: -0.39 }, { x: -1.05, y: -0.39 },
            { x: -1.05, y: 0.39 }, { x: -2.05, y: 0.39 },
            { x: -2.05, y: 1.5 },
          ]} />
        </footprint>
      }
    />
  );
}
