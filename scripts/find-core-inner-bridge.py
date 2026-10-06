"""Search existing through-vias for an F6 supply bridge without new drills.
Requires 0.30 mm edge clearance from DDR wires and 0.103 mm elsewhere.
Discovery only: does not change board source.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from scipy.ndimage import label
core=next(k for k,v in labels.items() if v=='VDD_CORE')
start=next(t for t in terminals if t['selector']=='.PG_VIA_148 > .top')
vias=[e for e in c if e['type']=='pcb_via' and net(e)==core and math.hypot(e['x']-start['x'],e['y']-start['y'])>.01]
protected_nets={net(e) for e in c if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_')}
width=.15;step=.05;xs=np.arange(-12,12+step/2,step);ys=np.arange(-16,8+step/2,step);W=len(xs);H=len(ys)
results=[]
for layer in ['inner1','inner2']:
 foreign=[g.buffer(width/2+(.30 if n in protected_nets else .103),quad_segs=24) for g,ls,n in geoms if layer in ls and n!=core]
 obs=unary_union(foreign);prepare(obs);mask=contains_xy(obs,xs[None,:],ys[:,None])
 def xy(k):return (float(xs[k%W]),float(ys[k//W]))
 def clear(p,q):return not obs.intersects(LineString([p,q]))
 def anchors(p):
  x=round((p[0]-xs[0])/step);y=round((p[1]-ys[0])/step);r=[]
  for dy in range(-2,3):
   for dx in range(-2,3):
    xx=x+dx;yy=y+dy
    if 0<=xx<W and 0<=yy<H and not mask[yy,xx] and clear(p,xy(yy*W+xx)):r.append(yy*W+xx)
  return r
 a=(start['x'],start['y']);starts=anchors(a);ends={}
 for via in vias:
  for k in anchors((via['x'],via['y'])):ends[k]=via
 print(layer,'anchors',len(starts),'goals',len(ends),flush=True)
 queue=[];cost={};parent={};seen=set()
 for k in starts:cost[k]=math.dist(a,xy(k));heapq.heappush(queue,(cost[k],k))
 found=None
 while queue:
  g,k=heapq.heappop(queue)
  if k in seen:continue
  seen.add(k)
  if k in ends:found=k;break
  if g>20:continue
  x=k%W;y=k//W
  for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)]:
   xx=x+dx;yy=y+dy;q=yy*W+xx
   if not(0<=xx<W and 0<=yy<H) or mask[yy,xx] or q in seen:continue
   ng=g+step*math.hypot(dx,dy)
   if ng>=cost.get(q,math.inf) or not clear(xy(k),xy(q)):continue
   cost[q]=ng;parent[q]=k;heapq.heappush(queue,(ng,q))
 if found is None:results.append({'layer':layer,'found':False,'visited':len(seen)});continue
 path=[found]
 while path[-1] in parent:path.append(parent[path[-1]])
 via=ends[found];points=[a]+[xy(k) for k in reversed(path)]+[(via['x'],via['y'])]
 simple=[points[0]];i=0
 while i<len(points)-1:
  j=len(points)-1
  while j>i+1 and not clear(points[i],points[j]):j-=1
  simple.append(points[j]);i=j
 results.append({'layer':layer,'found':True,'width':width,'points':simple,'targetViaId':via['pcb_via_id'],'startPortId':start['port_id'],'length':sum(math.dist(a,b) for a,b in zip(simple,simple[1:]))})
(ROOT/'output/core-inner-bridge-search.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results))
