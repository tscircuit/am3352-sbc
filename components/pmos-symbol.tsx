import { Fragment } from "react"
import { symbols, type SchSymbol } from "schematic-symbols"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
function isPoint(value: unknown): value is Record<string, unknown> & { x: number; y: number } {
  return isRecord(value) && typeof value.x === "number" && Number.isFinite(value.x)
    && typeof value.y === "number" && Number.isFinite(value.y)
}

/** Check the library entry because schematic-symbols declares this variant as undefined. */
function isPmosSymbol(value: unknown): value is SchSymbol {
  if (!isRecord(value) || !isPoint(value.center) || !isRecord(value.size)
    || typeof value.size.width !== "number" || typeof value.size.height !== "number"
    || !Array.isArray(value.ports) || !Array.isArray(value.primitives)) return false
  const anchorNames = new Set(["top_left", "top_right", "bottom_left", "bottom_right", "center",
    "middle_top", "middle_bottom", "middle_left", "middle_right"])
  const labels = value.ports.flatMap((port: unknown) => isRecord(port) && Array.isArray(port.labels)
    ? port.labels.filter((label: unknown): label is string => typeof label === "string") : [])
  if (value.ports.length !== 3 || !["gate", "source", "drain"].every(
    (name) => labels.filter((label) => label === name).length === 1)) return false
  return value.ports.every((port: unknown) => isPoint(port) && isRecord(port)
    && Array.isArray(port.labels) && port.labels.every((label: unknown) => typeof label === "string"))
    && value.primitives.every((primitive: unknown) => {
      if (!isRecord(primitive)) return false
      if (primitive.type === "path") return Array.isArray(primitive.points)
        && primitive.points.every(isPoint) && typeof primitive.color === "string"
        && (primitive.fill === undefined || typeof primitive.fill === "boolean")
      if (primitive.type === "circle") return isPoint(primitive) && typeof primitive.radius === "number"
        && typeof primitive.fill === "boolean" && typeof primitive.color === "string"
      if (primitive.type === "text") return isPoint(primitive) && typeof primitive.text === "string"
        && typeof primitive.anchor === "string" && anchorNames.has(primitive.anchor)
      return false
    })
}

/** A standard PMOS symbol with this board's SOT-23 G=1, S=2, D=3 pin numbering. */
export function PmosSymbol({ name, value }: { name: string; value: string }) {
  const candidate: unknown = symbols.p_channel_e_mosfet_transistor_gate_left_drain_top
  if (!isPmosSymbol(candidate)) throw new Error("The standard PMOS schematic symbol is missing or invalid")
  const symbol = candidate
  const scale = 1.8
  const point = ({ x, y }: { x: number; y: number }) => ({
    x: (x - symbol.center.x) * scale,
    y: (y - symbol.center.y) * scale,
  })
  return <symbol>
    {symbol.primitives.map((primitive, index) => {
      if (primitive.type === "path") return <Fragment key={index}>
        <schematicpath points={primitive.points.map(point)} strokeColor="#880000"
          isFilled={Boolean(primitive.fill)} fillColor="#880000" />
      </Fragment>
      if (primitive.type === "circle") return <Fragment key={index}>
        <schematiccircle center={point(primitive)} radius={primitive.radius * scale} color="#880000" />
      </Fragment>
      if (primitive.type === "text") {
        const position = point(primitive)
        return <Fragment key={index}>
          <schematictext text={primitive.text === "{REF}" ? name : value}
            schX={position.x} schY={position.y} fontSize={0.18} />
        </Fragment>
      }
      return null
    })}
    {symbol.ports.map((port) => {
      const pin = port.labels.includes("gate") ? { name: "G", number: 1, direction: "left" as const }
        : port.labels.includes("source") ? { name: "S", number: 2, direction: "down" as const }
        : { name: "D", number: 3, direction: "up" as const }
      const position = point(port)
      return <Fragment key={pin.name}>
        <port name={pin.name} pinNumber={pin.number} aliases={[pin.name]}
          direction={pin.direction} schX={position.x} schY={position.y} schStemLength={0.3} />
      </Fragment>
    })}
  </symbol>
}
