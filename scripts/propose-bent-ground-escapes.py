from pathlib import Path
exec(compile((Path(__file__).parent/'diagnose-removable-escape-blockers.py').read_text().split('for name in os.environ')[0],str(Path(__file__).parent/'diagnose-removable-escape-blockers.py'),'exec'))
results=[]
for name,future in [('PG_VIA_22',(-6,-3.6)),('PG_VIA_74',(3.6,4.4))]:
 v=next(v for v in esc['vias'] if v['name']==name);t=next(t for t in esc['traces'] if t['via']==name);terminal=next(t1 for t1 in terminals if t1['selector']==t['from']);n=terminal['net'];a=(terminal['x'],terminal['y']);old=(v['x'],v['y']);area=Point(a).buffer(4)
 foreign=[(g,ls) for g,ls,k in geoms if k!=n and g.intersects(area)];top=unary_union([g for g,ls in foreign if 'top' in ls]).buffer(.153).union(protected['top'].buffer(.183)).union(LineString([future,old]).buffer(.203)).union(Point(old).buffer(.303));drill=unary_union([g for g,ls in foreign]).buffer(.253).union(allpads).union(protected['top'].buffer(.283)).union(Point(old).buffer(.51))
 other=[Point(e['x'],e['y']).buffer(e['outer_diameter']/2+.253) for e in c if e['type']=='pcb_via' and math.dist((e['x'],e['y']),old)>1e-7];drill=drill.union(unary_union(other));prepare(top);prepare(drill)
 step=.05;radius=60;xx=a[0]+np.arange(-radius,radius+1)*step;yy=a[1]+np.arange(-radius,radius+1)*step;blocked=contains_xy(top,xx[None,:],yy[:,None]);via=contains_xy(drill,xx[None,:],yy[:,None]);start=(radius,radius);queue=[(0,start)];cost={start:0};parent={};seen=set();goal=None
 def point(k):return (float(xx[k[0]]),float(yy[k[1]]))
 while queue:
  d,k=heapq.heappop(queue)
  if k in seen:continue
  seen.add(k)
  if d>2.5:break
  if not via[k[1],k[0]]:goal=k;break
  for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
   q=(k[0]+dx,k[1]+dy);nd=d+step*math.hypot(dx,dy)
   if not(0<=q[0]<=2*radius and 0<=q[1]<=2*radius) or blocked[q[1],q[0]] or nd>=cost.get(q,math.inf):continue
   if top.intersects(LineString([point(k),point(q)])):continue
   cost[q]=nd;parent[q]=k;heapq.heappush(queue,(nd,q))
 path=[]
 if goal:
  path=[goal]
  while path[-1]!=start:path.append(parent[path[-1]])
  path=[point(k) for k in reversed(path)];simplified=[path[0]];i=0
  while i<len(path)-1:
   j=len(path)-1
   while j>i+1 and top.intersects(LineString([path[i],path[j]])):j-=1
   simplified.append(path[j]);i=j
  path=simplified
 row={'via':name,'pin':t['from'],'found':bool(path),'path':path,'length':sum(math.dist(p,q) for p,q in zip(path,path[1:]))};results.append(row);print(json.dumps(row),flush=True)
(ROOT/'output/bent-ground-escapes085.json').write_text(json.dumps(results,indent=2)+'\n')
