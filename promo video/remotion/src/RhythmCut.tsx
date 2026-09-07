import React from 'react';
import {AbsoluteFill,Sequence,useCurrentFrame,interpolate,Easing,staticFile} from 'remotion';
import {Audio,Video} from '@remotion/media';
import {shots,Shot} from './MotionCut';
const fast=Easing.bezier(.16,1,.3,1);
const intro=(f:number,delay=0)=>interpolate(f,[delay,delay+12],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:fast});
const green='#b7f0ce',bg='#101717';
// These are fixed editorial crops. There is no drifting camera or perspective tilt.
const crop=(shot:Shot,t:number)=>{
 if(shot.from===31){if(t<4.3)return [1.25,960,575];if(t<9.5)return [1.07,960,585];return [1.17,960,620];}
 if(shot.from===48)return [1.07,960,585];
 if(shot.from===11&&t<4.4)return [1.1,960,585];
 if(t<1.1||t>shot.duration-1.1)return [1.07,960,585];
 return [1.48,945,482];
};
const Scene:React.FC<{shot:Shot}>=({shot})=>{const f=useCurrentFrame();const [z,x,y]=crop(shot,f/30);return <AbsoluteFill>
 <div style={{position:'absolute',left:92,top:45,fontSize:19,letterSpacing:4,color:green}}>MATHPASTER</div>
 <div style={{position:'absolute',right:92,top:45,fontSize:16,letterSpacing:3,color:'#82988c'}}>{shot.label}</div>
 <div style={{position:'absolute',left:92,top:98,fontSize:57,letterSpacing:-1.7,fontWeight:500,transform:`translateY(${(1-intro(f))*22}px)`,opacity:intro(f)}}>{shot.line}</div>
 <div style={{position:'absolute',top:212,left:90,width:1740,height:720,overflow:'hidden'}}>
 <Video muted src={staticFile(`motion-cut/shot-${shot.from}.mp4`)} style={{position:'absolute',maxWidth:'none',width:1920,height:1080,transformOrigin:'0 0',transform:`translate(${870-x*z}px,${360-y*z}px) scale(${z})`}}/>
 </div>
 <div style={{position:'absolute',bottom:53,left:92,fontSize:24,color:green,opacity:intro(f,6)}}>{shot.tip}</div>
 <div style={{position:'absolute',bottom:22,left:92,width:1736,height:2,background:'#273a30'}}><div style={{height:2,width:`${100*f/(shot.duration*30)}%`,background:green}}/></div>
 </AbsoluteFill>};
const Title:React.FC<{end?:boolean}>=({end})=>{const f=useCurrentFrame();const lines=end?['Less explaining.','More mathematics.']:['Think it.','Type it.','Paste it.'];return <AbsoluteFill style={{padding:'75px 100px',justifyContent:'center'}}>
 <div style={{position:'absolute',top:60,fontSize:21,letterSpacing:4,color:green}}>MATHPASTER</div>
 {lines.map((text,i)=><div key={text} style={{fontSize:end?111:119,letterSpacing:-4,lineHeight:1.12,color:i===lines.length-1?green:'#f2f6f0',opacity:intro(f,i*15),transform:`translateY(${(1-intro(f,i*15))*35}px)`}}>{text}</div>)}
 <div style={{marginTop:44,fontSize:32,color:'#abc1b3',opacity:intro(f,end?30:50)}}>{end?'Try it free · mathpaster.com':'Math, straight from your keyboard.'}</div>
 {end&&<div style={{marginTop:33,display:'flex',gap:16,opacity:intro(f,60)}}>{['Write','Insert','Ask'].map((s,i)=><div key={s} style={{padding:'13px 24px',border:'1px solid #456451',color:green,fontSize:22,opacity:intro(f,60+i*12)}}>{s}</div>)}</div>}
 </AbsoluteFill>};
export const RhythmCut:React.FC=()=> <AbsoluteFill style={{background:bg,color:'#f2f6f0',fontFamily:'Arial,sans-serif'}}><Audio src={staticFile('motion-cut/rhythm.wav')}/><Sequence durationInFrames={120}><Title/></Sequence>{shots.map(s=><Sequence key={s.from} from={s.from*30} durationInFrames={s.duration*30}><Scene shot={s}/></Sequence>)}<Sequence from={1620} durationInFrames={180}><Title end/></Sequence></AbsoluteFill>;
