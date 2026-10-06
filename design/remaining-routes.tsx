import controlRoutes from "./control-routes.json";
import { Fragment } from "react";
import savedRoutes from './remaining-routes.json';
import sourceNets from './source-net-names.json';
import { phaseForNet } from './nets';

type PathPoint = {x:number;y:number;via?:boolean;
  fromLayer?:'top'|'inner1'|'inner2'|'bottom';
  toLayer?:'top'|'inner1'|'inner2'|'bottom'};
type SavedRoute = {name:string;net:string;from:string;to:string;width:number;
  waypoints:PathPoint[];toPoint?:{x:number;y:number}};
const routes = savedRoutes as SavedRoute[];
const cachedRouteNames = new Set(controlRoutes.map(r=>r.name));
const cachedNetNames = new Set(controlRoutes.map(r=>r.net));
// These nets never appeared in the original control-route cache. Declare their
// phases even when a fixed pad escape clears the trace's individual phase.
// Preserve their original creation order so native copper owners stay stable.
const additionalNetNames = ["CAP_VDD_SRAM_CORE", "PMIC_POWER_EN", "CAP_VDD_RTC", "DDR_1V5", "USB0_VBUS", "PD_VBUS", "PD_VDD", "HDMI_TVDD", "HDMI_PVDD", "HDMI_5V"];
/** Additional branches are net connections, with explicit physical endpoints. */
export function RemainingRoutes({routeFresh = false, routingEnabled = true}: {routeFresh?: boolean; routingEnabled?: boolean} = {}) {
  const phase = (net: string) => routingEnabled ? routeFresh ? phaseForNet(net) : 2 : undefined;
  return <>
    {[...new Set(routes.map(r => r.net))].filter(n => !sourceNets.includes(n)).map(name => <Fragment key={name}><net name={`ROUTED_${name}`} routingPhaseIndex={routeFresh || cachedNetNames.has(name) ? phase(name) : undefined} /></Fragment>)}
    {[...new Set([...controlRoutes.map(r=>r.net), ...(routeFresh ? additionalNetNames : [])])].filter(n=>sourceNets.includes(n)).map(name=><Fragment key={name}><net name={name} routingPhaseIndex={phase(name)} /></Fragment>)}
    {routes.map(route => <trace
    key={route.name}
    name={route.name}
    from={route.from}
    to={`net.${sourceNets.includes(route.net) ? route.net : `ROUTED_${route.net}`}`}
    thickness={route.width}
    routingPhaseIndex={routeFresh ? phase(route.net) : routingEnabled && cachedRouteNames.has(route.name) ? 2 : undefined}
    pcbPathRelativeTo={route.from}
    pcbPath={routeFresh || cachedRouteNames.has(route.name) ? undefined : [route.from,
      ...route.waypoints.flatMap(p => p.via ? [{x:p.x,y:p.y}, p, {x:p.x,y:p.y}] : [p]),
      route.toPoint ?? route.to]}
  />)}</>;
}
