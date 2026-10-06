from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from shapely.affinity import translate
zq=next(k for k,v in labels.items() if v=='DDR_ZQ');ground=next(k for k,v in labels.items() if v=='GND')
for name,geom,ls,n in [('ZQ pad',box(-12-.3,-37.49-.3,-12+.3,-37.49+.3),['top'],zq),('GND pad',box(-12-.3,-38.51-.3,-12+.3,-38.51+.3),['top'],ground),('GND via',Point(-12.6,-38.51).buffer(.15,quad_segs=32),['top','inner1','inner2','bottom'],ground),('GND stub',LineString([(-12,-38.51),(-12.6,-38.51)]).buffer(.075),['top'],ground)]:
 gaps=[(geom.distance(g),labels.get(k,k)) for g,ll,k in geoms if k!=n and set(ls)&set(ll)]
 print(name,sorted(gaps)[:3])
