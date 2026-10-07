import type { SimplifiedPcbTrace } from "@tscircuit/core";

type Via = Extract<SimplifiedPcbTrace["route"][number], { route_type: "via" }>;

const sameBarrel = (first: Via, second: Via) =>
  first.x === second.x && first.y === second.y &&
  first.via_diameter === second.via_diameter && first.via_hole_diameter === second.via_hole_diameter &&
  first.layers !== undefined && second.layers !== undefined &&
  JSON.stringify([...first.layers].sort()) === JSON.stringify([...second.layers].sort());

/** Remove an out-and-back visit only when its copper is contained by another
 * retained manufactured barrel. Copper outside that barrel stays untouched. */
export function collapseRedundantViaVisits(trace: SimplifiedPcbTrace): SimplifiedPcbTrace {
  const route = trace.route.slice();
  let changed = false;
  for (let firstIndex = 0; firstIndex < route.length; firstIndex++) {
    const first = route[firstIndex];
    if (first.route_type !== "via" || first.via_diameter === undefined) continue;
    let nextIndex = firstIndex + 1;
    while (nextIndex < route.length && route[nextIndex].route_type === "wire") nextIndex++;
    const second = route[nextIndex];
    if (!second || second.route_type !== "via" || !sameBarrel(first, second) ||
      first.from_layer !== second.to_layer || first.to_layer !== second.from_layer) continue;
    const radius = first.via_diameter / 2;
    const intermediate = route.slice(firstIndex + 1, nextIndex);
    const maximumWidth = intermediate.reduce((width, point) => point.route_type === "wire" ? Math.max(width, point.width) : width, 0);
    if (intermediate.some(point => point.route_type !== "wire" ||
      point.layer !== first.to_layer || ![point.x, point.y, point.width].every(Number.isFinite) || point.width <= 0 ||
      Math.hypot(point.x - first.x, point.y - first.y) + maximumWidth / 2 > radius)) continue;
    if (!route.some((point, index) => index !== firstIndex && index !== nextIndex &&
      point.route_type === "via" && sameBarrel(first, point))) continue;
    route.splice(firstIndex, nextIndex - firstIndex + 1);
    changed = true;
    firstIndex = -1;
  }
  return changed ? { ...trace, route } : trace;
}
