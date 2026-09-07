"""Original 60-second instrumental bed and event-synchronised UI effects."""
import json, pathlib, wave
import numpy as np
P=pathlib.Path(__file__).resolve().parent
SR=48000; LENGTH=60; N=SR*LENGTH
mix=np.zeros((N,2),dtype=np.float32)
rng=np.random.default_rng(20260907)
def add(s,at,gain=1,pan=0):
 i=int(at*SR);s=np.asarray(s,dtype=np.float32)
 if i<0:s=s[-i:];i=0
 n=min(len(s),N-i)
 if n<=0:return
 mix[i:i+n,0]+=s[:n]*gain*np.sqrt((1-pan)/2)
 mix[i:i+n,1]+=s[:n]*gain*np.sqrt((1+pan)/2)
def hz(m):return 440*2**((m-69)/12)
def note(m,d,soft=False):
 t=np.arange(int(SR*d))/SR;f=hz(m)
 if soft:
  s=(np.sin(2*np.pi*f*t)+.32*np.sin(2*np.pi*f*1.002*t)+.13*np.sin(2*np.pi*f*2*t))
  e=np.minimum(t/.65,1)*np.minimum((d-t)/.9,1)
 else:
  s=np.sin(2*np.pi*f*t)+.18*np.sin(2*np.pi*f*2*t)
  e=(1-np.exp(-t*160))*np.exp(-t*4.8)*np.minimum((d-t)/.03,1)
 return s*e
# 96 BPM. Warm extended chords, restrained mallet melody, rounded bass.
beat=.625;bar=beat*4
chords=[[50,57,60,64],[46,53,57,60],[53,60,64,67],[48,55,58,62]]
for b in range(24):
 at=b*bar;ch=chords[(b//2)%4]
 for j,m in enumerate(ch):add(note(m+12,bar+.7,True),at,.026,(j-1.5)*.35)
 for k in [0,2]:add(note(ch[0]-12,1.1),at+k*beat,.085)
 for k in range(8):
  m=ch[[0,2,1,3,2,1,3,2][k]]+24
  add(note(m,.85),at+k*beat/2,.036,(-1 if k%2 else 1)*.36)
  add(note(m,.85),at+k*beat/2+.19,.009,(1 if k%2 else -1)*.5)
 if b>0 and b<23:
  for k in range(4):
   t=np.arange(int(SR*.19))/SR
   kick=np.sin(2*np.pi*(48*t+4*(1-np.exp(-t*32))))*np.exp(-t*25)
   add(kick,at+k*beat,.10)
  for k in range(8):
   t=np.arange(int(SR*.06))/SR;n=rng.normal(0,1,len(t));h=np.concatenate([[0],np.diff(n)])
   add(h*np.exp(-t*95),at+k*beat/2,.011,(-1 if k%2 else 1)*.25)
# Newly synthesised keystrokes, soft taps, and transition sweeps.
events=[]
for dest,src,dur,rate in [(4,3,7,.65),(11,27.7,8,.7),(19,39.8,6,.75),(25,12.9,6,.7),(48,48,6,.9)]:
 for e in json.loads((P.parent/'fresh-showcase/take.json').read_text())['events']:
  t=(e['t']-src)/rate
  if 0<=t<dur:events.append({'t':dest+t,'kind':e['kind']})
for e in json.loads((P/'take.json').read_text())['events']:events.append({'t':31+e['t']/.85,'kind':e['kind']})
for t in [4,11,19,25,31,48,54]:events.append({'t':t,'kind':'scene'})
meta={'events':events}
for e in meta['events']:
 at=e['t'];kind=e['kind']
 if kind in ('key','click'):
  d=.028 if kind=='key' else .075;t=np.arange(int(SR*d))/SR
  s=(rng.normal(0,1,len(t))*.25+np.sin(2*np.pi*(1450 if kind=='key' else 780)*t))
  s*=np.exp(-t*(180 if kind=='key' else 65))*np.minimum(t/.001,1)
  add(s,at,.035 if kind=='key' else .065,0)
 elif kind=='scene':
  t=np.arange(int(SR*.42))/SR
  n=rng.normal(0,1,len(t));n=np.convolve(n,np.ones(18)/18,mode='same')
  add(n*np.sin(np.pi*t/.42)**2,at,.11,-.15)
# Gentle completion tones around the final call to action.
for i,m in enumerate([74,77,81]):add(note(m,1.8),56+i*.14,.065,(i-1)*.2)
t=np.arange(N)/SR;env=np.minimum(t/1.2,1)*np.minimum((60-t)/2.4,1)
mix*=env[:,None];mix*=.78/max(.78,float(np.abs(mix).max()))
with wave.open(str(P/'original-score.wav'),'wb') as f:
 f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())
print('Original score generated. Peak:',float(np.abs(mix).max()))
