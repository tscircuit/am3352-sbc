import type { ChipProps } from "@tscircuit/props";

const targetPinLabels = { pin1: ["RX"], pin2: ["GND"], pin3: ["TX"] } as const;
const hostPinLabels = { pin1: ["TX"], pin2: ["GND"], pin3: ["RX"] } as const;

/**
 * JST SH, 1 mm, BM03B-SRSS-TB(LF)(SN). Pad dimensions and numbering are
 * verified against standard-jst-programmer@0.8.0 / JstSwdUpward.tsx.
 * Target pin 1 RX mates with programmer J5 pin 1 TX in a straight cable.
 * This connector carries 3.3 V UART signals and ground, never target power.
 */
export function StandardJstUartUpward({
  role = "target",
  ...props
}: Omit<ChipProps, "footprint" | "pinLabels"> & { role?: "target" | "host" }) {
  const labels = role === "host" ? ["TX", "GND", "RX"] : ["RX", "GND", "TX"];
  return (
    <connector
      {...props}
      standard="jst_sh"
      pinCount={3}
      pinLabels={role === "host" ? hostPinLabels : targetPinLabels}
      manufacturerPartNumber="BM03B-SRSS-TB(LF)(SN)"
      supplierPartNumbers={{ jlcpcb: ["C160389"] }}
      footprint={
        <footprint insertionDirection="from_above">
          <smtpad portHints={["pin1"]} pcbX={1.000125} pcbY={1.3250037} width={0.5999988} height={1.5500096} shape="rect" />
          <smtpad portHints={["pin2"]} pcbX={0.000127} pcbY={1.3250037} width={0.5999988} height={1.5500096} shape="rect" />
          <smtpad portHints={["pin3"]} pcbX={-0.999871} pcbY={1.3250037} width={0.5999988} height={1.5500096} shape="rect" />
          <smtpad portHints={[]} pcbX={-2.299843} pcbY={-1.2000103} width={1.1999976} height={1.7999964} shape="rect" />
          <smtpad portHints={[]} pcbX={2.299843} pcbY={-1.1997563} width={1.1999976} height={1.7999964} shape="rect" />
          <silkscreenpath route={[{ x: -1.500251, y: 2.026044 }, { x: -2.800756, y: 2.026044 }, { x: -2.799817, y: -0.037528 }]} />
          <silkscreenpath route={[{ x: -2.800756, y: -2.274151 }, { x: 2.801137, y: -2.274151 }]} />
          <silkscreenpath route={[{ x: 1.500124, y: 2.062518 }, { x: 2.800147, y: 2.062518 }, { x: 2.800147, y: -0.037528 }]} />
          <silkscreencircle pcbX={1.524} pcbY={2.348497} radius={0.127} />
          <silkscreentext text={`1 ${labels[0]}`} pcbX={1} pcbY={2.8} fontSize={0.5} />
          <silkscreentext text={`2 ${labels[1]}`} pcbX={0} pcbY={2.8} fontSize={0.5} />
          <silkscreentext text={`3 ${labels[2]}`} pcbX={-1} pcbY={2.8} fontSize={0.5} />
          <silkscreentext text="3V3 UART" pcbX={0} pcbY={-3.1} fontSize={0.65} />
          <silkscreentext text="{NAME}" pcbX={0} pcbY={4.0} fontSize={0.65} />
          <courtyardoutline outline={[{ x: -3.159443, y: 2.732990 }, { x: 3.131757, y: 2.732990 }, { x: 3.131757, y: -2.516810 }, { x: -3.159443, y: -2.516810 }, { x: -3.159443, y: 2.732990 }]} />
        </footprint>
      }
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C160389.obj?uuid=bb01000407ec457b89090f9b882df046",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C160389.step?uuid=bb01000407ec457b89090f9b882df046",
        pcbRotationOffset: 180,
        modelOriginPosition: { x: 1, y: -0.432503, z: -0.01 },
      }}
    />
  );
}
