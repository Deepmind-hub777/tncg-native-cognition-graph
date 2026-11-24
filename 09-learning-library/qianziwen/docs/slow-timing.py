# 生成 data/slow-timing.json：慢速朗读每个字的起始秒数（字间有静音，取 3 个最长静音段为字界）。用法：python3 docs/slow-timing.py data/slow-timing.json
# 估算慢速朗读里每个字的起始时间：RMS 包络，在有声区间内找 3 个最深谷作为字界
import numpy as np, subprocess, json, glob, os, sys
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','assets','audio')
SR=16000; HOP=160  # 10ms
def env(p):
  raw=subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(SR),'-f','s16le','-'],capture_output=True).stdout
  x=np.frombuffer(raw,np.int16).astype(np.float32)/32768
  n=len(x)//HOP; e=np.sqrt((x[:n*HOP].reshape(n,HOP)**2).mean(1)+1e-12)
  return np.convolve(e,np.ones(5)/5,'same'), len(x)/SR
def seg(p,k=4):
  e,dur=env(p); db=20*np.log10(e+1e-9); voiced=db>-55
  v=np.where(voiced)[0]; a,b=v[0],v[-1]
  gaps=[]; i=a
  while i<=b:
    if not voiced[i]:
      j=i
      while j<=b and not voiced[j]: j+=1
      gaps.append((j-i,i,j)); i=j
    else: i+=1
  gaps=sorted(gaps,reverse=True)[:k-1]
  if len(gaps)<k-1: return None,dur
  starts=[a]+sorted(g[2] for g in gaps)
  return [round(float(t)*HOP/SR,2) for t in starts]+[round(float(b)*HOP/SR,2)], round(dur,2)
out={}
for f in sorted(glob.glob(D+'/qzw-*-slow.mp3')):
  n=int(os.path.basename(f)[4:7]); t,d=seg(f)
  if t: out[str(n)]=t
  else: print('nogap',n)
json.dump(out,open(sys.argv[1],'w'),separators=(',',':'))
print(len(out), out['1'], out['18'], out['100'])
import statistics as S
d=[min(t[i+1]-t[i] for i in range(4)) for t in out.values()]; print('min syl',min(d),S.median(d))
