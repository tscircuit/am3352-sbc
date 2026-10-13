import { Fragment } from "react"
import vias from "./vias.json"

/** Native full-stack vias retained from the accepted autorouting/stitching result. */
export function StitchingVias() {
  return <>
    {vias.map(({ x, y, net, layers, ...via }) => <Fragment key={via.name}><via {...via}
      pcbX={x} pcbY={y} fromLayer="top" toLayer="bottom"
      layers={layers as ["top", "inner1", "inner2", "bottom"]} connectsTo={`net.${net}`} /></Fragment>)}
  </>
}
