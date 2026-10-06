"""Generate signal-first local escapes. Movable bottom decouplers require
regeneration and native full-board DRC before these candidates can be accepted.
All coordinates are board-world millimeters (+X right, +Y up).
"""
import json, math, os, heapq
from pathlib import Path

root = Path(__file__).resolve().parent.parent
prefix=os.environ.get('SIGNAL_PREFIX','peripheral')
source = json.loads((root/f'output/{prefix}-signal-first.srj.json').read_text())
if prefix=='lcd':
    for c in source['connections']:c['nominalTraceWidth']=.14;c['width']=.14
circuit = json.loads((root/f'output/{prefix}-signal-first.circuit.json').read_text())
names = {e['source_trace_id']: e.get('name', '') for e in circuit if e['type']=='source_trace'}
refs = {e['source_component_id']: e['name'] for e in circuit if e['type']=='source_component'}
components = {e['pcb_component_id']: e for e in circuit if e['type']=='pcb_component'}
movable = {k for k,c in components.items() if c['layer']=='bottom' and refs.get(c['source_component_id'],'').startswith('C_')}
obstacles = [o for o in source['obstacles'] if not o.get('isCopperPour') and not (o.get('componentId') in movable and o['layers']==['bottom'])]

def ptseg(p,a,b):
    dx,dy=b[0]-a[0],b[1]-a[1]; q=dx*dx+dy*dy
    t=0 if not q else max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/q))
    return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
def segdist(a,b,c,d):
    def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    if cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0:return 0
    return min(ptseg(a,c,d),ptseg(b,c,d),ptseg(c,a,b),ptseg(d,a,b))
def local(o,p):
    x,y=p[0]-o['center']['x'],p[1]-o['center']['y']; t=math.radians(-o.get('ccwRotationDegrees',0))
    return x*math.cos(t)-y*math.sin(t),x*math.sin(t)+y*math.cos(t)
def padpt(o,p):
    x,y=local(o,p)
    return math.hypot(max(0,abs(x)-o['width']/2),max(0,abs(y)-o['height']/2))
def padseg(o,a,b):
    a,b=local(o,a),local(o,b); w,h=o['width']/2,o['height']/2
    if any(abs(p[0])<=w and abs(p[1])<=h for p in (a,b)):return 0
    corners=[(-w,-h),(w,-h),(w,h),(-w,h)]
    return min(segdist(a,b,c,d) for c,d in zip(corners,corners[1:]+corners[:1]))

segments=[];vias=[]
for t in source.get('traces',[]):
    for p in t['route']:
        if p['route_type']=='via':vias.append((p['x'],p['y'],p.get('via_diameter',.3)/2,t.get('connection_name')))
    for a,b in zip(t['route'],t['route'][1:]):
        if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']:
            segments.append(((a['x'],a['y']),(b['x'],b['y']),a['layer'],max(a.get('width',.1),b.get('width',.1))/2,t.get('connection_name')))
endpoints=[]
for connection in source['connections']:
    for index,p in enumerate(connection['pointsToConnect']):
        own=next(o for o in obstacles if o.get('componentId') and p.get('pcb_port_id')==o.get('circuitJsonMetadata',{}).get('pcb_port_id'))
        ref=refs[components[own['componentId']]['source_component_id']]
        endpoints.append((connection,index,p,own,ref))
endpoints.sort(key=lambda e:(0 if e[4]=='U1' else 1,e[4],e[2]['y'],e[2]['x']))
order=os.environ.get('SIGNAL_ORDER','normal')
if order=='reverse':endpoints.reverse()
if order=='outside':endpoints.sort(key=lambda e:(0 if e[4]=='U1' else 1,-max(abs(e[2]['x']),abs(e[2]['y'])) if e[4]=='U1' else 0))
if order=='inside':endpoints.sort(key=lambda e:(0 if e[4]=='U1' else 1,max(abs(e[2]['x']),abs(e[2]['y'])) if e[4]=='U1' else 0))
escapes=[];failures=[]
for connection,index,p,own,ref in endpoints:
    a=(p['x'],p['y']); name=connection['name'];layer=p['layer'];width=float(connection.get('nominalTraceWidth',.1));surface_width=.1 if prefix=='lcd' else width
    nearby=[o for o in obstacles if abs(o['center']['x']-a[0])<6+o['width']/2 and abs(o['center']['y']-a[1])<6+o['height']/2]
    near_segments=[s for s in segments if min(s[0][0],s[1][0])-6<a[0]<max(s[0][0],s[1][0])+6 and min(s[0][1],s[1][1])-6<a[1]<max(s[0][1],s[1][1])+6]
    near_vias=[v for v in vias if math.hypot(v[0]-a[0],v[1]-a[1])<7]
    # Include exact pad-edge escape sites; a coarse 0.05mm search otherwise
    # unnecessarily extends SMT dogbones beyond the native local fanout region.
    candidates=[(a[0]+sign*(own['width']/2+.251),a[1]) for sign in [-1,1]]+[(a[0],a[1]+sign*(own['height']/2+.251)) for sign in [-1,1]]
    for step in range(8,81):
        r=step*.05
        for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
            candidates.append((a[0]+dx*r,a[1]+dy*r))
    center=components[own['componentId']]['center']
    # Prefer outward pin escapes; length remains the primary criterion.
    candidates.sort(key=lambda b:(round(math.dist(a,b),7),-((b[0]-a[0])*(a[0]-center['x'])+(b[1]-a[1])*(a[1]-center['y']))))
    chosen=None;escape_points=None
    for b in candidates:
        # HDMI connector tails escape under the connector body. The ESD output
        # bank escapes toward its body, leaving a wider inner-layer corridor.
        if ref.startswith('U_USB_ESD') and (abs(b[0]-a[0])>1e-7 or (b[1]-a[1])*(center['y']-a[1])<=0):continue
        if ref=='J_HDMI' and (b[0]<=a[0] or abs(b[1]-a[1])>1e-7):continue
        if ref=='U_HDMI_ESD' and a[0]>center['x'] and (b[0]>=a[0] or abs(b[1]-a[1])>1e-7):continue
        if abs(b[0])>49.65 or abs(b[1])>39.65:continue
        if any(padpt(o,b)<.25-1e-7 for o in nearby):continue
        if any(padseg(o,a,b)<surface_width/2+.1-1e-7 for o in nearby if layer in o['layers'] and name not in o['connectedTo'] and p['pcb_port_id'] not in o['connectedTo']):continue
        if any(math.dist(b,v[:2])<.15+v[2]+.1-1e-7 or ptseg(v[:2],a,b)<surface_width/2+v[2]+.1-1e-7 for v in near_vias if v[3]!=name):continue
        if any(ptseg(b,c,d)<.15+w+.1-1e-7 or (l==layer and segdist(a,b,c,d)<surface_width/2+w+.1-1e-7) for c,d,l,w,n in near_segments if n!=name):continue
        chosen=b;break
    if chosen is None:
        # Short 0.10mm surface neckdowns can traverse the BGA grid before
        # entering a 0.14mm inner-layer LCD carrier. Do not drill over fixed DDR.
        top_width=.1
        def point(k):return (a[0]+k[0]*.2,a[1]+k[1]*.2)
        def clear_edge(c,d):
            return not(any(padseg(o,c,d)<top_width/2+.1-1e-7 for o in nearby if layer in o['layers'] and name not in o['connectedTo'] and p['pcb_port_id'] not in o['connectedTo']) or any(ptseg(v[:2],c,d)<top_width/2+v[2]+.1-1e-7 for v in near_vias if v[3]!=name) or any(segdist(c,d,e,f)<top_width/2+w+.1-1e-7 for e,f,l,w,n in near_segments if l==layer and n!=name))
        def clear_site(b):
            return not(any(padpt(o,b)<.251-1e-7 for o in nearby) or any(math.dist(b,v[:2])<.15+v[2]+.1-1e-7 for v in near_vias if v[3]!=name) or any(ptseg(b,c,d)<.15+w+.1-1e-7 for c,d,l,w,n in near_segments if n!=name))
        queue=[(0,(0,0))];cost={(0,0):0};parent={};visited=set()
        while queue:
            distance,key=heapq.heappop(queue)
            if key in visited:continue
            visited.add(key);q=point(key)
            if distance>4:break
            if key!=(0,0) and clear_site(q):
                chosen=q;path=[q]
                while key!=(0,0):key=parent[key];path.append(point(key))
                escape_points=list(reversed(path));break
            for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
                nxt=(key[0]+dx,key[1]+dy);v=point(nxt);new=distance+.2*math.hypot(dx,dy)
                if new>=cost.get(nxt,float('inf')) or new>4 or not clear_edge(q,v):continue
                cost[nxt]=new;parent[nxt]=key;heapq.heappush(queue,(new,nxt))
    if chosen is None:
        failures.append({'signal':names.get(name,name),'component':ref,'point':a});continue
    b=chosen
    points=escape_points or [a,b];top_width=.1 if escape_points else surface_width
    route=[{'route_type':'wire','x':q[0],'y':q[1],'layer':layer,'width':top_width} for q in points]+[{'route_type':'via','x':b[0],'y':b[1],'from_layer':layer,'to_layer':'inner2','layers':['top','inner1','inner2','bottom'],'via_diameter':.3,'via_hole_diameter':.15},{'route_type':'wire','x':b[0],'y':b[1],'layer':'inner2','width':width}]
    t={'type':'pcb_trace','pcb_trace_id':f'peripheral_escape_{len(escapes)}','connection_name':name,'source_trace_id':connection.get('source_trace_id',name),'route':route}
    escapes.append(t);connection['pointsToConnect'][index]={'x':b[0],'y':b[1],'layer':'inner2'}
    segments.extend((u,v,layer,top_width/2,name) for u,v in zip(points,points[1:]));vias.append((b[0],b[1],.15,name))
result={'escapes':escapes,'failures':failures,'requiresDecouplerRelocation':True,'requiresPowerRegeneration':True}
(root/f'output/{prefix}-signal-escapes.json').write_text(json.dumps(result,indent=2))
source['obstacles']=obstacles;source['traces']=[*source.get('traces',[]),*escapes];source['allowedLayers']=['inner1','inner2']
(root/f'output/{prefix}-escaped.srj.json').write_text(json.dumps(source))
print(json.dumps({'escaped':len(escapes),'expected':len(endpoints),'failures':failures}))
if failures:raise SystemExit(1)
