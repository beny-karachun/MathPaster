from pathlib import Path
import subprocess
p=Path(__file__).resolve().parent.parent/'remotion'
shots=[(4,3,7,.65),(11,27.7,8,.7),(19,39.8,6,.75),(25,12.9,6,.7),(31,0,17,.85),(48,48,6,.9)]
for dest,start,dur,rate in shots:
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(p/'public/motion-cut'/('ai.mp4' if dest==31 else 'editor.mp4')),'-vf',f'setpts=(PTS-STARTPTS)/{rate},fps=30','-t',str(dur),'-an','-c:v','libx264','-preset','fast','-crf','16',str(p/f'public/motion-cut/shot-{dest}.mp4')],check=True)
s=p/'src/MotionCut.tsx';v=s.read_text();v=v.replace("src={staticFile('motion-cut/'+(shot.file||'editor.mp4'))} trimBefore={Math.round(shot.start*60/shot.rate)} playbackRate={shot.rate}","src={staticFile(`motion-cut/shot-${shot.from}.mp4`)}")
s.write_text(v)
