import type { ChipProps } from "@tscircuit/props";
import { Fragment } from "react";

// Nexperia Rev.18 transparent top view: the Y channels are crossed on
// physical pins 3 and 6. Do not substitute a sequential channel pin map.
const pinLabels = {
  pin1: ["OE1n"], pin2: ["A1"], pin3: ["Y2"], pin4: ["GND"],
  pin5: ["A2"], pin6: ["Y1"], pin7: ["OE2n"], pin8: ["VCC"],
} as const;

// Actual C513290 supplier PAD scalar coordinates, rotated (not reflected)
// into the same standard top view as the primary Nexperia pin diagram.
const supplierPads = [
  { pin: 1, x: -1.900047, y: 0.975106 },
  { pin: 2, x: -1.900047, y: 0.324866 },
  { pin: 3, x: -1.900047, y: -0.32512 },
  { pin: 4, x: -1.900047, y: -0.975106 },
  { pin: 5, x: 1.900047, y: -0.975106 },
  { pin: 6, x: 1.900047, y: -0.32512 },
  { pin: 7, x: 1.900047, y: 0.324866 },
  { pin: 8, x: 1.900047, y: 0.975106 },
] as const;

/** Nexperia 74LVC2G125DP,125 / C513290, TSSOP8 SOT505-2.
 * 0.65 mm pitch; 3 × 3 mm nominal body; 3.9–4.1 mm terminal span.
 * Ioff is ±2 µA maximum at VCC = 0, VI or VO = 5.5 V, -40…125 °C.
 * Use 3.3 V UART signals; this does not protect an unpowered programmer.
 * The supplied TSSOP-8_L3.0-W3.0-P0.65-LS4.0-BL lands are copied from
 * actual C513290 EasyEDA package 1eb10117ac104e3ba97b59819102f46a. Dimensions
 * and transformed centers preserve the supplier PAD scalar values.
 * This is a supplier land pattern, not a manufacturer-recommended pattern.
 */
export function UartIoffBuffer(props: ChipProps<typeof pinLabels>) {
  return (
    <chip
      {...props}
      pinLabels={pinLabels}
      pinAttributes={{ pin4: { requiresGround: true }, pin8: { requiresPower: true } }}
      manufacturerPartNumber="74LVC2G125DP,125"
      supplierPartNumbers={{ jlcpcb: ["C513290"] }}
      footprint={
        <footprint>
          {supplierPads.map(({ pin, x, y }) => {
            return (
              <Fragment key={pin}>
                <smtpad
                  portHints={[`pin${pin}`]}
                  shape="rect"
                  pcbX={x}
                  pcbY={y}
                  width={0.999998}
                  height={0.4064}
                />
              </Fragment>
            );
          })}
          <silkscreenpath strokeWidth={0.15} route={[{ x: -1.45, y: 1.65 }, { x: 1.45, y: 1.65 }]} />
          <silkscreenpath strokeWidth={0.15} route={[{ x: -1.45, y: -1.65 }, { x: 1.45, y: -1.65 }]} />
          <silkscreencircle pcbX={-1.65} pcbY={1.6} radius={0.1} strokeWidth={0.15} />
          <silkscreentext text="{NAME}" pcbX={0} pcbY={2.55} fontSize={0.65} />
          <courtyardoutline outline={[
            { x: -2.65, y: -1.8 }, { x: 2.65, y: -1.8 },
            { x: 2.65, y: 1.8 }, { x: -2.65, y: 1.8 },
            { x: -2.65, y: -1.8 },
          ]} />
        </footprint>
      }
    />
  );
}
