import React from 'react';
import {AbsoluteFill,Sequence,Audio,Img,staticFile,useCurrentFrame,interpolate} from 'remotion';
import {TransitionSeries,linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {ClipScene} from './ClipScene';
import clips from './real-2026.json';
const TITLE=60, TRANSITION=10, TOTAL=1500;
const endLength=TOTAL-TITLE-clips.reduce((n,c)=>n+c.frames,0)+(clips.length+1)*TRANSITION;
const Card:React.FC<{end?:boolean}>=({end=false})=>{const f=useCurrentFrame();const a=interpolate(f,[0,20],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});return <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 40%,#19372c,#0b0e14 75%)',color:'#e4f6ed',fontFamily:'Arial,sans-serif',alignItems:'center',justifyContent:'center',gap:28}}><Img src={staticFile('showcase-icon.png')} style={{width:100,height:100,borderRadius:20,opacity:a}}/><h1 style={{fontSize:80,letterSpacing:-3,margin:0,opacity:a,transform:`translateY(${(1-a)*25}px)`}}>{end?'Write math. Skip the explanation.':'MathPaster. In action.'}</h1><div style={{fontSize:34,color:'#a5e6cd',opacity:a}}>{end?'Free Chrome extension · mathpaster.com':'Real editor. Real keystrokes.'}</div></AbsoluteFill>};
export const RealShowcase2026:React.FC=()=>{
 let cursor=TITLE-TRANSITION; const starts=clips.map(c=>{const n=cursor;cursor+=c.frames-TRANSITION;return n;});
 return <AbsoluteFill style={{background:'#0b0e14'}}><TransitionSeries><TransitionSeries.Sequence durationInFrames={TITLE}><Card/></TransitionSeries.Sequence><TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames:TRANSITION})}/>{clips.flatMap(c=>[<TransitionSeries.Sequence key={c.name} durationInFrames={c.frames}><ClipScene src={`real-2026/${c.name}.mp4`} durationInFrames={c.frames} events={c.events as {t:number;type:'key'|'click'}[]} zoom={1.045} origin="50% 50%"/></TransitionSeries.Sequence>,<TransitionSeries.Transition key={c.name+'fade'} presentation={fade()} timing={linearTiming({durationInFrames:TRANSITION})}/>])}<TransitionSeries.Sequence durationInFrames={endLength}><Card end/></TransitionSeries.Sequence></TransitionSeries>
 <Audio src={staticFile('track.mp3')} volume={f=>interpolate(f,[0,30,1400,1499],[0,.5,.5,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}/>
 {starts.map((s,i)=><Sequence key={i} from={s} durationInFrames={35}><Audio src={staticFile('sfx/whoosh.wav')} volume={.12}/></Sequence>)}
 </AbsoluteFill>;
};
