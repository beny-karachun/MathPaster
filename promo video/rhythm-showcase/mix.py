"""Licensed music plus the project's recorded keyboard and mouse samples."""
import json,subprocess,wave
from pathlib import Path
import numpy as np
P=Path(__file__).resolve().parent;R=P.parent;SR=48000;N=60*SR

def read(p):
 b=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ac','2','-ar',str(SR),'-f','f32le','-'])
 return np.frombuffer(b,dtype='<f4').reshape(-1,2).copy()

def save(name,x):
 with wave.open(str(P/name),'wb') as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())

music=read(P/'gimme-that-groove.mp3')[:N]
# Consistent music level; recorded UI sounds stay clearly above it.
music*=.105/np.sqrt(np.mean(music**2))
events=[]
for dest,src,dur,rate in [(4,3,7,.65),(11,27.7,8,.7),(19,39.8,6,.75),(25,12.9,6,.7),(48,48,6,.9)]:
 for e in json.loads((R/'fresh-showcase/take.json').read_text())['events']:
  t=(e['t']-src)/rate
  if 0<=t<dur:events.append({'t':dest+t,'kind':e['kind']})
for e in json.loads((R/'motion-showcase/take.json').read_text())['events']:
 events.append({'t':31+e['t']/.85,'kind':e['kind']})
keys=[read(R/f'sfx/key_{i}.wav') for i in range(8)]
click=read(R/'remotion/public/sfx/mouse-click.wav')
fx=np.zeros((N,2),np.float32);duck=np.ones(N,np.float32)
for i,e in enumerate(events):
 if e['kind'] not in ('key','click'):continue
 sample=(keys[i%8] if e['kind']=='key' else click).copy()
 active=np.where(np.max(np.abs(sample),axis=1)>.008)[0]
 if len(active):sample=sample[max(0,active[0]-240):min(len(sample),active[-1]+1200)]
 sample*= (.24 if e['kind']=='key' else .32)/max(.001,np.max(np.abs(sample)))
 at=int(e['t']*SR);n=min(len(sample),N-at)
 if n>0:fx[at:at+n]+=sample[:n]
 a=max(0,at-2400);b=min(N,at+int(.3*SR));t=np.arange(a,b)/SR-e['t'];dip=1-.35*np.exp(-(t/.12)**2);duck[a:b]=np.minimum(duck[a:b],dip)
t=np.arange(N)/SR;music*=duck[:,None];music*=np.minimum(t/.08,1)[:,None]*np.clip((60-t)/1.1,0,1)[:,None]
mix=music+fx
peak=np.max(np.abs(mix));mix*=min(1,.89/peak)
save('mix.wav',mix);save('ui-sounds.wav',fx)
print('Events:',sum(e['kind'] in ('key','click') for e in events),'Peak dBFS:',20*np.log10(np.max(np.abs(mix))))
