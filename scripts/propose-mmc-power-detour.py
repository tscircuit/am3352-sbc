"""Propose a V1V8 branch detour reserving the MMC0_DAT1 escape barrel."""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
saved=json.loads((ROOT/'design/control-routes.json').read_text());r=next(r for r in saved if r['name']=='REMAINING_308');path=r['route'];a=(path[0]['x'],path[0]['y']);b=(path[1]['x'],path[1]['y']);n=next(k for k,v in labels.items() if v=='V1V8');site=(-1.65,4.5)
obs=unary_union([g for g,ls,k in geoms if k!=n and 'inner2' in ls]).buffer(.075+.102).union(Point(site).buffer(.15+.075+.102));prepare(obs)
step=.025;xs=np.arange(-3.3,.1,step);ys=np.arange(3.3,5.81,step);blocked=contains_xy(obs,xs[None,:],ys[:,None]);point=lambda k:(float(xs[k[0]]),float(ys[k[1]]));key=lambda p:(round((p[0]-xs[0])/step),round((p[1]-ys[0])/step));start=key(a);goal=key(b);queue=[(0,0,start)];cost={start:0};parent={};seen=set();answer=None
while queue:
 _,d,k=heapq.heappop(queue)
 if k in seen:continue
 seen.add(k)
 if k==goal:answer=k;break
 for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
  q=(k[0]+dx,k[1]+dy);nd=d+step*math.hypot(dx,dy)
  if not(0<=q[0]<len(xs) and 0<=q[1]<len(ys)) or blocked[q[1],q[0]] or nd>=cost.get(q,math.inf):continue
  if obs.intersects(LineString([point(k),point(q)])):continue
  cost[q]=nd;parent[q]=k;heapq.heappush(queue,(nd+math.dist(point(q),b),nd,q))
points=[]
if answer:
 points=[goal]
 while points[-1]!=start:points.append(parent[points[-1]])
 points=[point(k) for k in reversed(points)];points[0]=a;points[-1]=b;simp=[a];i=0
 while i<len(points)-1:
  j=len(points)-1
  while j>i+1 and obs.intersects(LineString([points[i],points[j]])):j-=1
  simp.append(points[j]);i=j
 points=simp
out={'found':bool(points),'reservedVia':site,'path':points,'net':'V1V8','trace':r['name'],'requiresNativeValidation':True};(ROOT/'output/mmc-power-detour086.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
