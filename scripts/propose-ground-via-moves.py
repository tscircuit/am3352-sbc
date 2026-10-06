from pathlib import Path
exec(compile((Path(__file__).parent/'diagnose-removable-escape-blockers.py').read_text().split('for name in os.environ')[0],str(Path(__file__).parent/'diagnose-removable-escape-blockers.py'),'exec'))
result=[]
for name in ['PG_VIA_12','PG_VIA_22','PG_VIA_74']:
 v=next(v for v in esc['vias'] if v['name']==name);t=next(t for t in esc['traces'] if t['via']==name);terminal=next(t1 for t1 in terminals if t1['selector']==t['from']);n=terminal['net'];a=(terminal['x'],terminal['y']);old=(v['x'],v['y']);area=Point(a).buffer(2)
 foreign=[(g,ls) for g,ls,k in geoms if k!=n and g.intersects(area)];top=unary_union([g for g,ls in foreign if 'top' in ls]).buffer(.153).union(protected['top'].buffer(.183));drill=unary_union([g for g,ls in foreign]).buffer(.253).union(allpads).union(protected['top'].buffer(.283))
 other=[Point(e['x'],e['y']).buffer(e['outer_diameter']/2+.253) for e in c if e['type']=='pcb_via' and math.dist((e['x'],e['y']),old)>1e-7];drill=drill.union(unary_union(other));prepare(top);prepare(drill);options=[]
 for dx in np.arange(-1.2,1.21,.05):
  for dy in np.arange(-1.2,1.21,.05):
   b=(round(a[0]+dx,4),round(a[1]+dy,4))
   if math.dist(b,old)<.51 or math.dist(a,b)>1.2 or drill.intersects(Point(b)) or top.intersects(LineString([a,b])):continue
   options.append({'x':b[0],'y':b[1],'length':math.dist(a,b)})
 options.sort(key=lambda p:p['length']);row={'name':name,'pin':t['from'],'old':old,'options':options[:10]};result.append(row);print(json.dumps(row),flush=True)
(ROOT/'output/ground-via-move-proposals084.json').write_text(json.dumps(result,indent=2)+'\n')
