import decouplerFootprints from "./decoupler-footprints.json";
import type { TraceProps } from "@tscircuit/props";
import { Fragment } from "react";
import ballMap from "./am3352-ballmap.json";
import { sch } from "../schematic/layout";

export function SignalTrace(props: TraceProps) {
  return <trace {...props} />;
}

export const cpuPin = (signal: string) => {
  const ball = Object.entries(ballMap).find(([, name]) => name === signal)?.[0];
  if (!ball) throw new Error(`Unknown AM3352 signal ${signal}`);
  return `U1.${ball}`;
};
export const phaseForNet = (net: string) =>
  net === "GND"
    ? 7
    : /^(VDD|V[13]|DDR_1V5|RTC_1V8|A3V3|VIN|SYS|AUX_5V|USB_PD_SWITCHED|PD_VBUS|PD_VDD|USB[01]_VBUS|HDMI_(TVDD|PVDD|5V))/.test(net)
      ? 6
      : 5;
export function Link({
  refdes,
  pin,
  net,
}: {
  refdes: string;
  pin: string;
  net: string;
}) {
  return (
    <SignalTrace
      name={`T_${refdes}_${pin}`}
      from={`${refdes}.${pin}`}
      to={`net.${net}`}
      routingPhaseIndex={phaseForNet(net)}
    />
  );
}
export const link = (refdes: string, pin: string, net: string) => (
  <Link key={`${refdes}_${pin}`} refdes={refdes} pin={pin} net={net} />
);
export function Cap({
  name,
  net,
  value = "100nF",
  x,
  y,
  layer = "top",
  rotation = 0,
}: {
  name: string;
  net: string;
  value?: string;
  x: number;
  y: number;
  layer?: "top" | "bottom";
  rotation?: number;
}) {
  return (
    <Fragment>
      <capacitor
        name={name}
        capacitance={value}
        footprint={
          (decouplerFootprints as Record<string, string>)[name] ?? (name === "C_SYS_LOCAL"
            ? "0603"
            : value.includes("uF")
              ? "0805"
              : "0402")
        }
        pcbX={x}
        pcbY={y}
        layer={layer}
        pcbRotation={rotation}
        {...sch(name)}
      />
      {link(name, "pin1", net)}
      {link(name, "pin2", "GND")}
    </Fragment>
  );
}
export function Res({
  name,
  a,
  b,
  value = "10k",
  x,
  y,
  layer = "top",
  rotation = 0,
}: {
  name: string;
  a: string;
  b: string;
  value?: string;
  x: number;
  y: number;
  layer?: "top" | "bottom";
  rotation?: number;
}) {
  return (
    <Fragment>
      <resistor
        name={name}
        resistance={value}
        footprint="0402"
        pcbX={x}
        pcbY={y}
        layer={layer}
        pcbRotation={rotation}
        {...sch(name)}
      />
      {link(name, "pin1", a)}
      {link(name, "pin2", b)}
    </Fragment>
  );
}
