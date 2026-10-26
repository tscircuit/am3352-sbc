import type { ResistorProps } from "@tscircuit/props";

/** Exact stocked UART series part, also used by the corrected assembly BOM.
 * C25076 is 100 ohms; the similarly numbered C25086 is 1 ohm.
 */
export function UartSeriesResistor(
  props: Omit<ResistorProps, "resistance" | "footprint">,
) {
  return (
    <resistor
      {...props}
      resistance="100"
      tolerance="1%"
      footprint="0402"
      manufacturerPartNumber="0402WGF1000TCE"
      supplierPartNumbers={{ jlcpcb: ["C25076"] }}
    />
  );
}
