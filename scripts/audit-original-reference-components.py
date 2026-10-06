from pathlib import Path
p=Path(__file__).parent/'route-power-distribution.py';loader=p.read_text().split("print('geometry loaded'")[0];exec(compile(loader,str(p),'exec'))
for e in c:
 if e['type']=='pcb_copper_pour':ids[e['pcb_copper_pour_id']]=ids[e['source_net_id']]
owned=[]
for e in c:
 if e['type']=='pcb_copper_pour' and e['layer']=='top':
  b=e['brep_shape'];g=Polygon([(v['x'],v['y']) for v in b['outer_ring']['vertices']], [[(v['x'],v['y']) for v in h['vertices']] for h in b['inner_rings']]);
  if g.intersects(box(28.88,-18.4,31.09,-12.76)):owned.append((e,g))
report=[]
for n in {net(e) for e,g in owned}:
 own=[(g,ls) for g,ls,k in geoms if k==n];pour_indices={}
 for e in c:
  if e['type']=='pcb_copper_pour' and net(e)==n:
   b=e['brep_shape'];g=Polygon([(v['x'],v['y']) for v in b['outer_ring']['vertices']], [[(v['x'],v['y']) for v in h['vertices']] for h in b['inner_rings']]);pour_indices[e['pcb_copper_pour_id']]=len(own);own.append((g,[e['layer']]))
 tree=STRtree([g for g,ls in own]);parent=list(range(len(own)))
 def find(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 for i,(g,ls) in enumerate(own):
  for j in tree.query(g.buffer(1e-7)):
   j=int(j)
   if j<i and set(ls)&set(own[j][1]) and g.distance(own[j][0])<1e-7:parent[find(j)]=find(i)
 anchors={}
 for t in terminals:
  if t['net']!=n:continue
  pt=Point(t['x'],t['y'])
  for j in tree.query(pt.buffer(.0001)):
   j=int(j)
   if set(t['layers'])&set(own[j][1]) and own[j][0].distance(pt)<1e-7:anchors.setdefault(find(j),[]).append(t['selector']);break
 for e,g in owned:
  if net(e)!=n:continue
  root=find(pour_indices[e['pcb_copper_pour_id']]);row={'pour':e['pcb_copper_pour_id'],'net':labels.get(n),'area':g.area,'bounds':g.bounds,'anchorCount':len(anchors.get(root,[])),'anchors':anchors.get(root,[])[:5]};report.append(row);print(row,flush=True)
(ROOT/'output/cleaned-reference-connectivity.json').write_text(json.dumps(report,indent=2)+'\n')
