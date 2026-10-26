import { Children, cloneElement, isValidElement } from "react"
import { Circuit } from "@tscircuit/core"
import { mkdir, writeFile } from "node:fs/promises"
import { PowerPlanes } from "./design/power-planes"
import Board from "./index.circuit"

// Native component-placement fixture for model validation without routing.
// Select source producers before rendering; never patch Circuit JSON output.
// This fixture is not a routed board and must not be used for fabrication.
const board = Board()
const children = Children.toArray(board.props.children)
  .filter(child => !isValidElement(child) || child.type !== PowerPlanes)
const circuit = new Circuit({ platform: {
  partsEngineDisabled: true, routingDisabled: true,
  schematicDisabled: true, drcChecksDisabled: true,
} })
circuit.add(cloneElement(board, {}, children))
await circuit.renderUntilSettled()
const native = circuit.getCircuitJson()
await mkdir(".tscircuit/generated", { recursive: true })
await writeFile(".tscircuit/generated/models-only.circuit.json", JSON.stringify(native))
console.log(`Generated model-only placement fixture: ${native.filter(row => row.type === "cad_component").length} CAD models. Routing is not validated.`)
