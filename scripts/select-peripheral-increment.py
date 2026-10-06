from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
source=ROOT.parent/'board-completion031/design'
fixed=json.loads((ROOT/'design/control-routes.json').read_text());remaining=json.loads((ROOT/'design/remaining-routes.json').read_text());candidates=json.loads((source/'control-routes.json').read_text());records={r['name']:r for r in json.loads((source/'remaining-routes.json').read_text())};serial=max(int(r['name'].rsplit('_',1)[1]) for r in remaining)+1;report=[]
chosen={'HDMI_TFADJ','HDMI_HPD_5V','HDMI_SCL','HDMI_SDA','PD_GATE'}
for entry in candidates:
 if entry['net'] not in chosen:continue
 owner=next(k for k,v in labels.items() if v==entry['net']);new=[]
 for a,b in zip(entry['route'],entry['route'][1:]):
  if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer'] and (a['x'],a['y'])!=(b['x'],b['y']):new.append((LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(a['width']/2,quad_segs=24),[a['layer']],owner))
 for p in entry['route']:
  if p['route_type']=='via':new.append((Point(p['x'],p['y']).buffer(.15,quad_segs=32),['top','inner1','inner2','bottom'],owner))
 tree=STRtree([g for g,ls,n in geoms]);failures=[]
 for g,ls,n in new:
  for i in tree.query(g.buffer(.104)):
   h,other,k=geoms[int(i)]
   if k!=n and set(ls)&set(other) and g.distance(h)<.1-1e-7:failures.append(labels.get(k,k))
 if failures:report.append({'original':entry['name'],'net':entry['net'],'accepted':False,'conflicts':sorted(set(failures))});continue
 old=entry['name'];entry['name']=f'REMAINING_{serial}';serial+=1;r=records[old];r['name']=entry['name'];remaining.append(r);fixed.append(entry);geoms.extend(new);report.append({'original':old,'name':entry['name'],'net':entry['net'],'accepted':True})
(ROOT/'design/control-routes.json').write_text(json.dumps(fixed,indent=2)+'\n');(ROOT/'design/remaining-routes.json').write_text(json.dumps(remaining,indent=2)+'\n');(ROOT/'output/selected-peripheral-increment.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
