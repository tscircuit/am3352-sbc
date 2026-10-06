from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from scipy.ndimage import label
n=next(k for k,v in labels.items() if v=='EMU0');p=(-4.8,3.35);out=[]
for step in [.1,.05,.025]:
 xs=np.arange(-12,2+step/2,step);ys=np.arange(-2,12+step/2,step)
 for layer in ['inner1','inner2']:
  obs=unary_union([g for g,ls,k in geoms if k!=n and layer in ls]).buffer(.153);mask=contains_xy(obs,xs[None,:],ys[:,None]);regions,_=label(~mask,np.ones((3,3)));x=round((p[0]-xs[0])/step);y=round((p[1]-ys[0])/step);region=int(regions[y,x]);yy,xx=np.where(regions==region);edge=region>0 and bool(np.any(xx==0)|np.any(xx==len(xs)-1)|np.any(yy==0)|np.any(yy==len(ys)-1));out.append({'step':step,'layer':layer,'free':not bool(mask[y,x]),'regionCells':int(len(xx)) if region else 0,'reachesWindowEdge':edge,'bounds':None if not region else [float(xs[xx.min()]),float(ys[yy.min()]),float(xs[xx.max()]),float(ys[yy.max()])]})
print(json.dumps(out));(ROOT/'output/emu-inner-regions.json').write_text(json.dumps(out,indent=2)+'\n')
