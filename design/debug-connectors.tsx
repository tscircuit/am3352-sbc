import { sch } from "../schematic/layout";
import { Fragment } from "react";
import { StandardJstUartUpward } from "../components/debug-uart";
import { UartIoffBuffer } from "../components/uart-ioff-buffer";
import { UartSeriesResistor } from "../components/uart-series-resistor";
import { link } from "./nets";

/** Standard ARM 20-pin JTAG, following SEGGER's 20-pin J-Link pinout. */
export const jtagPinNets = [
  "V3V3", undefined, "TRSTn", "GND", "TDI", "GND", "TMS", "GND",
  "TCK", "GND", "GND", "GND", "TDO", "GND", "WARMRSTn", "GND",
  undefined, "GND", undefined, "GND",
] as const;
const jtagPinLabels = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [
  `pin${i + 1}`, [i === 0 ? "VTREF" : i === 10 ? "RTCK_GND" : jtagPinNets[i] ?? `NC${i + 1}`],
]));

export interface DebugConnectorPlacement {
  pcbX: number;
  pcbY: number;
  pcbRotation?: number;
  layer?: "top" | "bottom";
}

/** New buffer/decoupler positions must be chosen before source integration.
 * Existing UART, series-resistor, ARM20 and reset footprints are preserved.
 */
export function DebugConnectors({
  uartBuffer,
  uartDecoupler,
}: {
  uartBuffer: DebugConnectorPlacement;
  uartDecoupler: DebugConnectorPlacement;
}) {
  return (
    <>
      <StandardJstUartUpward name="J_UART" {...sch("J_UART")} role="target" pcbX={-8} pcbY={34} />
      <UartSeriesResistor name="R_UART_RX" {...sch("R_UART_RX")} pcbX={-9.5} pcbY={29.4} />
      <UartSeriesResistor name="R_UART_TX" {...sch("R_UART_TX")} pcbX={-6.5} pcbY={29.4} />
      {link("R_UART_RX", "pin1", "UART0_RXD")}
      {link("R_UART_RX", "pin2", "UART0_RXD_DEBUG")}
      {link("R_UART_TX", "pin1", "UART0_TXD")}
      {link("R_UART_TX", "pin2", "UART0_TXD_DEBUG")}
      {link("J_UART", "pin1", "UART0_RXD_CABLE")}
      {link("J_UART", "pin2", "GND")}
      {link("J_UART", "pin3", "UART0_TXD_CABLE")}
      {/* Ioff isolates the unpowered SBC from an active UART cable. It does
          not sense or isolate an unpowered programmer on the opposite end. */}
      <UartIoffBuffer name="U_UARTBUF" {...sch("U_UARTBUF")} {...uartBuffer} />
      {link("U_UARTBUF", "OE1n", "GND")}
      {link("U_UARTBUF", "A1", "UART0_RXD_CABLE")}
      {link("U_UARTBUF", "Y1", "UART0_RXD_DEBUG")}
      {link("U_UARTBUF", "GND", "GND")}
      {link("U_UARTBUF", "Y2", "UART0_TXD_CABLE")}
      {link("U_UARTBUF", "A2", "UART0_TXD_DEBUG")}
      {link("U_UARTBUF", "OE2n", "GND")}
      {link("U_UARTBUF", "VCC", "V3V3")}
      <capacitor
        name="C_UARTBUF" {...sch("C_UARTBUF")}
        capacitance="100nF"
        manufacturerPartNumber="CL05B104KO5NNNC"
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        maxVoltageRating={16}
        footprint="0402"
        {...uartDecoupler}
      />
      {link("C_UARTBUF", "pin1", "V3V3")}
      {link("C_UARTBUF", "pin2", "GND")}

      {/* XFCN PA6T 2x10 header; its actual 25.4x5.0 mm body fits here.
          Pin 19 is a possible +5 V probe output and MUST stay unconnected.
          Pin 11 is grounded because AM3352 has no RTCK output.
          EMU0/EMU1 retain the processor's local pullups, not ARM DBGRQ pins.
          Topview: pin1 upper-left,2 upper-right,3 next-row down-left.
          This chirality matches ARM20 and supplier orientation by rotation,
          not reflection. Check cable pin1; no pin is cut. */}
      <connector
        name="J_JTAG" {...sch("J_JTAG")}
        pinCount={20}
        pinLabels={jtagPinLabels}
        pcbX={-36}
        pcbY={26.5}
        manufacturerPartNumber="PZ254V-12-20P"
        supplierPartNumbers={{ jlcpcb: ["C492427"] }}
        noConnect={["pin2", "pin17", "pin19"]}
        footprint={
          <footprint insertionDirection="from_above">
            {Array.from({ length: 20 }, (_, i) => (
              <Fragment key={i}>
                {i === 0 ? (
                  <platedhole portHints={["pin1"]} shape="circular_hole_with_rect_pad" pcbX={-1.27} pcbY={11.43} holeDiameter={1.02} holeOffsetX={0} holeOffsetY={0} rectPadWidth={1.8} rectPadHeight={1.8} />
                ) : (
                  <platedhole portHints={[`pin${i + 1}`]} shape="circle" pcbX={((i % 2) - 0.5) * 2.54} pcbY={(4.5 - Math.floor(i / 2)) * 2.54} holeDiameter={1.02} outerDiameter={1.8} />
                )}
              </Fragment>
            ))}
            <silkscreenpath route={[{ x: -2.5, y: -12.7 }, { x: 2.5, y: -12.7 }, { x: 2.5, y: 12.7 }, { x: -2.5, y: 12.7 }, { x: -2.5, y: -12.7 }]} />
            <silkscreentext text="1" pcbX={-3.6} pcbY={11.43} fontSize={0.7} />
            <silkscreentext text="ARM20 JTAG" pcbX={4.0} pcbY={0} pcbRotation={90} fontSize={0.7} />
            <courtyardoutline outline={[{ x: -2.75, y: -12.95 }, { x: 2.75, y: -12.95 }, { x: 2.75, y: 12.95 }, { x: -2.75, y: 12.95 }, { x: -2.75, y: -12.95 }]} />
          </footprint>
        }
      />
      {jtagPinNets.map((net, i) => net ? link("J_JTAG", `pin${i + 1}`, net) : null)}

      {/* XFCN PZ254V-11-02P: 5.08x2.5 mm body, 1.02 mm recommended drills. */}
      <pinheader
        name="J_RESET" {...sch("J_RESET")}
        pinCount={2}
        pitch={2.54}
        pcbX={-31}
        pcbY={8}
        manufacturerPartNumber="PZ254V-11-02P"
        supplierPartNumbers={{ jlcpcb: ["C492401"] }}
        footprint={
          <footprint insertionDirection="from_above">
            <platedhole portHints={["pin1"]} shape="circular_hole_with_rect_pad" pcbX={-1.27} pcbY={0} holeDiameter={1.02} holeOffsetX={0} holeOffsetY={0} rectPadWidth={1.8} rectPadHeight={1.8} />
            <platedhole portHints={["pin2"]} shape="circle" pcbX={1.27} pcbY={0} holeDiameter={1.02} outerDiameter={1.8} />
            <silkscreenpath route={[{ x: -2.54, y: -1.25 }, { x: 2.54, y: -1.25 }, { x: 2.54, y: 1.25 }, { x: -2.54, y: 1.25 }, { x: -2.54, y: -1.25 }]} />
            <silkscreentext text="RESET" pcbX={0} pcbY={2.1} fontSize={0.65} />
            <silkscreentext text="1" pcbX={-3.5} pcbY={0} fontSize={0.7} />
            <courtyardoutline outline={[{ x: -2.79, y: -1.5 }, { x: 2.79, y: -1.5 }, { x: 2.79, y: 1.5 }, { x: -2.79, y: 1.5 }, { x: -2.79, y: -1.5 }]} />
          </footprint>
        }
      />
      {link("J_RESET", "pin1", "WARMRSTn")}
      {link("J_RESET", "pin2", "GND")}
    </>
  );
}
