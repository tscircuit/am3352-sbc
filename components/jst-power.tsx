import type { ChipProps } from "@tscircuit/props";

const pinLabels = { pin1: ["AUX_5V"], pin2: ["GND"] } as const;

/** Standard-JST-programmer power cable pinout: 1 positive, 2 ground.
 * This SBC socket requires an external regulated 5 V supply. The standard
 * programmer's recommended 50 mA output cannot power the SBC.
 * The 0.75 A normal input bound requires SH crimp contacts and AWG28 cable
 * (primary SH rating 1 A); mating SR/SZ IDC AWG30 cables rate only 0.7 A.
 * Copper lands and CAD origin are copied from standard-jst-programmer@0.8.0
 * footprints/JstPowerUpward.tsx, BM02B-SRSS-TB(LF)(SN) / C160388.
 */
export function StandardJstPowerUpward(
  props: Omit<ChipProps<typeof pinLabels>, "footprint" | "pinLabels">,
) {
  return (
    <connector
      {...props}
      standard="jst_sh"
      pinCount={2}
      pinLabels={pinLabels}
      manufacturerPartNumber="BM02B-SRSS-TB(LF)(SN)"
      supplierPartNumbers={{ jlcpcb: ["C160388"] }}
      footprint={
        <footprint insertionDirection="from_above">
          <smtpad portHints={["pin1"]} pcbX={0.502031} pcbY={1.3125577} width={0.5999988} height={1.5500096} shape="rect" />
          <smtpad portHints={["pin2"]} pcbX={-0.497967} pcbY={1.3125577} width={0.5999988} height={1.5500096} shape="rect" />
          <smtpad portHints={[]} pcbX={1.799971} pcbY={-1.1875643} width={1.1999976} height={1.7999964} shape="rect" />
          <smtpad portHints={[]} pcbX={-1.799971} pcbY={-1.1875643} width={1.1999976} height={1.7999964} shape="rect" />
          <silkscreenpath route={[{ x: -0.999998, y: -1.9374993 }, { x: 0.999998, y: -1.9374993 }]} />
          <silkscreenpath route={[{ x: -1.999996, y: 1.3140817 }, { x: -1.0291064, y: 1.3140817 }]} />
          <silkscreenpath route={[{ x: 1.0331704, y: 1.3140817 }, { x: 1.999996, y: 1.3140817 }, { x: 1.999996, y: -0.0562991 }]} />
          <silkscreenpath route={[{ x: -1.999996, y: 1.3140817 }, { x: -1.999996, y: -0.0562991 }]} />
          <silkscreencircle pcbX={1.3199872} pcbY={1.9024981} radius={0.152654} />
          <silkscreentext text="1 +5V" pcbX={0.75} pcbY={2.7} fontSize={0.55} />
          <silkscreentext text="2 GND" pcbX={-0.75} pcbY={2.7} fontSize={0.55} />
          <silkscreentext text="5V IN / 0.75A" pcbX={0} pcbY={-3.0} fontSize={0.6} />
          <silkscreentext text="{NAME}" pcbX={0} pcbY={-3.0} fontSize={0.65} />
          <courtyardoutline outline={[
            { x: -2.638997, y: 2.3260817 }, { x: 2.661603, y: 2.3260817 },
            { x: 2.661603, y: -2.3395183 }, { x: -2.638997, y: -2.3395183 },
            { x: -2.638997, y: 2.3260817 },
          ]} />
        </footprint>
      }
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C160388.obj?uuid=868d8c16cff34c5e9973dfa3b6ac90ae",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C160388.step?uuid=868d8c16cff34c5e9973dfa3b6ac90ae",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0, y: 0.34950469999998857, z: -0.05 },
      }}
    />
  );
}
