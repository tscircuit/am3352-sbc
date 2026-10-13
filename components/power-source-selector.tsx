import { powerHeaderModel } from "../models"
import type { PinHeaderProps } from "@tscircuit/props";

/** XFCN PZ254V-11-03P: 3 A, 2.54 mm pitch, 7.62 × 2.50 mm body.
 * Primary recommended drills are 1.02 mm for the 0.64 mm square contacts.
 * C2937625 is the stocked listing; the older C492402 is discontinued.
 * Fit a separate 3 A 2.54 mm shunt (BOOMELE / C5305) at pins 1–2 for USB.
 */
export function PowerSourceSelector(
  props: Omit<PinHeaderProps, "pinCount" | "pitch" | "footprint" | "pinLabels">,
) {
  return (
    <pinheader
      {...props}
      pinCount={3}
      pitch={2.54}
      manufacturerPartNumber="PZ254V-11-03P"
      supplierPartNumbers={{ jlcpcb: ["C2937625"] }}
      cadModel={powerHeaderModel}
      pinLabels={["USB", "VIN", "AUX"]}
      footprint={
        <footprint insertionDirection="from_above">
          <platedhole portHints={["pin1"]} shape="circular_hole_with_rect_pad" pcbX={-2.54} pcbY={0} holeDiameter={1.02} holeOffsetX={0} holeOffsetY={0} rectPadWidth={1.8} rectPadHeight={1.8} />
          <platedhole portHints={["pin2"]} shape="circle" pcbX={0} pcbY={0} holeDiameter={1.02} outerDiameter={1.8} />
          <platedhole portHints={["pin3"]} shape="circle" pcbX={2.54} pcbY={0} holeDiameter={1.02} outerDiameter={1.8} />
          <silkscreenpath route={[
            { x: -3.81, y: -1.25 }, { x: 3.81, y: -1.25 },
            { x: 3.81, y: 1.25 }, { x: -3.81, y: 1.25 },
            { x: -3.81, y: -1.25 },
          ]} />
          <silkscreentext text="1 USB" pcbX={-2.54} pcbY={2.1} fontSize={0.55} />
          <silkscreentext text="2 VIN" pcbX={0} pcbY={2.1} fontSize={0.55} />
          <silkscreentext text="3 AUX" pcbX={2.54} pcbY={2.1} fontSize={0.55} />
          <silkscreentext text="USB 1-2 / AUX 2-3" pcbX={0} pcbY={-2.15} fontSize={0.6} />
          <silkscreentext text="{NAME}" pcbX={0} pcbY={3.3} fontSize={0.65} />
          <courtyardoutline outline={[
            { x: -4.06, y: -1.5 }, { x: 4.06, y: -1.5 },
            { x: 4.06, y: 1.5 }, { x: -4.06, y: 1.5 },
            { x: -4.06, y: -1.5 },
          ]} />
        </footprint>
      }
    />
  );
}
