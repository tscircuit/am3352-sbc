import { Fragment } from "react"
import { namedRoutingNets, phaseForNet } from "./autorouting-plan"

/** Named-net ownership uses the same plan as every linked branch. */
export function RoutingNets() {
  return <>{namedRoutingNets.map(name => <Fragment key={name}>
    <net name={name} routingPhaseIndex={phaseForNet(name)} />
  </Fragment>)}</>
}
