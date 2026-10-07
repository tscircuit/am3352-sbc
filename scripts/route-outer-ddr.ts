import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { BusLanesPipelineSolver, exteriorPairSpacingReports, type SimpleRouteJson } from "../design/vendor/bus-lanes-outer.js";
import { prepareDdrRoutingInput } from "../design/bus-lanes";
import { auditDdrGeometry, signalNamesFromDeclaredBuses } from "../design/ddr-compliance";
import { verifyDdrVendor } from "./check-ddr-vendor";
import { auditDdrPhysicalGeometry } from "../design/ddr-physical-audit";
import { ddrTracePaths } from "../design/ddr-trace-paths";

const option = (name: string, fallback: string) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length+3) ?? fallback;
const inputPath = resolve(option("input", "work/ddr-routing/native/input.simple-route.json"));
const nativePath = resolve(option("native-circuit", `${dirname(inputPath)}/native.circuit.json`));
const promotionPath = process.argv.find(arg=>arg.startsWith("--write-routes="))?.slice("--write-routes=".length);
const outputDirectory = resolve(option("output-dir", "work/ddr-routing/outer-search"));
const timeLimitMs = Number(option("time-limit-ms", "1200000"));
const maxSearchIterations = Number(option("max-search-iterations", "2000000"));
if (!Number.isFinite(timeLimitMs) || timeLimitMs <= 0 || !Number.isInteger(maxSearchIterations) || maxSearchIterations <= 0) throw new Error("Invalid bounded search budget");
mkdirSync(outputDirectory, {recursive:true});
const provenance = verifyDdrVendor();
const raw = readFileSync(inputPath,"utf8");
const nativeInput = JSON.parse(raw) as SimpleRouteJson;
const nativeJson = JSON.parse(readFileSync(nativePath,"utf8"));
const input = prepareDdrRoutingInput(nativeInput);
const signalNames = signalNamesFromDeclaredBuses(input);
writeFileSync(resolve(outputDirectory,"prepared-input.simple-route.json"),JSON.stringify(input,null,2));
const started = performance.now();
const solver = new BusLanesPipelineSolver(input,{maxSearchIterations,maxLaneIterations:1000000,strictSurfacePairPrefixes:true,maxTimedSurfaceVias:4});
const dynamic = solver as unknown as Record<string,any>;
let phase = "", lastProgress = 0;
function report(final = false) {
  const record = {event:final?"final":"progress",elapsedMs:Math.round(performance.now()-started),iterations:solver.iterations,phase:solver.phase,solved:solver.solved,failed:solver.failed,error:solver.error,failureCode:solver.failureCode,signalRoutes:solver.traces.length,attempt:dynamic.attempt,child:{phase:dynamic.child?.phase,iterations:dynamic.child?.iterations,error:dynamic.child?.error,failureCode:dynamic.child?.failureCode,solved:dynamic.child?.solved,failed:dynamic.child?.failed},sharedPackages:!!dynamic.sharedPackages};
  console.log(JSON.stringify(record));
  writeFileSync(resolve(outputDirectory,"progress.json"),JSON.stringify(record,null,2));
  phase=solver.phase; lastProgress=performance.now();
}
console.log(JSON.stringify({event:"start",inputPath,inputSha256:createHash("sha256").update(raw).digest("hex"),sourceCommit:provenance.sourceCommit,physicalLayers:input.layerCount,signals:input.connections.length,suppliedTraces:input.traces?.length,obstacles:input.obstacles.length,timeLimitMs,maxSearchIterations,groups:auditDdrGeometry(input,[],signalNames).groups.map(({name,minimumMm,maximumMm,memberCount})=>({name,minimumMm,maximumMm,memberCount}))}));
try {
  while (!solver.solved && !solver.failed && performance.now()-started < timeLimitMs) {
    const sliceEnd = performance.now()+25;
    do { solver.step(); } while (!solver.solved && !solver.failed && performance.now()<sliceEnd);
    if (solver.phase!==phase || performance.now()-lastProgress>15000) report();
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  if (!solver.solved && !solver.failed) solver.tryFinalAcceptance();
  report(true);
  const audit = auditDdrGeometry(input,solver.traces,signalNames);
  const coupling = exteriorPairSpacingReports(input,solver.traces);
  const physical = solver.solved ? auditDdrPhysicalGeometry(input,solver.traces,{nativeCircuitJson:nativeJson}) : undefined;
  const acceptance = {inputPath,inputSha256:createHash("sha256").update(raw).digest("hex"),nativeCircuitSha256:createHash("sha256").update(JSON.stringify(nativeJson)).digest("hex"),sourceCommit:provenance.sourceCommit,elapsedMs:Math.round(performance.now()-started),solver:{solved:solver.solved,failed:solver.failed,phase:solver.phase,iterations:solver.iterations,error:solver.error,failureCode:solver.failureCode},timing:audit,coupling,physical,pass:solver.solved&&audit.pass&&coupling.length===3&&coupling.every(pair=>pair.applicable&&pair.matched)&&physical?.pass===true,physicalDrcVerified:physical?.pass===true,note:"DDR-only native acceptance; complete-board routing and plane connectivity require the separate full-board build audit."};
  writeFileSync(resolve(outputDirectory,"search-report.json"),JSON.stringify(acceptance,null,2));
  if (solver.solved) writeFileSync(resolve(outputDirectory,"candidate-traces.json"),JSON.stringify(solver.traces,null,2));
  if (acceptance.pass && promotionPath) {
    const target = resolve(promotionPath),paths = ddrTracePaths(input,solver.traces,nativeJson);
    const restored = paths.map((path,index)=>({...solver.traces.find(trace=>trace.connection_name===input.connections[index].name)!,route:path.route}));
    const restoredPhysical = auditDdrPhysicalGeometry(input,restored,{nativeCircuitJson:nativeJson});
    const restoredTiming = auditDdrGeometry(input,restored,signalNames);
    const restoredCoupling = exteriorPairSpacingReports(input,restored);
    if (!restoredPhysical.pass || !restoredTiming.pass || restoredCoupling.length!==3 || restoredCoupling.some(pair=>!pair.applicable || !pair.matched))
      throw new Error("Core saved-path conversion did not retain complete native DDR acceptance");
    mkdirSync(dirname(target),{recursive:true});
    writeFileSync(`${target}.tmp`,JSON.stringify(paths,null,2)+"\n");
    renameSync(`${target}.tmp`,target);
    writeFileSync(resolve(outputDirectory,"promoted-routes.json"),JSON.stringify({path:target,count:paths.length,sourceCommit:provenance.sourceCommit,sha256:createHash("sha256").update(JSON.stringify(paths,null,2)+"\n").digest("hex")},null,2));
  }
  console.log(JSON.stringify({event:"acceptance",pass:acceptance.pass,physicalDrcVerified:acceptance.physicalDrcVerified,failures:audit.failures,physicalIssues:physical?.issues,coupling,promoted:acceptance.pass?promotionPath:undefined}));
  if (!acceptance.pass) process.exitCode=1;
} catch (error) {
  report(true);
  writeFileSync(resolve(outputDirectory,"search-error.json"),JSON.stringify({error:String(error),stack:error instanceof Error?error.stack:undefined},null,2));
  console.error(error); process.exitCode=1;
}
