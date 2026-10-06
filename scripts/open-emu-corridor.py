"""Move two local segments around a reserved through-via; full native audit required."""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
site=Point(-4.8,3.35);cases=[('V3V3','bottom',.15,(-4.8,2.7),(-4,3.9)),('TMS','inner2',.1,(-5.6,2.5),(-4.4,4.1))];solutions=[]
for name,layer,width,start,end in cases:
 n=next(k for k,v in labels.items() if v==name);foreign=[g for g,ls,k in geoms if k!=n and layer in ls];tree=STRtree(foreign)
 mids=[None]+sorted([(x*.05,y*.05) for x in range(-130,-70) for y in range(40,95)],key=lambda q:math.dist(start,q)+math.dist(q,end))
 for mid in mids:
  pts=[start,end] if mid is None else [start,mid,end];g=LineString(pts).buffer(width/2,quad_segs=24)
  if g.distance(site)<.253:continue
  if any(g.distance(foreign[int(i)])<.103 for i in tree.query(g.buffer(.104))):continue
  solutions.append({'net':name,'layer':layer,'points':pts});break
 else:
  step=.05;xx=np.arange(-8,-2+step/2,step);yy=np.arange(0,7+step/2,step);W=len(xx);H=len(yy);obs=unary_union(foreign).buffer(width/2+.103).union(site.buffer(width/2+.253));prepare(obs);mask=contains_xy(obs,xx[None,:],yy[:,None])
  def xy(k):return (float(xx[k%W]),float(yy[k//W]))
  def clear(a,b):return not obs.intersects(LineString([a,b]))
  def anchors(p):
   x=round((p[0]-xx[0])/step);y=round((p[1]-yy[0])/step)
   return [Y*W+X for Y in range(max(0,y-2),min(H,y+3)) for X in range(max(0,x-2),min(W,x+3)) if not mask[Y,X] and clear(p,xy(Y*W+X))]
  ends=set(anchors(end));q=[];cost={};prev={};seen=set();found=None
  for k in anchors(start):cost[k]=math.dist(start,xy(k));heapq.heappush(q,(cost[k]+math.dist(xy(k),end),k))
  while q:
   _,k=heapq.heappop(q)
   if k in seen:continue
   seen.add(k)
   if k in ends:found=k;break
   x=k%W;y=k//W
   for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
    X=x+dx;Y=y+dy;nxt=Y*W+X;g=cost[k]+step*math.hypot(dx,dy)
    if not(0<=X<W and 0<=Y<H) or mask[Y,X] or g>=cost.get(nxt,math.inf) or not clear(xy(k),xy(nxt)):continue
    cost[nxt]=g;prev[nxt]=k;heapq.heappush(q,(g+math.dist(xy(nxt),end),nxt))
  if found is None:solutions.append({'net':name,'found':False,'visited':len(seen)});continue
  path=[found]
  while path[-1] in prev:path.append(prev[path[-1]])
  pts=[start]+[xy(k) for k in reversed(path)]+[end];simple=[start];i=0
  while i<len(pts)-1:
   j=len(pts)-1
   while j>i+1 and not clear(pts[i],pts[j]):j-=1
   simple.append(pts[j]);i=j
  solutions.append({'net':name,'layer':layer,'points':simple})
print(json.dumps(solutions));(ROOT/'output/emu-corridor-proposal.json').write_text(json.dumps(solutions,indent=2)+'\n')
