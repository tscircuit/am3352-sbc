import { Fragment } from "react"
import { AM3352 } from "./components/am3352"
import { W631GG6MB_12 } from "./components/ddr3"
import { cpuConnections, ramConnections, sharedNets } from "./design/ddr-netlist"
import { ramPlacement } from "./design/ram-placement"
import { TimingConstraints } from "./design/timing-constraints"
import { ProcessorSupport } from "./design/processor-support"
import { PdPower } from "./design/pd-power"
import { AuxJstPower } from "./design/aux-jst-power"
import { UsbPorts } from "./design/usb"
import { Display } from "./design/display"
import { Indicators } from "./design/indicators"
import { RoutingNets } from "./design/routing-nets"
import { RemainingRoutes } from "./design/remaining-routes"
import { PowerPlanes } from "./design/power-planes"
import { StitchingVias } from "./routing/vias"
import { createSavedAutorouter, type SavedRouteGroup } from "./routing/saved-autorouter"
import acceptedRoutes from "./routing/accepted-routes"
import { Schematic } from "./schematic"
import { sch } from "./schematic/layout"
import { VIA_RULES } from "./routing/via-rules"
import { ddrAutorouter } from "./routing/ddr-autorouter"

const retainedNets = new Set((acceptedRoutes as SavedRouteGroup[])
  .filter(group => group.traces.every(trace => trace.route.every(point => point.route_type === "wire")))
  .flatMap(group => group.netNames))

/** Native source board: retain only via-free copper; reroute every via-bearing net. */
export default function Board() {
  const savedAutorouter = createSavedAutorouter(acceptedRoutes as SavedRouteGroup[])
  return <board
    width={100} height={80} thickness={1.6} layers={4}
    allowBlindAndBuriedVias={false} routeRemaining={false}
    minTraceWidth={0.1} minTraceToPadEdgeClearance={0.1}
    minViaPadDiameter={VIA_RULES.padDiameter} minViaHoleDiameter={VIA_RULES.holeDiameter}
    minViaEdgeToPadEdgeClearance={VIA_RULES.copperClearance}
    minViaHoleEdgeToViaHoleEdgeClearance={VIA_RULES.drillClearance}
    minTraceToHoleEdgeClearance={VIA_RULES.drillClearance}
    pcbStyle={{ viaHoleDiameter: VIA_RULES.holeDiameter, viaPadDiameter: VIA_RULES.padDiameter }}
    schAutoLayoutEnabled={false} schTraceAutoLabelEnabled schMaxTraceDistance={0.5}
    title="AM3352 SBC / four-layer draft" solderMaskColor="green"
  >
    <AM3352 name="U1" {...sch("U1")} pcbX={0} pcbY={0} />
    <W631GG6MB_12 name="U3" {...sch("U3")}
      pcbX={ramPlacement.x} pcbY={ramPlacement.y} pcbRotation={ramPlacement.rotation} />
    <TimingConstraints />
    {sharedNets.map((net) => <trace key={net}
      name={net === "DDR_RESETn" ? "DDR_RESETn_SIGNAL" : net}
      routingPhaseIndex={1}
      from={`U1.${cpuConnections.find((c) => c.net === net)!.pin}`}
      to={`U3.${ramConnections.find((c) => c.net === net)!.pin}`} />)}
    <ProcessorSupport />
    <PdPower />
    <AuxJstPower connector={{ pcbX: -40.8, pcbY: -36 }}
      fuse={{ pcbX: -34.8, pcbY: -36 }}
      reversePolarity={{ pcbX: -30.6, pcbY: -36 }}
      selector={{ pcbX: -45, pcbY: -17.5, pcbRotation: 270 }} />
    <UsbPorts />
    <Display />
    <Indicators />
    <RoutingNets retainedNets={retainedNets} />
    <RemainingRoutes />
    <StitchingVias />
    <PowerPlanes />
    <autoroutingphase name="RETAIN_VIA_FREE" phaseIndex={0} algorithmFn={savedAutorouter} />
    <autoroutingphase name="DDR_FIRST" phaseIndex={1} autorouter="bus_lanes" algorithmFn={ddrAutorouter} />
    <autoroutingphase name="USB_AND_TMDS" phaseIndex={3} />
    <autoroutingphase name="LCD_BUS" phaseIndex={4} />
    <autoroutingphase name="CONTROL_AND_BOOT" phaseIndex={5} />
    <autoroutingphase name="POWER" phaseIndex={6} />
    <autoroutingphase name="GROUND" phaseIndex={7} />
    <Schematic />
    {[-47.5, 47.5].flatMap((x) => [-36, 36].map((y) =>
      <Fragment key={`${x}_${y}`}><hole name={`H_${x}_${y}`} diameter={3.2} pcbX={x} pcbY={y} /></Fragment>))}
    <silkscreentext text="microSD / UART / JTAG" pcbX={-7.5} pcbY={38.3} fontSize={0.7} />
    <silkscreentext text="AM3352 SBC" pcbX={0} pcbY={-38} fontSize={1} />
    <silkscreentext text="128 MiB DDR3" pcbX={0.38637033051562725} pcbY={-35.10352761804101} fontSize={0.8} />
    <silkscreentext text="USB HOST 0" pcbX={16} pcbY={24.4} fontSize={0.7} />
    <silkscreentext text="USB HOST 1" pcbX={36} pcbY={24.4} fontSize={0.7} />
  </board>
}
