import {Children,cloneElement,isValidElement} from 'react'
import {Circuit} from '@tscircuit/core'
import {runAllPlacementChecks} from '@tscircuit/checks'
import {mkdirSync,writeFileSync} from 'node:fs'
import Board from '../index.circuit'
import {PowerPlanes} from '../design/power-planes'
// Actual source placement, with routing and schematic generation disabled only
// for this diagnostic fixture. No emitted Circuit JSON is rewritten or routed.
const element=Board(),children=Children.toArray(element.props.children).filter(child=>!isValidElement(child)||child.type!==PowerPlanes)
const circuit=new Circuit({platform:{partsEngineDisabled:true,routingDisabled:true,schematicDisabled:true,drcChecksDisabled:true}})
circuit.add(cloneElement(element,{},children));await circuit.renderUntilSettled()
const native=circuit.getCircuitJson(),checks=await runAllPlacementChecks(native),errors=checks.filter(row=>row.type.endsWith('_error'))
mkdirSync('.tscircuit/generated',{recursive:true});writeFileSync('.tscircuit/generated/placement-check-report.json',JSON.stringify({scope:'Native source-only placement fixture; not a routed board',components:native.filter(row=>row.type==='pcb_component').length,errors},null,2))
console.log(JSON.stringify({components:native.filter(row=>row.type==='pcb_component').length,placementErrors:errors}));if(errors.length)process.exitCode=1
