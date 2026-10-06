import { RemainingRoutes } from "./design/remaining-routes";
import { peripheralBusLanes } from "./design/peripheral-router";
import { ddrBusLanes } from "./design/bus-lanes";
import { PowerPlanes, planeNetMap } from "./design/power-planes";
import {ramPlacement} from "./design/ram-placement";
import { PowerEscapes } from "./design/power-escapes";
import savedDdrRoutes from "./design/ddr-routes.json";
import savedOuterRoutes from "./design/accepted-outer-routes.json";
import { PeripheralRoutingContext } from "./design/nets";
import { AM3352 } from "./components/am3352";
import { W631GG6MB_12 } from "./components/ddr3";
import { TimingConstraints } from "./design/timing-constraints";
import {
  cpuConnections,
  ramConnections,
  sharedNets,
} from "./design/ddr-netlist";
import { ProcessorSupport } from "./design/processor-support";
import { PdPower } from "./design/pd-power";
import { UsbPorts } from "./design/usb";
import { Display } from "./design/display";
import { Indicators } from "./design/indicators";
import type { AutoroutingPhaseProps, FanoutTracePath } from "@tscircuit/props";
import { outerAutorouter } from "./design/outer-autorouter";
import { lcdAutorouter } from "./design/lcd-router";
import { groundPlaneAutorouter } from "./design/ground-plane-router";

// The builder supplies paths produced by ddr.circuit.tsx's bus_lanes phase.
// New peripheral routing receives these paths as fixed copper obstacles.
export default function Board({
  ddrRoutes = savedDdrRoutes as FanoutTracePath[],
  routePeripherals = true,
  peripheralRoutes = [],
  solveDdr = false,
  placementOnly = false,
  freshRouting = Object.keys(savedOuterRoutes.phases).length === 0,
}: {
  ddrRoutes?: FanoutTracePath[];
  routePeripherals?: boolean;
  peripheralRoutes?: FanoutTracePath[];
  solveDdr?: boolean;
  placementOnly?: boolean;
  freshRouting?: boolean;
} = {}) {
  const cached: Record<string, FanoutTracePath[]> = freshRouting ? {} : savedOuterRoutes.phases as Record<string, FanoutTracePath[]>;
  const pairRoutes = peripheralRoutes.length ? peripheralRoutes : routePeripherals ? cached.USB_AND_TMDS ?? [] : [];
  const phaseRouting = (name: string, fallback: Pick<AutoroutingPhaseProps, "autorouter" | "algorithmFn">) =>
    cached[name]?.length
      ? { autorouter: "fanout" as const, connections: [], pcbTracePaths: cached[name] }
      : fallback;
  return (
    <board pcbStyle={{viaHoleDiameter:0.15,viaPadDiameter:0.3}}
      width={100}
      height={80}
      layers={4}
      allowBlindAndBuriedVias={false}
      thickness={1.6}
      minTraceWidth={0.1}
      minTraceToPadEdgeClearance={0.1}
      minViaPadDiameter={0.3}
      minViaHoleDiameter={0.15}
      autorouterEffortLevel="10x"
      routingDisabled={placementOnly}
      routeRemaining={!placementOnly && (routePeripherals || solveDdr)}
      schematicDisabled
      schAutoLayoutEnabled={false}
      schTraceAutoLabelEnabled
      title="AM3352 SBC / outer signals, inner ground"
      solderMaskColor="green"
    >
      <AM3352 name="U1" noSchematicRepresentation pcbX={0} pcbY={0} />
      <W631GG6MB_12 name="U3" noSchematicRepresentation pcbX={ramPlacement.x} pcbY={ramPlacement.y} pcbRotation={ramPlacement.rotation} />
      <TimingConstraints />
      {sharedNets.map((net) => (
        <trace
          key={net}
          name={net === "DDR_RESETn" ? "DDR_RESETn_SIGNAL" : net}
          routingPhaseIndex={
            ddrRoutes.length || routePeripherals || solveDdr ? 1 : undefined
          }
          from={`U1.${cpuConnections.find((c) => c.net === net)!.pin}`}
          to={`U3.${ramConnections.find((c) => c.net === net)!.pin}`}
        />
      ))}
      <autoroutingphase
        name="DDR_FIRST"
        phaseIndex={1}
        fanoutRoutingLayers={["top", "bottom"]}
        connections={
          ddrRoutes.length || !(routePeripherals || solveDdr) ? [] : undefined
        }
        fanoutPourNetMap={planeNetMap}
        autorouter={ddrRoutes.length ? "fanout" : "bus_lanes"}
        algorithmFn={ddrRoutes.length ? undefined : ddrBusLanes}
        pcbTracePaths={
          ddrRoutes.length || !(routePeripherals || solveDdr)
            ? ddrRoutes
            : undefined
        }
      />
      <PeripheralRoutingContext.Provider value={routePeripherals ? true : pairRoutes.length ? [3] : false}>
        <ProcessorSupport />
        <PdPower />
        <UsbPorts />
        <Display />
        <Indicators />
      </PeripheralRoutingContext.Provider>
      <PowerPlanes />
      <RemainingRoutes routeFresh routingEnabled={routePeripherals} />
      <PowerEscapes />
      {(routePeripherals || pairRoutes.length > 0) && (
        <>
          <autoroutingphase
            name="USB_AND_TMDS"
            phaseIndex={3}
            fanoutRoutingLayers={["top", "bottom"]}
            autorouter={pairRoutes.length ? "fanout" : "bus_lanes"}
            algorithmFn={pairRoutes.length ? undefined : peripheralBusLanes}
            pcbTracePaths={pairRoutes.length ? pairRoutes : undefined}
            connections={pairRoutes.length ? [] : undefined}
          />
          {routePeripherals && <>
          <autoroutingphase
            name="LCD_BUS"
            phaseIndex={4}
            fanoutRoutingLayers={["top", "bottom"]}
            {...phaseRouting("LCD_BUS", { autorouter: "default", algorithmFn: lcdAutorouter })}
          />
          <autoroutingphase
            name="CONTROL_AND_BOOT"
            phaseIndex={5}
            fanoutRoutingLayers={["top", "bottom"]}
            {...phaseRouting("CONTROL_AND_BOOT", { autorouter: "default", algorithmFn: outerAutorouter })}
          />
          <autoroutingphase name="POWER" phaseIndex={6} fanoutRoutingLayers={["top", "bottom"]} {...phaseRouting("POWER", { autorouter: "default", algorithmFn: outerAutorouter })} />
          <autoroutingphase
            name="GROUND"
            phaseIndex={7}
            {...phaseRouting("GROUND", { autorouter: "default", algorithmFn: groundPlaneAutorouter })}
            fanoutPourNetMap={{ inner1: ["GND"] }}
          />
          </>}
        </>
      )}
      {[-47.5, 47.5].flatMap((x) =>
        [-36, 36].map((y) => (
          <hole name={`H_${x}_${y}`} diameter={3.2} pcbX={x} pcbY={y} />
        )),
      )}
      <silkscreentext
        text="AM3352 / TOP-BOTTOM SIGNALS"
        pcbX={0}
        pcbY={-38}
        fontSize={1}
      />
      <silkscreentext text="128 MiB DDR3" pcbX={0} pcbY={-35} fontSize={0.8} />
      <silkscreentext text="USB HOST 0" pcbX={16} pcbY={38} fontSize={0.7} />
      <silkscreentext text="USB HOST 1" pcbX={36} pcbY={38} fontSize={0.7} />
      <silkscreentext
        text="microSD / UART / JTAG"
        pcbX={-17}
        pcbY={38}
        fontSize={0.7}
      />
    </board>
  );
}
