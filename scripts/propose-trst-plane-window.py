from pathlib import Path
exec(compile((Path(__file__).parent/'diagnose-removable-escape-blockers.py').read_text().split('for name in os.environ')[0],str(Path(__file__).parent/'diagnose-removable-escape-blockers.py'),'exec'))
n=next(k for k,v in labels.items() if v=='TRSTn');foreign=[(g,ls) for g,ls,k in geoms if k!=n];drill=unary_union([g for g,ls in foreign]).buffer(.253).union(allpads).union(unary_union(list(protected.values())).buffer(.283));prepare(drill)
obs={l:unary_union([g for g,ls in foreign if l in ls]).buffer(.153) for l in ['top','inner1','inner2']};obs['top']=obs['top'].union(protected['top'].buffer(.183))
for o in obs.values():prepare(o)
r=next(r for r in json.loads((ROOT/'design/control-routes.json').read_text()) if r['name']=='REMAINING_363');options=[]
for i,(a,b) in enumerate(zip(r['route'],r['route'][1:])):
 if a['route_type']!=b['route_type'] or a['route_type']!='wire' or a['layer']!=b['layer'] or a['layer']!='bottom':continue
 span=math.hypot(a['x']-b['x'],a['y']-b['y']);steps=max(1,round(span/.1));sites=[]
 for j in range(1,steps):
  t=j/steps;p=(a['x']+(b['x']-a['x'])*t,a['y']+(b['y']-a['y'])*t)
  if not drill.intersects(Point(p)):sites.append(p)
 for p in sites:
  for q in sites:
   gap=math.dist(p,q)
   if not 1.5<=gap<=2.5:continue
   if math.dist(p,(a['x'],a['y']))>=math.dist(q,(a['x'],a['y'])):continue
   for l,o in obs.items():
    if not o.intersects(LineString([p,q])):options.append({'segment':i,'layer':l,'a':p,'b':q,'windowLength':gap})
options.sort(key=lambda o:(0 if o['layer'].startswith('inner') else 1,-o['windowLength']));print(json.dumps(options[:20]),flush=True);(ROOT/'output/trst-plane-window-proposals084.json').write_text(json.dumps(options[:20],indent=2)+'\n')
