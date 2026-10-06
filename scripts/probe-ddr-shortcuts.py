"""Diagnostic: shorten only ordinary inner DDR carriers against emitted copper.
Preserves endpoints, vias, layers and widths. Does not promote or certify routes.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
paths=json.loads((ROOT/'design/ddr-routes.json').read_text());result=[];modified=[]
def length(route):return sum(math.hypot(a['x']-b['x'],a['y']-b['y']) for a,b in zip(route,route[1:]) if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer'])
for path in paths:
 t=next(t for t in terminals if t['selector']==path['connection']);n=t['net'];name=labels[n];route=path['route'];before=length(route)
 if name in ['DDR_CK','DDR_CKn','DDR_DQS0','DDR_DQSn0','DDR_DQS1','DDR_DQSn1']:modified.append(path);continue
 vias=[i for i,p in enumerate(route) if p['route_type']=='via'];assert len(vias)==2
 start,end=vias[0]+1,vias[1]-1;layer=route[start]['layer'];width=max(p['width'] for p in route[start:end+1]);obs=unary_union([g for g,ls,k in geoms if k!=n and layer in ls]).buffer(width/2+.1001,quad_segs=16);prepare(obs)
 carrier=[route[start]];i=start
 while i<end:
  j=end
  while j>i+1 and obs.intersects(LineString([(route[i]['x'],route[i]['y']),(route[j]['x'],route[j]['y'])])):j-=1
  carrier.append(route[j]);i=j
 new=route[:start]+carrier+route[end+1:];modified.append({**path,'route':new});result.append({'net':name,'beforeMm':before,'afterMm':length(new),'savedMm':before-length(new)})
(ROOT/'output/ddr-shortcut-probe.routes.json').write_text(json.dumps(modified,indent=2)+'\n');(ROOT/'output/ddr-shortcut-probe.report.json').write_text(json.dumps({'accepted':False,'pairRoutesUnchanged':True,'requiresTimingCouplingNativeAndReferenceAudits':True,'measurements':result},indent=2)+'\n');print(json.dumps(sorted(result,key=lambda q:-q['savedMm'])[:20]))
