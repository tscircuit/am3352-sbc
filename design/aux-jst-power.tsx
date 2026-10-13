import { sch } from "../schematic/layout";
import { AuxReversePolarityPmos } from "../components/aux-reverse-polarity";
import { StandardJstPowerUpward } from "../components/jst-power";
import { AuxInputFuse } from "../components/aux-input-fuse";
import { PowerSourceSelector } from "../components/power-source-selector";
import { SignalTrace } from "./nets";

export interface AuxPowerPlacement {
  pcbX: number;
  pcbY: number;
  pcbRotation?: number;
  layer?: "top" | "bottom";
}

function powerLink(refdes: string, pin: string, net: string) {
  return (
    <SignalTrace
      name={`T_${refdes}_${pin}`}
      from={`${refdes}.${pin}`}
      to={`net.${net}`}
      routingPhaseIndex={net === "GND" ? 7 : 6}
    />
  );
}

/** Source declarations only: each interconnect is assigned to autorouting.
 * One 2.54 mm shunt selects USB pins 1–2 (default) or AUX pins 2–3.
 * The mechanical selection breaks the possible AUX→USB body-diode path.
 * Requires Q_PD.D and C_PD_SLEW.pin2 to use USB_PD_SWITCHED instead of VIN_5V.
 */
export function AuxJstPower({
  connector,
  fuse,
  reversePolarity,
  selector,
}: {
  connector: AuxPowerPlacement;
  fuse: AuxPowerPlacement;
  reversePolarity: AuxPowerPlacement;
  selector: AuxPowerPlacement;
}) {
  return (
    <>
      <StandardJstPowerUpward name="J_AUX_PWR" {...sch("J_AUX_PWR")} {...connector} />
      <AuxInputFuse name="F_AUX" {...sch("F_AUX")} {...fuse} />
      <AuxReversePolarityPmos name="Q_AUX" {...sch("Q_AUX")} {...reversePolarity} />
      <PowerSourceSelector name="JP_PWR" {...sch("JP_PWR")} {...selector} />
      {powerLink("J_AUX_PWR", "pin1", "AUX_5V")}
      {powerLink("J_AUX_PWR", "pin2", "GND")}
      {powerLink("F_AUX", "pin1", "AUX_5V")}
      {powerLink("F_AUX", "pin2", "AUX_5V_FUSED")}
      {powerLink("Q_AUX", "D", "AUX_5V_FUSED")}
      {powerLink("Q_AUX", "S", "AUX_5V_PROTECTED")}
      {powerLink("Q_AUX", "G", "GND")}
      {powerLink("JP_PWR", "pin1", "USB_PD_SWITCHED")}
      {powerLink("JP_PWR", "pin2", "VIN_5V")}
      {powerLink("JP_PWR", "pin3", "AUX_5V_PROTECTED")}
    </>
  );
}
