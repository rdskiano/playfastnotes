import React, { useState, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   SUPABASE
═══════════════════════════════════════════════════════════════════════ */
const SB_URL = 'https://twjdatheptwcskqhinie.supabase.co';
const SB_KEY = 'sb_publishable_BwKwqYjD_TTeL2BTu7jpTw_YQfdqvQ7';
const SB_H   = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
const sbGet  = p => fetch(SB_URL + p, { headers: SB_H });
const sbPost = (p, b) => fetch(SB_URL + p, { method:'POST', headers:{ ...SB_H, Prefer:'return=representation' }, body:JSON.stringify(b) });

/* ═══════════════════════════════════════════════════════════════════════
   DESIGN SYSTEM
═══════════════════════════════════════════════════════════════════════ */
const C = {
  ink:'#1a1612', surf:'#110f0c', panel:'#1e1a15',
  bord:'#2a231d', bord2:'#3a2e24',
  accent:'#8b3a1a', accentH:'#a04520', gold:'#9a7010',
  rule:'#c8b89a', cream:'#f5f0e8', mid:'#5a4e42',
  muted:'rgba(245,240,232,0.55)', dim:'rgba(245,240,232,0.25)',
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Bebas+Neue&family=Inconsolata:wght@400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html{height:-webkit-fill-available;}
  body{height:-webkit-fill-available;font-family:'Cormorant Garamond',Georgia,serif;background:${C.ink};
    padding-top:env(safe-area-inset-top);overflow:hidden;}
  #root{height:100%;}
  input[type=number],input[type=text],input[type=email]{
    background:${C.panel};color:${C.cream};border:1px solid ${C.bord};
    padding:9px 12px;font-family:'Inconsolata',monospace;font-size:1rem;width:100%;}
  input:focus{outline:1px solid ${C.accent};}
  input[type=number]{width:78px;text-align:center;}
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
  input[type=number]{-moz-appearance:textfield;}
  select{appearance:none;-webkit-appearance:none;background:${C.panel};color:${C.cream};
    border:1px solid ${C.bord};padding:9px 12px;font-family:'Inconsolata',monospace;
    font-size:0.9rem;width:100%;cursor:pointer;}
  select:focus{outline:1px solid ${C.accent};}
  button:focus{outline:none;}
`;

/* ═══════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
═══════════════════════════════════════════════════════════════════════ */
const Btn = ({ children, onClick, active, disabled, big, full, style={} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    fontFamily:"'Bebas Neue',sans-serif", letterSpacing:'0.1em',
    fontSize: big?'1.05rem':'0.88rem', padding: big?'12px 20px':'9px 16px',
    width: full?'100%':undefined,
    background: active?C.accent:disabled?'transparent':'#2a231d',
    color: active?'white':disabled?C.dim:C.cream,
    border:`1px solid ${active?C.accent:disabled?C.bord:'#555'}`,
    borderRadius:0, cursor:disabled?'not-allowed':'pointer',
    transition:'background 0.12s,color 0.12s,border-color 0.12s',
    userSelect:'none', WebkitTapHighlightColor:'transparent', ...style,
  }}>{children}</button>
);

const BackBtn = ({ onClick, label='← BACK' }) => (
  <button onClick={onClick} style={{
    background:'none',border:'none',color:C.cream,padding:0,
    fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
    letterSpacing:'0.1em',cursor:'pointer',
  }}>{label}</button>
);

const Field = ({ label, children }) => (
  <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
      letterSpacing:'0.2em',color:C.accent }}>{label}</div>
    {children}
  </div>
);

const TopBar = ({ left, center, right }) => (
  <div style={{
    display:'flex',alignItems:'center',justifyContent:'space-between',
    padding:'0 14px',height:46,flexShrink:0,
    borderBottom:`2px solid ${C.accent}`,background:C.ink,
  }}>
    <div style={{ minWidth:80 }}>{left}</div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.3rem',
      letterSpacing:'0.15em',color:C.cream,textAlign:'center' }}>{center}</div>
    <div style={{ minWidth:80,display:'flex',justifyContent:'flex-end' }}>{right}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════ */
const range = (a,b) => Array.from({length:b-a},(_,i)=>a+i);

function getProfile() { try { return JSON.parse(localStorage.getItem('murProfile')||'{}'); } catch { return {}; } }
function setProfile(p) { localStorage.setItem('murProfile', JSON.stringify(p)); }

function useWindowHeight() {
  const [h,setH] = useState(()=>window.innerHeight);
  useEffect(()=>{
    const u = ()=>setH(window.innerHeight);
    window.addEventListener('resize',u);
    window.addEventListener('orientationchange',()=>setTimeout(u,150));
    return ()=>window.removeEventListener('resize',u);
  },[]);
  return h;
}

function useOrientation() {
  const [land,setLand] = useState(()=>window.innerWidth>window.innerHeight);
  useEffect(()=>{
    const u = ()=>setLand(window.innerWidth>window.innerHeight);
    window.addEventListener('resize',u);
    window.addEventListener('orientationchange',()=>setTimeout(u,100));
    return ()=>window.removeEventListener('resize',u);
  },[]);
  return land;
}

function useIsLarge() {
  const [large,setLarge] = useState(()=>window.innerWidth>=768);
  useEffect(()=>{
    const u = ()=>setLarge(window.innerWidth>=768);
    window.addEventListener('resize',u);
    return ()=>window.removeEventListener('resize',u);
  },[]);
  return large;
}

/* ═══════════════════════════════════════════════════════════════════════
   ICU STEP GENERATOR
═══════════════════════════════════════════════════════════════════════ */
function generateSteps(N, start, goal, inc) {
  const extGoal = goal + Math.max(N*2,20)*inc;
  const tempos = [];
  for (let t=start; t<=extGoal+0.001; t+=inc) tempos.push(Math.round(t));
  const steps = [];
  tempos.forEach(tempo => steps.push({units:[0],tempo,phase:1}));
  for (let k=2; k<=N; k++) {
    const cs = [0,...Array.from({length:k-2},(_,i)=>k-2-i)];
    tempos.forEach((tempo,i) => {
      const units = (i%2===0) ? range(cs[Math.floor(i/2)%cs.length],k) : [k-1];
      steps.push({units,tempo,phase:k});
    });
  }
  return steps;
}

/* ═══════════════════════════════════════════════════════════════════════
   METRONOME
═══════════════════════════════════════════════════════════════════════ */
class Metro {
  constructor(){this.ctx=null;this.id=null;this.bpm=80;this.next=0;}
  _click(t){
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.connect(g);g.connect(this.ctx.destination);o.frequency.value=1100;
    g.gain.setValueAtTime(0.35,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.03);
    o.start(t);o.stop(t+0.04);
  }
  _sched(){
    while(this.next<this.ctx.currentTime+0.12){this._click(this.next);this.next+=60/this.bpm;}
    this.id=setTimeout(()=>this._sched(),40);
  }
  start(bpm){
    this.stop();this.bpm=bpm;
    if(!this.ctx)this.ctx=new(window.AudioContext||window.webkitAudioContext)();
    if(this.ctx.state==='suspended')this.ctx.resume();
    this.next=this.ctx.currentTime+0.05;this._sched();
  }
  setBpm(bpm){this.bpm=bpm;}
  stop(){if(this.id){clearTimeout(this.id);this.id=null;}}
}

/* ═══════════════════════════════════════════════════════════════════════
   MUR — PITCH / ABC HELPERS
═══════════════════════════════════════════════════════════════════════ */
const KEY_ACC = {
  'C':{},'G':{'F':'F#'},'D':{'F':'F#','C':'C#'},
  'A':{'F':'F#','C':'C#','G':'G#'},'E':{'F':'F#','C':'C#','G':'G#','D':'D#'},
  'B':{'F':'F#','C':'C#','G':'G#','D':'D#','A':'A#'},
  'Fs':{'F':'F#','C':'C#','G':'G#','D':'D#','A':'A#','E':'E#'},
  'F':{'B':'Bb'},'Bb':{'B':'Bb','E':'Eb'},'Eb':{'B':'Bb','E':'Eb','A':'Ab'},
  'Ab':{'B':'Bb','E':'Eb','A':'Ab','D':'Db'},
  'Db':{'B':'Bb','E':'Eb','A':'Ab','D':'Db','G':'Gb'},
  'Gb':{'B':'Bb','E':'Eb','A':'Ab','D':'Db','G':'Gb','C':'Cb'},
};

const MUR_CHR = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'E#':5,'Fb':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,'B#':12,'Cb':11};
function murMidi(n){
  const m=n.match(/^([A-G](?:##|bb|#|b|n)?)(\d)$/);if(!m)return 60;
  const pc=m[1].replace('n','');
  let s=MUR_CHR[pc]!==undefined?MUR_CHR[pc]:(pc.slice(-2)==='##'?(MUR_CHR[pc.slice(0,-1)]||0)+1:(MUR_CHR[pc.slice(0,-1)]||0)-1);
  return (parseInt(m[2])+1)*12+((s%12)+12)%12;
}

const DUR32 = {'32':1,'16':2,'16.':3,'8':4,'8.':6,'q':8,'q.':12,'h':16,'h.':24,'w':32};
const BEAT_BOUNDS = {
  '2/8':[4],'3/8':[4,8],'2/4':[8],'3/4':[8,16],'4/4':[8,16,24],
  '6/8':[12],'9/8':[12,24],'12/8':[12,24,36],
  '5/8':[8],'7/8':[8,16],'8/8':[8,16,24],'5/16':[4],'7/16':[4,8],
};

function codeToAbc(code, pitchName, barAcc, key) {
  const dotted=code.slice(-1)==='.', rest=code.slice(-1)==='r', tup=code.indexOf('t')!==-1&&!rest;
  const base=code.replace('.','').replace('r','').replace('t','');
  const durKey=base+(dotted?'.':'');
  const dur=DUR32[durKey]||DUR32[base]||4;
  if(rest) return 'z'+dur;
  const m=pitchName.match(/^([A-G])(##|bb|#|b|n)?(\d)$/);
  if(!m) return 'C'+dur;
  const pc=m[1],acc=m[2]||'',oct=parseInt(m[3]);
  let prefix='';
  const ka=KEY_ACC[key]||{};
  if(acc==='##'){prefix='^^';if(barAcc)barAcc[pc]='^^';}
  else if(acc==='bb'){prefix='__';if(barAcc)barAcc[pc]='__';}
  else if(acc==='#'){prefix='^';if(barAcc)barAcc[pc]='^';}
  else if(acc==='b'){prefix='_';if(barAcc)barAcc[pc]='_';}
  else if(acc==='n'){prefix='=';if(barAcc)barAcc[pc]='=';}
  else {
    let needsNat=false;
    if(barAcc&&barAcc[pc]){needsNat=true;delete barAcc[pc];}
    else{needsNat=Object.keys(ka).some(k=>ka[k]===pc+'b'||ka[k]===pc+'#');}
    prefix=needsNat?'=':'';
  }
  let abcOct=oct;
  if(pc==='B'&&(acc==='#'||acc==='##'))abcOct=oct-1;
  if(pc==='E'&&acc==='#')abcOct=oct-1;
  if(pc==='C'&&(acc==='b'||acc==='bb'))abcOct=oct+1;
  if(pc==='F'&&acc==='b')abcOct=oct+1;
  const noteLetter=abcOct<=4?pc:pc.toLowerCase();
  const octMod=abcOct===3?',':(abcOct===2?',,':(abcOct===1?',,,':(abcOct===6?"'":(abcOct===7?"''":(abcOct===8?"'''":'' )))));
  const noteStr=prefix+noteLetter+octMod+dur;
  if(tup) return '(3'+noteStr;
  return noteStr;
}

function buildAbcString(pat, pitches, clef, key) {
  const keyMap={'C':'C','G':'G','D':'D','A':'A','E':'E','B':'B','Fs':'F#','F':'F','Bb':'Bb','Eb':'Eb','Ab':'Ab','Db':'Db','Gb':'Gb'};
  const abcKey=keyMap[key]||'C';
  const abcClef=clef==='bass'?' clef=bass':clef==='alto'?' clef=alto':clef==='tenor'?' clef=tenor':'';
  const tsN=pat.timeSig.split('/')[0], tsD=pat.timeSig.split('/')[1];
  let pitchedPerRep=0;
  pat.notes.forEach(c=>{if(c.slice(-1)!=='r')pitchedPerRep++;});
  const repsNeeded=pitchedPerRep>0?Math.min(Math.ceil(pitches.length/pitchedPerRep),32):1;
  let pi=0;
  const bars=[];
  for(let rep=0;rep<repsNeeded;rep++){
    const barNotes=[];
    for(let ni=0;ni<pat.notes.length;ni++){
      const code=pat.notes[ni];
      const isRest=code.slice(-1)==='r', isTup=code.indexOf('t')!==-1&&!isRest;
      if(!isRest){if(pi<pitches.length){barNotes.push({code,pitch:pitches[pi],isRest,isTup});pi++;}else break;}
      else{barNotes.push({code,pitch:null,isRest,isTup});}
    }
    if(barNotes.length)bars.push(barNotes);
  }
  let beatBounds;
  if(pat.beaming&&pat.beaming.trim().length>0){
    const bs=pat.beaming.trim();
    if(bs==='0')beatBounds='none';
    else if(bs.indexOf('+')===-1)beatBounds=[];
    else{const groups=bs.split('+');let cum=0;beatBounds=[];for(let gi=0;gi<groups.length-1;gi++){cum+=parseInt(groups[gi])*4;beatBounds.push(cum);}}
  } else beatBounds=BEAT_BOUNDS[pat.timeSig]||[8];
  function nd32(code){
    const D={'32':1,'16':2,'16.':3,'8':4,'8.':6,'q':8,'q.':12,'h':16,'h.':24,'w':32};
    const dotted=code.indexOf('.')!==-1&&code.slice(-1)!=='r';
    const tup=code.indexOf('t')!==-1&&code.slice(-1)!=='r';
    const base=code.replace('.','').replace('r','').replace('t','');
    const key2=base+(dotted?'.':'');
    let v=D[key2]||D[base]||0;
    if(tup)v*=2/3;
    return v;
  }
  const barStrings=bars.map(bar=>{
    const tokens=[];let cum=0,i=0;
    const barAcc={};
    while(i<bar.length){
      const item=bar[i];const code=item.code;
      const isRest=item.isRest,isTup=item.isTup;
      const base=code.replace('.','').replace('r','').replace('t','');
      const d=nd32(code);const cumAfter=cum+d;
      if(isTup){
        let tripStr='(3';
        while(i<bar.length&&bar[i].isTup){tripStr+=codeToAbc(bar[i].code,bar[i].pitch,barAcc,key);cum+=nd32(bar[i].code);i++;}
        tokens.push(tripStr+' ');
      } else {
        const abcNote=codeToAbc(code,item.pitch,barAcc,key);
        let forceSpace;
        if(beatBounds==='none')forceSpace=true;
        else{const lb=beatBounds.some(b=>b===cumAfter),cb=beatBounds.some(b=>cum<b&&b<cumAfter);forceSpace=lb||cb;}
        const canBeam=(base==='8'||base==='16'||base==='32')&&!isRest;
        const nextItem=bar[i+1];
        const nextBase=nextItem?nextItem.code.replace('.','').replace('r','').replace('t',''):'';
        const nextBeam=canBeam&&nextItem&&!nextItem.isRest&&!nextItem.isTup&&(nextBase==='8'||nextBase==='16'||nextBase==='32');
        tokens.push(forceSpace?abcNote+' ':(nextBeam?abcNote:abcNote+' '));
        cum=cumAfter;i++;
      }
    }
    return tokens.join('').trim();
  });
  return 'X:1\nM:'+tsN+'/'+tsD+'\nL:1/32\nK:'+abcKey+abcClef+'\n'+barStrings.map(b=>'|'+b).join('')+'||';
}

/* ═══════════════════════════════════════════════════════════════════════
   MUR — RHYTHM DATABASE
═══════════════════════════════════════════════════════════════════════ */
const MUR_DB = [
{id:1,section:"Three-Note Rhythm Patterns",timeSig:"2/8",beaming:"",notes:["8","16","16"]},
{id:2,section:"Three-Note Rhythm Patterns",timeSig:"2/8",beaming:"",notes:["16","16","8"]},
{id:3,section:"Three-Note Rhythm Patterns",timeSig:"2/8",beaming:"",notes:["16","8","16"]},
{id:4,section:"Three-Note Rhythm Patterns",timeSig:"2/8",beaming:"",notes:["8","16.","32"]},
{id:5,section:"Three-Note Rhythm Patterns",timeSig:"2/8",beaming:"",notes:["8.","32","32"]},
{id:6,section:"Three-Note Rhythm Patterns",timeSig:"2/8",beaming:"",notes:["32","32","8."]},
{id:7,section:"Three-Note Rhythm Patterns",timeSig:"2/8",beaming:"0",notes:["32","8.","32"]},
{id:8,section:"Three-Note Rhythm Patterns",timeSig:"3/8",beaming:"2+1",notes:["8.","16","8"]},
{id:9,section:"Three-Note Rhythm Patterns",timeSig:"3/8",beaming:"1+2",notes:["8","8.","16"]},
{id:10,section:"Three-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["8","16","8."]},
{id:11,section:"Three-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["q.","8","8"]},
{id:12,section:"Three-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","8","q."]},
{id:13,section:"Three-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","q.","8"]},
{id:14,section:"Three-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["q","q","8"]},
{id:15,section:"Three-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["q","8","q"]},
{id:16,section:"Three-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8.","16","q."]},
{id:17,section:"Three-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["q.","8.","16"]},
{id:18,section:"Three-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["16","16","h"]},
{id:19,section:"Three-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["h","16","16"]},
{id:20,section:"Three-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["q","8.","8."]},
{id:21,section:"Three-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8.","8.","q"]},
{id:22,section:"Three-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["h","q","8"]},
{id:23,section:"Three-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["q.","q","q"]},
{id:24,section:"Three-Note Rhythm Patterns",timeSig:"7/8",beaming:"3+2+2",notes:["q.","q.","8"]},
{id:25,section:"Four-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["8","8","16","16"]},
{id:26,section:"Four-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["16","16","8","8"]},
{id:27,section:"Four-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["8","16","16","8"]},
{id:28,section:"Four-Note Rhythm Patterns",timeSig:"3/8",beaming:"3",notes:["16","8","8","16"]},
{id:29,section:"Four-Note Rhythm Patterns",timeSig:"3/8",beaming:"2+1",notes:["8.","16","16","16"]},
{id:30,section:"Four-Note Rhythm Patterns",timeSig:"3/8",beaming:"1+2",notes:["16","16","8.","16"]},
{id:31,section:"Four-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["16","8.","16","16"]},
{id:32,section:"Four-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["16","16","16","8."]},
{id:33,section:"Four-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8.","16","8","8"]},
{id:34,section:"Four-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8","8","8.","16"]},
{id:35,section:"Four-Note Rhythm Patterns",timeSig:"2/4",beaming:"4",notes:["8","8.","16","8"]},
{id:36,section:"Four-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","8.","8","8"]},
{id:37,section:"Four-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8.","16","16","8."]},
{id:38,section:"Four-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","8.","8.","16"]},
{id:39,section:"Four-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["q","8","8","8"]},
{id:40,section:"Four-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","q","8","8"]},
{id:41,section:"Four-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["q","8.","16","8"]},
{id:42,section:"Four-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8.","16","q","8"]},
{id:43,section:"Four-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["q","8","q","q"]},
{id:44,section:"Four-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["q","q","8","q"]},
{id:45,section:"Four-Note Rhythm Patterns",timeSig:"7/8",beaming:"3+3+2",notes:["q.","8.","16","q"]},
{id:46,section:"Five-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["8","16","16","16","16"]},
{id:47,section:"Five-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["16","16","16","16","8"]},
{id:48,section:"Five-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["16","16","8","16","16"]},
{id:49,section:"Five-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["8","16.","32","16.","32"]},
{id:50,section:"Five-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["16.","32","16.","32","8"]},
{id:51,section:"Five-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["8","8","16t","16t","16t"]},
{id:52,section:"Five-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["16t","16t","16t","8","8"]},
{id:53,section:"Five-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["8","16t","16t","16t","8"]},
{id:54,section:"Five-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["q","16","16","16","16"]},
{id:55,section:"Five-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","16","16","q"]},
{id:56,section:"Five-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8","8","8t","8t","8t"]},
{id:57,section:"Five-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8t","8t","8t","8","8"]},
{id:58,section:"Five-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8.","16","8t","8t","8t"]},
{id:59,section:"Five-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8t","8t","8t","8.","16"]},
{id:60,section:"Five-Note Rhythm Patterns",timeSig:"5/16",beaming:"",notes:["16.","32","16","16","16"]},
{id:61,section:"Five-Note Rhythm Patterns",timeSig:"5/16",beaming:"",notes:["16","16","16","16.","32"]},
{id:62,section:"Five-Note Rhythm Patterns",timeSig:"5/16",beaming:"",notes:["8","16","16","32","32"]},
{id:63,section:"Five-Note Rhythm Patterns",timeSig:"5/16",beaming:"",notes:["32","32","16","16","8"]},
{id:64,section:"Five-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8.","16","8.","16","8"]},
{id:65,section:"Five-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8.","16","8","8.","16"]},
{id:66,section:"Five-Note Rhythm Patterns",timeSig:"7/16",beaming:"",notes:["8","8","16","16","16"]},
{id:67,section:"Five-Note Rhythm Patterns",timeSig:"7/16",beaming:"",notes:["8","16","16","8","16"]},
{id:68,section:"Five-Note Rhythm Patterns",timeSig:"7/16",beaming:"",notes:["8","16","16","16","8"]},
{id:69,section:"Five-Note Rhythm Patterns",timeSig:"7/16",beaming:"",notes:["16","16","8","8","16"]},
{id:70,section:"Five-Note Rhythm Patterns",timeSig:"7/16",beaming:"3+4",notes:["16","16","16","8.","16"]},
{id:71,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8","8","16","16","16","16"]},
{id:72,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8","16","16","16","16","8"]},
{id:73,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","16","16","8","8"]},
{id:74,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","8","8","16","16"]},
{id:75,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","8","16","8","16","16"]},
{id:76,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","8","16","16","16","8"]},
{id:77,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","8","8","16","16","16"]},
{id:78,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8","16","16","16","8","16"]},
{id:79,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"2+2",notes:["8","8","8","16t","16t","16t"]},
{id:80,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"2+2",notes:["8","8","16t","16t","16t","8"]},
{id:81,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"2+2",notes:["8","16t","16t","16t","8","8"]},
{id:82,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"2+2",notes:["16t","16t","16t","8","8","8"]},
{id:83,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8.","16","16","16","16","16"]},
{id:84,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"2",notes:["16","16","8.","16","16","16"]},
{id:85,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","16","16","16","8."]},
{id:86,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","8.","16","16","16","16"]},
{id:87,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"2+2",notes:["8.","32t","32t","32t","8.","16"]},
{id:88,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"2+2",notes:["8.","16","8.","32t","32t","32t"]},
{id:89,section:"Six-Note Rhythm Patterns",timeSig:"2/4",beaming:"2+2",notes:["32t","32t","32t","8.","16","8."]},
{id:90,section:"Six-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["8","8","32","32","32","32"]},
{id:91,section:"Six-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["32","32","32","32","8","8"]},
{id:92,section:"Six-Note Rhythm Patterns",timeSig:"3/8",beaming:"3",notes:["32","32","8","8","32","32"]},
{id:93,section:"Six-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["8","16","16","16t","16t","16t"]},
{id:94,section:"Six-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["16t","16t","16t","16","16","8"]},
{id:95,section:"Six-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["16t","16t","16t","8.","32","32"]},
{id:96,section:"Six-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["8","8","8","8.","16","8"]},
{id:97,section:"Six-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["8.","16","8","8","8","8"]},
{id:98,section:"Six-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["8","8.","16","8.","16","8"]},
{id:99,section:"Six-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["8.","16","8","8","8.","16"]},
{id:100,section:"Six-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["16","16","8","8","8","8"]},
{id:101,section:"Six-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","16","16","8","8","8"]},
{id:102,section:"Six-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","8","16","16","8","8"]},
{id:103,section:"Six-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","8","8","16","16","8"]},
{id:104,section:"Six-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","8","8","8","16","16"]},
{id:105,section:"Six-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["16","16","8","8.","16","8"]},
{id:106,section:"Six-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8.","16","8","8","16","16"]},
{id:107,section:"Six-Note Rhythm Patterns",timeSig:"5/8",beaming:"3+2",notes:["16","16","8.","16","8.","16"]},
{id:108,section:"Six-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8.","16","8.","16","16","16"]},
{id:109,section:"Seven-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8","16","16","16","16","16","16"]},
{id:110,section:"Seven-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","16","16","16","16","8"]},
{id:111,section:"Seven-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","8","16","16","16","16"]},
{id:112,section:"Seven-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","8","16","16","16","16","16"]},
{id:113,section:"Seven-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8","16.","32","16.","32","16.","32"]},
{id:114,section:"Seven-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["32","16.","32","16.","32","16.","8"]},
{id:115,section:"Seven-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["q","16t","16t","16t","16t","16t","16t"]},
{id:116,section:"Seven-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16t","16t","16t","16t","16t","16t","q"]},
{id:117,section:"Seven-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16t","16t","16t","q","16t","16t","16t"]},
{id:118,section:"Seven-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","16","16","8t","8t","8t"]},
{id:119,section:"Seven-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8t","8t","8t","16","16","16","16"]},
{id:120,section:"Seven-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["8","16t","16t","16t","16t","16t","16t"]},
{id:121,section:"Seven-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["16t","16t","16t","8","16t","16t","16t"]},
{id:122,section:"Seven-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["16t","16t","16t","16t","16t","16t","8"]},
{id:123,section:"Seven-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["8","16","16","32","32","32","32"]},
{id:124,section:"Seven-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["32","32","32","32","16","16","8"]},
{id:125,section:"Seven-Note Rhythm Patterns",timeSig:"3/8",beaming:"",notes:["32","32","32","32","8","16","16"]},
{id:126,section:"Seven-Note Rhythm Patterns",timeSig:"3/4",beaming:"",notes:["8.","16","16","8","16","16","8."]},
{id:127,section:"Seven-Note Rhythm Patterns",timeSig:"3/4",beaming:"4+2",notes:["16","8","8","8","16","8.","16"]},
{id:128,section:"Seven-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","8","8","16","16","16","16"]},
{id:129,section:"Seven-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["16","16","16","16","8","8","8"]},
{id:130,section:"Seven-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","8","16","16","8","16","16"]},
{id:131,section:"Seven-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","16","16","8","16","16","8"]},
{id:132,section:"Seven-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["16","16","8","8","8","16","16"]},
{id:133,section:"Seven-Note Rhythm Patterns",timeSig:"5/8",beaming:"5",notes:["16","8","16","16","8","16","8"]},
{id:134,section:"Seven-Note Rhythm Patterns",timeSig:"5/8",beaming:"5",notes:["16","8","16","8","16","8","16"]},
{id:135,section:"Seven-Note Rhythm Patterns",timeSig:"5/8",beaming:"5",notes:["8.","16","16","8","16","16","16"]},
{id:136,section:"Seven-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8.","16","8","16.","32","16.","32"]},
{id:137,section:"Seven-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["16.","32","16.","32","8.","16","8"]},
{id:138,section:"Seven-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["8.","16","8.","16","8.","16","8"]},
{id:139,section:"Seven-Note Rhythm Patterns",timeSig:"7/8",beaming:"3+4",notes:["8.","16","8","8.","16","8.","16"]},
{id:140,section:"Seven-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["8.","16","8.","16","8","8.","16"]},
{id:141,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16.","32","16","16","16","16","16","16"]},
{id:142,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["32","16.","16","16","16","16","16","16"]},
{id:143,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","16","16","16.","32","16","16"]},
{id:144,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","16","16","16","16","32","16."]},
{id:145,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16.","32","16","16","16","16","32","16."]},
{id:146,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","32","16.","16.","32","16","16"]},
{id:147,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","16","16","16.","32","16.","32"]},
{id:148,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["32","16.","32","16.","16","16","16","16"]},
{id:149,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16","16","16.","32","16.","32","16","16"]},
{id:150,section:"Eight-Note Rhythm Patterns",timeSig:"4/4",beaming:"",notes:["8.","16","8.","16","16","8.","16","8."]},
{id:151,section:"Eight-Note Rhythm Patterns",timeSig:"4/4",beaming:"",notes:["16","8.","16","8.","8.","16","8.","16"]},
{id:152,section:"Eight-Note Rhythm Patterns",timeSig:"4/4",beaming:"",notes:["8.","16","16","8.","16","8.","8.","16"]},
{id:153,section:"Eight-Note Rhythm Patterns",timeSig:"4/4",beaming:"",notes:["16","8.","8.","16","16","8.","8.","16"]},
{id:154,section:"Eight-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["8","8","16","16","16","16","8","8"]},
{id:155,section:"Eight-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["8","16","16","8","8","8","16","16"]},
{id:156,section:"Eight-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["16","16","8","8","8","16","16","8"]},
{id:157,section:"Eight-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["8","16","16","16","16","8.","16","8"]},
{id:158,section:"Eight-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["8.","16","16","16","16","16","16","8."]},
{id:159,section:"Eight-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["8","8.","16","16","16","16","16","8"]},
{id:160,section:"Eight-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["16","8","8","16","16","16","8","8"]},
{id:161,section:"Eight-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["16","8","8","16","8","16.","32","8"]},
{id:162,section:"Eight-Note Rhythm Patterns",timeSig:"6/8",beaming:"",notes:["8","8","16","16","16","8","8","16"]},
{id:163,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8","16t","16t","16t","16t","16t","16t","8"]},
{id:164,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16t","16t","16t","8","8","16t","16t","16t"]},
{id:165,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8","16t","16t","16t","16","16","16","16"]},
{id:166,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["16.","32","16.","32","16t","16t","16t","8"]},
{id:167,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["8t","8t","8t","8","32","32","32","32"]},
{id:168,section:"Eight-Note Rhythm Patterns",timeSig:"2/4",beaming:"",notes:["32","32","32","32","8","8t","8t","8t"]},
{id:169,section:"Eight-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","8","16","16","16","16","16","16"]},
{id:170,section:"Eight-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["16","16","16","16","8","16","16","8"]},
{id:171,section:"Eight-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["16.","32","16.","32","16.","32","8.","16"]},
{id:172,section:"Eight-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8.","16","16.","32","16.","32","16.","32"]},
{id:173,section:"Eight-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["16.","32","16.","32","8","16.","32","8"]},
{id:174,section:"Eight-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8","8","8","8","32","32","32","32"]},
{id:175,section:"Eight-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["8.","16","32","32","32","32","8.","16"]},
{id:176,section:"Eight-Note Rhythm Patterns",timeSig:"5/8",beaming:"",notes:["32","32","32","32","8","8.","16","8"]},
{id:177,section:"Eight-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["8","8","8","8","8","8","16","16"]},
{id:178,section:"Eight-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["8","8","8","16","16","8","8","8"]},
{id:179,section:"Eight-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["8.","16","8.","16","8.","16","16","16"]},
{id:180,section:"Eight-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["16","8","8","16","8.","16","16","8."]},
{id:181,section:"Eight-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["16","16","8","8","8","8.","16","8"]},
{id:182,section:"Eight-Note Rhythm Patterns",timeSig:"7/8",beaming:"",notes:["8.","16","8","8.","16","8","16","16"]},
{id:183,section:"Eight-Note Rhythm Patterns",timeSig:"8/8",beaming:"",notes:["8.","16","8.","16","8","8.","16","8"]},
{id:184,section:"Eight-Note Rhythm Patterns",timeSig:"8/8",beaming:"",notes:["16","8","16","q","8","8.","16","8"]},
{id:185,section:"Eight-Note Rhythm Patterns",timeSig:"8/8",beaming:"",notes:["8.","16","8","8.","16","8.","16","8"]},
{id:186,section:"Eight-Note Rhythm Patterns",timeSig:"8/8",beaming:"",notes:["16","8","8","16","q","8","8","8"]},
];

function g2s(n){return{3:"Three-Note Rhythm Patterns",4:"Four-Note Rhythm Patterns",5:"Five-Note Rhythm Patterns",6:"Six-Note Rhythm Patterns",7:"Seven-Note Rhythm Patterns",8:"Eight-Note Rhythm Patterns"}[n]||'';}

/* ═══════════════════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════════════════ */
function RootContainer({children}) {
  const h = useWindowHeight();
  return (
    <div style={{height:h,background:C.ink,color:C.cream,
      display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {children}
    </div>
  );
}

export default function App() {
  const [screen,setScreen]         = useState('signin');
  const [profile,setProfileState]  = useState(getProfile);
  const [piece,setPiece]           = useState(null);
  const [pageImages,setPageImages] = useState([]);
  const [currentPage,setCurrentPage] = useState(0);
  const [markers,setMarkers]       = useState([]);
  const [startTempo,setStartTempo] = useState(60);
  const [goalTempo,setGoalTempo]   = useState(120);
  const [increment,setIncrement]   = useState(5);
  const [savedExercise,setSavedExercise] = useState(null);
  const [sessionMode,setSessionMode]   = useState('massed'); // 'massed' | 'interleaved'
  const [tapPos,setTapPos]             = useState(null);     // {page,x,y} where user tapped
  const N = markers.length;

  const saveProf = p => { setProfile(p); setProfileState(p); };

  useEffect(()=>{ if(getProfile()?.email) setScreen('library'); },[]);

  return (
    <RootContainer>
      <style>{FONTS}</style>

      {screen==='signin' && (
        <SignInScreen onSignIn={p=>{saveProf(p);setScreen('library');}} />
      )}

      {screen==='library' && (
        <LibraryScreen
          profile={profile}
          onSelectRepertoire={(p,imgs)=>{
            setPiece(p);setPageImages(imgs);
            setMarkers([]);setCurrentPage(0);
            setScreen('score');
          }}
          onLoadExercise={ex=>{
            setSavedExercise(ex);setPiece(null);setPageImages([]);
            setScreen('mur');
          }}
          onSignOut={()=>{setProfile({});setProfileState({});setScreen('signin');}}
        />
      )}

      {/* Score view — home base for a piece */}
      {screen==='score' && (
        <ScoreViewScreen
          piece={piece} pageImages={pageImages}
          currentPage={currentPage} setCurrentPage={setCurrentPage}
          sessionMode={sessionMode} setSessionMode={setSessionMode}
          onBack={()=>setScreen('library')}
          onTapPassage={(pos)=>{
            setTapPos(pos);
            setScreen('strategy-menu');
          }}
        />
      )}

      {/* Strategy picker — appears after tapping a passage */}
      {screen==='strategy-menu' && (
        <StrategyMenuScreen
          piece={piece}
          tapPos={tapPos}
          sessionMode={sessionMode}
          onICU={()=>{ setMarkers([]); setScreen('mark'); }}
          onMUR={()=>{ setSavedExercise(null); setScreen('mur'); }}
          onBack={()=>setScreen('score')}
        />
      )}

      {screen==='mark' && (
        <MarkerScreen
          piece={piece} pageImages={pageImages}
          currentPage={currentPage} setCurrentPage={setCurrentPage}
          markers={markers} setMarkers={setMarkers}
          onBack={()=>setScreen('strategy-menu')}
          onNext={()=>setScreen('params')}
        />
      )}

      {screen==='params' && (
        <ParamsScreen
          N={N}
          startTempo={startTempo} setStartTempo={setStartTempo}
          goalTempo={goalTempo}   setGoalTempo={setGoalTempo}
          increment={increment}   setIncrement={setIncrement}
          onBack={()=>setScreen('mark')} onStart={()=>setScreen('session')}
        />
      )}

      {screen==='session' && (
        <SessionScreen
          pageImages={pageImages} markers={markers} N={N}
          startTempo={startTempo} goalTempo={goalTempo} increment={increment}
          profile={profile} piece={piece} tapPos={tapPos}
          onBack={()=>setScreen('params')}
          onDone={()=>setScreen('score')}
        />
      )}

      {screen==='mur' && (
        <MURScreen
          piece={piece} pageImages={pageImages}
          profile={profile} savedExercise={savedExercise}
          tapPos={tapPos}
          onBack={()=>setScreen(piece?'score':'library')}
        />
      )}

    </RootContainer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SIGN IN
═══════════════════════════════════════════════════════════════════════ */
function SignInScreen({ onSignIn }) {
  const [email,setEmail]   = useState('');
  const [name,setName]     = useState('');
  const [inst,setInst]     = useState('');
  const [msg,setMsg]       = useState('');
  const [loading,setLoad]  = useState(false);
  const INSTRUMENTS = ['Flute','Oboe','Clarinet','Bassoon','Saxophone','Horn','Trumpet','Trombone','Tuba','Violin','Viola','Cello','Double Bass','Harp','Piano','Percussion','Voice','Other'];

  const submit = async () => {
    if(!email.trim()){setMsg('Please enter your email.');return;}
    setLoad(true);setMsg('');
    try {
      const r = await sbGet(`/rest/v1/profiles?email=eq.${encodeURIComponent(email.trim())}&limit=1`);
      const rows = await r.json();
      let p;
      if(rows?.length){
        p={email:rows[0].email,name:rows[0].name||'',instrument:rows[0].instrument||''};
        setMsg('Welcome back, '+(p.name||p.email)+'!');
      } else {
        if(!name.trim()||!inst){setMsg('New account — please enter your name and instrument.');setLoad(false);return;}
        await fetch(SB_URL+'/rest/v1/profiles',{method:'POST',headers:{...SB_H,Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({email:email.trim(),name:name.trim(),instrument:inst})});
        p={email:email.trim(),name:name.trim(),instrument:inst};
        setMsg('Account created!');
      }
      setTimeout(()=>onSignIn(p),800);
    } catch { setMsg('Connection error.'); setLoad(false); }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:'1 1 0',minHeight:0,padding:'32px 24px',gap:36,overflowY:'auto'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(2rem,8vw,3rem)',letterSpacing:'0.2em',color:C.accent,lineHeight:1}}>
          PLAY FAST<br/>NOTES
        </div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:'1.1rem',color:C.muted,marginTop:8}}>
          Practice tools for serious musicians
        </div>
      </div>
      <div style={{width:'100%',maxWidth:380,display:'flex',flexDirection:'column',gap:16}}>
        <Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e=>e.key==='Enter'&&submit()} /></Field>
        <Field label="Name (new accounts only)"><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" /></Field>
        <Field label="Instrument (new accounts only)">
          <div style={{position:'relative'}}>
            <select value={inst} onChange={e=>setInst(e.target.value)}>
              <option value="">Select instrument...</option>
              {INSTRUMENTS.map(i=><option key={i}>{i}</option>)}
            </select>
            <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:C.muted,pointerEvents:'none'}}>&#9662;</span>
          </div>
        </Field>
        {msg && <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.85rem',color:msg.includes('error')||msg.includes('Please')||msg.includes('New')?'#e57373':C.gold}}>{msg}</div>}
        <Btn onClick={submit} disabled={loading} big full>{loading?'CHECKING...':'SIGN IN →'}</Btn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LIBRARY
═══════════════════════════════════════════════════════════════════════ */
function LibraryScreen({ profile, onSelectRepertoire, onLoadExercise, onSignOut }) {
  const [tab,setTab]         = useState('pieces');
  const [pieces,setPieces]   = useState([]);
  const [exercises,setExercises] = useState([]);
  const [loading,setLoading] = useState(true);
  const [showUpload,setShowUpload] = useState(false);
  const [title,setTitle]     = useState('');
  const [composer,setComposer] = useState('');
  const [inst,setInst]       = useState(profile.instrument||'');
  const [uploading,setUploading] = useState(false);
  const [uploadMsg,setUploadMsg] = useState('');
  const fileRef = useRef();
  const INSTRUMENTS = ['Flute','Oboe','Clarinet','Bassoon','Saxophone','Horn','Trumpet','Trombone','Tuba','Violin','Viola','Cello','Double Bass','Harp','Piano','Percussion','Voice','Other'];

  useEffect(()=>{ loadAll(); },[tab]);

  const loadAll = async () => {
    setLoading(true);
    try {
      if(tab==='pieces'){
        const r = await sbGet(`/rest/v1/pieces?user_email=eq.${encodeURIComponent(profile.email)}&order=created_at.desc`);
        setPieces(await r.json()||[]);
      } else {
        const r = await sbGet(`/rest/v1/exercises?user_email=eq.${encodeURIComponent(profile.email)}&order=created_at.desc`);
        setExercises(await r.json()||[]);
      }
    } catch { setPieces([]); setExercises([]); }
    setLoading(false);
  };

  const uploadFile = async file => {
    if(!title.trim()){setUploadMsg('Please enter a title.');return;}
    if(!file){setUploadMsg('Please select a file.');return;}
    setUploading(true);setUploadMsg('Uploading...');
    try {
      const ext=file.name.split('.').pop().toLowerCase();
      const type=ext==='pdf'?'pdf':'image';
      const path=`${profile.email.replace('@','_')}/${Date.now()}.${ext}`;
      const up = await fetch(`${SB_URL}/storage/v1/object/pieces/${path}`,{method:'POST',headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':file.type,'x-upsert':'true'},body:file});
      if(!up.ok) throw new Error('Upload failed');
      const fileUrl=`${SB_URL}/storage/v1/object/public/pieces/${path}`;
      await sbPost('/rest/v1/pieces',{user_email:profile.email,title:title.trim(),composer:composer.trim(),instrument:inst,file_url:fileUrl,file_type:type});
      setUploadMsg('Saved!');setTitle('');setComposer('');
      setTimeout(()=>{setShowUpload(false);setUploadMsg('');loadAll();},800);
    } catch(e){setUploadMsg('Upload failed. '+e.message);}
    setUploading(false);
  };

  const openPiece = async piece => {
    if(piece.file_type==='image'){
      onSelectRepertoire(piece,[piece.file_url]);
    } else {
      try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        if(!pdfjsLib) throw new Error('PDF.js not loaded');
        pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument(piece.file_url).promise;
        const imgs=[];
        for(let p=1;p<=pdf.numPages;p++){
          const page=await pdf.getPage(p);
          const vp=page.getViewport({scale:2});
          const canvas=document.createElement('canvas');
          canvas.width=vp.width;canvas.height=vp.height;
          await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
          imgs.push(canvas.toDataURL('image/png'));
        }
        onSelectRepertoire(piece,imgs);
      } catch { onSelectRepertoire(piece,[piece.file_url]); }
    }
  };

  const tabStyle = active => ({
    fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'0.12em',
    padding:'10px 20px',cursor:'pointer',background:'none',border:'none',
    color:active?C.cream:C.muted,
    borderBottom:active?`2px solid ${C.accent}`:'2px solid transparent',
  });

  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <TopBar
        left={<span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',color:C.cream}}>{profile.name||profile.email}</span>}
        center="MY LIBRARY"
        right={<BackBtn onClick={onSignOut} label="SIGN OUT" />}
      />

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:`1px solid ${C.bord}`,flexShrink:0,background:C.ink}}>
        <button style={tabStyle(tab==='pieces')} onClick={()=>setTab('pieces')}>Repertoire</button>
        <button style={tabStyle(tab==='exercises')} onClick={()=>setTab('exercises')}>Exercises</button>
      </div>

      <div style={{flex:'1 1 0',overflowY:'auto',padding:16}}>
        {tab==='pieces' && (
          <>
            <button onClick={()=>setShowUpload(s=>!s)} style={{
              width:'100%',border:`2px dashed ${C.bord2}`,background:'none',
              color:C.cream,padding:18,fontFamily:"'Bebas Neue',sans-serif",
              fontSize:'1rem',letterSpacing:'0.12em',cursor:'pointer',marginBottom:16
            }}>+ ADD REPERTOIRE</button>

            {showUpload && (
              <div style={{background:C.panel,border:`1px solid ${C.bord}`,padding:20,marginBottom:20,display:'flex',flexDirection:'column',gap:14}}>
                <Field label="Title"><input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Brahms Sonata mvt 1" /></Field>
                <Field label="Composer"><input type="text" value={composer} onChange={e=>setComposer(e.target.value)} placeholder="e.g. Brahms" /></Field>
                <Field label="Instrument">
                  <div style={{position:'relative'}}>
                    <select value={inst} onChange={e=>setInst(e.target.value)}>
                      <option value="">Select...</option>
                      {INSTRUMENTS.map(i=><option key={i}>{i}</option>)}
                    </select>
                    <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:C.muted,pointerEvents:'none'}}>&#9662;</span>
                  </div>
                </Field>
                <Field label="File (PDF or image)">
                  <input ref={fileRef} type="file" accept=".pdf,image/*"
                    style={{padding:'8px 0',border:'none',background:'none',color:C.cream,fontFamily:"'Inconsolata',monospace",fontSize:'0.85rem'}}
                    onChange={e=>e.target.files[0]&&uploadFile(e.target.files[0])} />
                </Field>
                {uploadMsg && <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.8rem',color:uploadMsg.includes('failed')||uploadMsg.includes('Please')?'#e57373':C.gold}}>{uploadMsg}</div>}
                {uploading && <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.8rem',color:C.muted,letterSpacing:'0.1em'}}>UPLOADING...</div>}
              </div>
            )}

            {loading && <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.85rem',color:C.muted,textAlign:'center',padding:40}}>Loading...</div>}
            {!loading && pieces.length===0 && !showUpload && (
              <div style={{textAlign:'center',padding:60,color:C.muted,fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:'1.1rem'}}>No pieces yet — add one above</div>
            )}
            {pieces.map(p=>(
              <div key={p.id} onClick={()=>openPiece(p)}
                style={{padding:'16px 14px',borderBottom:`1px solid ${C.bord}`,cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.15rem',letterSpacing:'0.08em',color:C.cream}}>{p.title||'Untitled'}</div>
                <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.8rem',color:C.muted,marginTop:4}}>{[p.composer,p.instrument,p.file_type?.toUpperCase()].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </>
        )}

        {tab==='exercises' && (
          <>
            {loading && <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.85rem',color:C.muted,textAlign:'center',padding:40}}>Loading...</div>}
            {!loading && exercises.length===0 && (
              <div style={{textAlign:'center',padding:60,color:C.muted,fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:'1.1rem'}}>No saved exercises yet</div>
            )}
            {exercises.map(ex=>(
              <div key={ex.id} onClick={()=>onLoadExercise(ex)}
                style={{padding:'16px 14px',borderBottom:`1px solid ${C.bord}`,cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.05rem',letterSpacing:'0.08em',color:C.cream}}>{ex.doc_name||'Untitled'}</div>
                <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.8rem',color:C.muted,marginTop:4}}>
                  {[ex.composer,ex.instrument,ex.grouping,ex.key].filter(Boolean).join(' · ')}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SCORE VIEW — home base for a repertoire item
═══════════════════════════════════════════════════════════════════════ */
function ScoreViewScreen({ piece, pageImages, currentPage, setCurrentPage,
  sessionMode, setSessionMode, onBack, onTapPassage }) {

  const land = useOrientation();
  const totalPages = pageImages.length;
  const showTwo = land && totalPages > 1;
  const rightPage = currentPage + 1 < totalPages ? currentPage + 1 : null;

  const handleTap = e => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    const page = img.dataset.page ? parseInt(img.dataset.page) : currentPage;
    onTapPassage({ page, x, y });
  };

  const modeBtn = (mode, label) => (
    <button onClick={()=>setSessionMode(mode)} style={{
      fontFamily:"'Bebas Neue',sans-serif", fontSize:'0.9rem',
      letterSpacing:'0.1em', padding:'7px 18px',
      background: sessionMode===mode ? C.accent : '#2a231d',
      color: sessionMode===mode ? 'white' : C.muted,
      border: `1px solid ${sessionMode===mode ? C.accent : C.bord}`,
      cursor:'pointer',
    }}>{label}</button>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <TopBar
        left={<BackBtn onClick={onBack} />}
        center={piece?.title||'SCORE'}
        right={
          <div style={{display:'flex',gap:4}}>
            {modeBtn('massed','MASSED')}
            {modeBtn('interleaved','INTERLEAVED')}
          </div>
        }
      />

      {/* Instruction */}
      <div style={{padding:'6px 16px',flexShrink:0,borderBottom:`1px solid ${C.bord}`,
        display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
          fontSize:16,color:C.cream}}>
          Tap a passage to begin working
        </div>
        {!showTwo && totalPages>1 && (
          <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
            <Btn onClick={()=>setCurrentPage(p=>Math.max(0,p-1))}
              disabled={currentPage===0} style={{padding:'4px 12px',fontSize:'0.8rem'}}>← PAGE</Btn>
            <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.8rem',color:C.cream}}>
              {currentPage+1}/{totalPages}
            </span>
            <Btn onClick={()=>setCurrentPage(p=>Math.min(totalPages-1,p+1))}
              disabled={currentPage===totalPages-1} style={{padding:'4px 12px',fontSize:'0.8rem'}}>PAGE →</Btn>
          </div>
        )}
      </div>

      {/* Score */}
      <div style={{flex:'1 1 0',minHeight:0,background:'#0a0805',display:'flex'}}>
        <div style={{position:'relative',flex:1,minWidth:0,overflow:'hidden'}}>
          <img data-page={currentPage} src={pageImages[currentPage]}
            onClick={handleTap}
            style={{width:'100%',height:'100%',objectFit:'contain',display:'block',
              userSelect:'none',WebkitUserSelect:'none',cursor:'crosshair'}}
            onContextMenu={e=>e.preventDefault()}
            draggable={false} />
        </div>
        {showTwo && rightPage!==null && (
          <div style={{position:'relative',flex:1,minWidth:0,
            borderLeft:`1px solid ${C.bord}`,overflow:'hidden'}}>
            <img data-page={rightPage} src={pageImages[rightPage]}
              onClick={handleTap}
              style={{width:'100%',height:'100%',objectFit:'contain',display:'block',
                userSelect:'none',WebkitUserSelect:'none',cursor:'crosshair'}}
              onContextMenu={e=>e.preventDefault()}
              draggable={false} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STRATEGY MENU — appears after tapping a passage
═══════════════════════════════════════════════════════════════════════ */
function StrategyMenuScreen({ piece, tapPos, sessionMode, onICU, onMUR, onBack }) {
  const cardStyle = (color) => ({
    display:'flex', flexDirection:'column', gap:10,
    padding:'28px 24px', border:`2px solid ${color}`,
    cursor:'pointer', transition:'background 0.15s', background:'transparent',
    textAlign:'left', width:'100%',
  });

  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <TopBar left={<BackBtn onClick={onBack} />} center="CHOOSE STRATEGY" right={null} />

      <div style={{flex:'1 1 0',display:'flex',flexDirection:'column',
        justifyContent:'center',gap:16,padding:'24px 20px',
        maxWidth:520,margin:'0 auto',width:'100%'}}>

        <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
          fontSize:'1rem',color:C.muted,marginBottom:4,textAlign:'center'}}>
          {sessionMode==='interleaved'
            ? 'Interleaved session — this passage will be one of several'
            : 'Massed session — focused work on this passage'}
        </div>

        <button style={cardStyle(C.accent)} onClick={onICU}
          onMouseEnter={e=>e.currentTarget.style.background=C.panel}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem',
            letterSpacing:'0.12em',color:C.accent}}>
            INTERLEAVED CLICK-UP
          </div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',
            color:C.cream,lineHeight:1.5}}>
            Build speed gradually by adding one unit at a time, cycling through
            tempo increments until you reach your goal.
          </div>
        </button>

        <button style={cardStyle(C.gold)} onClick={onMUR}
          onMouseEnter={e=>e.currentTarget.style.background=C.panel}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem',
            letterSpacing:'0.12em',color:C.gold}}>
            RHYTHMIC VARIATION
          </div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',
            color:C.cream,lineHeight:1.5}}>
            Enter the pitches of your passage and practice them written out
            in every rhythm pattern — a complete systematic workout.
          </div>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STRATEGY PICKER (legacy — kept for reference, not used in new flow)
═══════════════════════════════════════════════════════════════════════ */
function StrategyScreen({ piece, onICU, onMUR, onBack }) {
  const cardStyle = (color) => ({
    display:'flex',flexDirection:'column',gap:10,
    padding:'28px 24px',border:`2px solid ${color}`,
    cursor:'pointer',transition:'background 0.15s',background:'transparent',
    textAlign:'left',width:'100%',
  });

  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <TopBar left={<BackBtn onClick={onBack} />} center={piece?.title||'CHOOSE STRATEGY'} right={null} />

      <div style={{flex:'1 1 0',display:'flex',flexDirection:'column',justifyContent:'center',gap:16,padding:'24px 20px',maxWidth:480,margin:'0 auto',width:'100%'}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:'1rem',color:C.muted,marginBottom:8,textAlign:'center'}}>
          Choose a practice strategy for this passage
        </div>

        <button style={cardStyle(C.accent)} onClick={onICU}
          onMouseEnter={e=>e.currentTarget.style.background=C.panel}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',letterSpacing:'0.12em',color:C.accent}}>
            INTERLEAVED CLICK-UP
          </div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',color:C.cream,lineHeight:1.5}}>
            Build speed gradually by adding one unit at a time, cycling through tempo increments until you reach your goal.
          </div>
        </button>

        <button style={cardStyle(C.gold)} onClick={onMUR}
          onMouseEnter={e=>e.currentTarget.style.background=C.panel}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',letterSpacing:'0.12em',color:C.gold}}>
            RHYTHMIC VARIATION
          </div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',color:C.cream,lineHeight:1.5}}>
            Enter the pitches of your passage and practice them written out in every rhythm pattern — a complete systematic workout.
          </div>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   RESPELL POPUP  (matching original MUR design)
═══════════════════════════════════════════════════════════════════════ */

const ENARMAP = {
  'C':['C','B#','Dbb'],'B#':['B#','C'],'Dbb':['Dbb','C'],
  'C#':['C#','Db'],'Db':['Db','C#'],
  'D':['D','C##','Ebb'],'C##':['C##','D'],'Ebb':['Ebb','D'],
  'D#':['D#','Eb'],'Eb':['Eb','D#'],
  'E':['E','Fb'],'Fb':['Fb','E'],'D##':['D##','E'],
  'F':['F','E#'],'E#':['E#','F'],
  'F#':['F#','Gb'],'Gb':['Gb','F#'],'E##':['E##','F#'],
  'G':['G','F##','Abb'],'F##':['F##','G'],'Abb':['Abb','G'],
  'G#':['G#','Ab'],'Ab':['Ab','G#'],
  'A':['A','G##','Bbb'],'G##':['G##','A'],'Bbb':['Bbb','A'],
  'A#':['A#','Bb'],'Bb':['Bb','A#'],
  'B':['B','Cb','A##'],'Cb':['Cb','B'],'A##':['A##','B'],
};

function getEnharmonics(note) {
  const m = note?.match(/^([A-G])(##|bb|#|b|n)?(\d)$/);
  if (!m) return [note];
  const letter=m[1], rawAcc=m[2]||'', oct=m[3];
  const baseAcc = rawAcc==='n' ? '' : rawAcc;
  const options = ENARMAP[letter+baseAcc] || [letter+baseAcc];
  return options.map(s=>s+oct);
}

function RespellPopup({ note, anchorY, onClose, onDelete, onUpdate }) {
  const m = note?.match(/^([A-G])(##|bb|#|b|n)?(\d)$/);
  if (!m) return null;
  const letter=m[1], rawAcc=m[2]||'', oct=m[3];
  const baseAcc = rawAcc==='n' ? '' : rawAcc;
  const enharmonics = getEnharmonics(note);
  const [customVal, setCustomVal] = React.useState('');

  const handleCustomOk = () => {
    const v = customVal.trim().replace(/\s/g,'');
    if (!v) return;
    const m2 = v.match(/^([A-G])(##|bb|#|b|n)?(\d)$/i);
    if (m2) { onUpdate(m2[1].toUpperCase()+(m2[2]||'')+m2[3]); setCustomVal(''); }
  };

  const FORCE_ACCS = [
    {label:'○', acc:'',   title:'no accidental'},
    {label:'♮', acc:'n',  title:'natural (courtesy)'},
    {label:'♯', acc:'#',  title:'sharp'},
    {label:'♭', acc:'b',  title:'flat'},
    {label:'𝄪', acc:'##', title:'double sharp'},
    {label:'𝄫', acc:'bb', title:'double flat'},
  ];

  const popupH = 260;
  const top = anchorY > popupH + 80 ? anchorY - popupH - 10 : anchorY + 34;

  return (
    <>
      <div onClick={e=>{e.stopPropagation();onClose();}}
        style={{position:'fixed',inset:0,zIndex:299}} />
      <div onClick={e=>e.stopPropagation()}
        style={{
          position:'fixed',left:'50%',top,transform:'translateX(-50%)',
          zIndex:300,background:'#111009',border:`1px solid ${C.bord}`,
          width:300,boxShadow:'0 8px 40px rgba(0,0,0,0.85)',
        }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          padding:'8px 14px',borderBottom:`1px solid ${C.bord}`,background:'#0d0b09'}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.8rem',
            letterSpacing:'0.22em',color:C.rule}}>RESPELL</span>
          <button onClick={onClose} style={{background:'none',border:'none',
            color:C.muted,cursor:'pointer',fontSize:'1.1rem',lineHeight:1,padding:'0 2px'}}>×</button>
        </div>
        <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.bord}`}}>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {enharmonics.map(opt=>{
              const isCur = opt === letter+baseAcc+oct;
              return (
                <button key={opt} onClick={()=>onUpdate(opt)} style={{
                  padding:'7px 14px',
                  background:isCur?C.accent:'#2a231d',
                  border:`1px solid ${isCur?C.accent:C.bord}`,
                  color:isCur?'white':C.cream,
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',
                  letterSpacing:'0.06em',cursor:'pointer',
                  WebkitTapHighlightColor:'transparent',
                }}>{dn(opt)}</button>
              );
            })}
          </div>
        </div>
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.bord}`}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.58rem',
            letterSpacing:'0.2em',color:C.rule,marginBottom:5}}>TYPE ANY SPELLING</div>
          <div style={{display:'flex',gap:6}}>
            <input type="text" value={customVal}
              onChange={e=>setCustomVal(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleCustomOk()}
              placeholder="e.g. B#4, Fb3, Dbb4"
              style={{flex:1,background:'#0d0b09',border:`1px solid ${C.bord}`,
                color:C.cream,padding:'6px 8px',fontFamily:"'Inconsolata',monospace",
                fontSize:'0.78rem',outline:'none'}} />
            <button onClick={handleCustomOk} style={{
              background:C.accent,border:'none',color:'white',
              padding:'6px 14px',fontFamily:"'Bebas Neue',sans-serif",
              fontSize:'0.8rem',letterSpacing:'0.1em',cursor:'pointer',
              WebkitTapHighlightColor:'transparent'}}>OK</button>
          </div>
        </div>
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.bord}`}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.58rem',
            letterSpacing:'0.2em',color:C.rule,marginBottom:5}}>FORCE ACCIDENTAL</div>
          <div style={{display:'flex',gap:4}}>
            {FORCE_ACCS.map(opt=>{
              const active = rawAcc===opt.acc;
              return (
                <button key={opt.acc} onClick={()=>onUpdate(letter+opt.acc+oct)} title={opt.title}
                  style={{
                    flex:1,padding:'7px 4px',
                    background:active?C.accent:'#2a231d',
                    border:`1px solid ${active?C.accent:C.bord}`,
                    color:active?'white':C.cream,
                    fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',
                    cursor:'pointer',WebkitTapHighlightColor:'transparent',
                  }}>{opt.label}</button>
              );
            })}
          </div>
        </div>
        <div style={{padding:'10px 14px'}}>
          <button onClick={onDelete} style={{
            width:'100%',padding:'8px',background:'none',
            border:`1px solid #444`,color:'#e57373',
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.78rem',
            letterSpacing:'0.12em',cursor:'pointer',
            WebkitTapHighlightColor:'transparent'}}>
            DELETE THIS NOTE
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MUR SCREEN
═══════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════
   MUR SCREEN  — Rhythmic Variation (wizard-style, matching original)
═══════════════════════════════════════════════════════════════════════ */
function MURScreen({ piece, pageImages, profile, savedExercise, tapPos, onBack }) {
  const land    = useOrientation();
  const isLarge = useIsLarge();

  // ── State ─────────────────────────────────────────────────────────────
  const [activeGroup,    setActiveGroup]    = useState(null);
  const [instrSelected,  setInstrSelected]  = useState(false);
  const [instrTranspose, setInstrTranspose] = useState(0);
  const [clef,           setClef]           = useState('treble');
  const [selNotes,       setSelNotes]       = useState([]);
  const [accMode,        setAccMode]        = useState('sharp');
  const [inputTab,       setInputTab]       = useState('keys');
  const [insertAt,       setInsertAt]       = useState(-1);
  const [respellChip,    setRespellChip]    = useState(null); // {idx,y}
  const [docName,        setDocName]        = useState('');
  const [generated,      setGenerated]      = useState(false);
  const [exercises,      setExercises]      = useState([]);
  const [exIdx,          setExIdx]          = useState(0);
  const [playingIdx,     setPlayingIdx]     = useState(-1);
  const [saving,         setSaving]         = useState(false);
  const [saveMsg,        setSaveMsg]        = useState('');
  const [micActive,      setMicActive]      = useState(false);
  const [micStatus,      setMicStatus]      = useState('');
  const [currentPage,    setCurrentPage]    = useState(0);

  // Wizard visibility
  const showStep2 = !!activeGroup;
  const showStep3 = showStep2 && instrSelected;
  const showStep4 = showStep3 && selNotes.length > 0;

  // ── Refs ──────────────────────────────────────────────────────────────
  const acRef        = useRef(null);
  const pianoRef     = useRef(null);
  const [pianoMounted, setPianoMounted] = useState(false);
  const liveStaffRef = useRef(null);
  const exDivRef     = useRef(null);
  const micRef       = useRef({active:false,stream:null,ctx:null,analyser:null,timer:null});
  const playTimerRef = useRef(null);

  // ── Restore saved exercise ────────────────────────────────────────────
  useEffect(()=>{
    if (savedExercise) {
      const grp = parseInt(savedExercise.grouping?.match(/\d+/)?.[0]||'4');
      setActiveGroup(grp);
      setInstrSelected(true);
      setClef(savedExercise.clef || 'treble');
      setSelNotes(savedExercise.notes?.split(',').filter(Boolean) || []);
      setDocName(savedExercise.doc_name || '');
    }
  },[]);

  // ── Audio ─────────────────────────────────────────────────────────────
  function getAC() {
    if (!acRef.current) acRef.current = new (window.AudioContext||window.webkitAudioContext)();
    if (acRef.current.state==='suspended') acRef.current.resume();
    return acRef.current;
  }
  function playNote(n) {
    try {
      const ac=getAC();
      const f=440*Math.pow(2,(murMidi(n)+instrTranspose-69)/12);
      const o=ac.createOscillator(),g=ac.createGain();
      o.connect(g);g.connect(ac.destination);o.type='triangle';
      o.frequency.setValueAtTime(f,ac.currentTime);
      g.gain.setValueAtTime(0,ac.currentTime);
      g.gain.linearRampToValueAtTime(0.35,ac.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.75);
      o.start(ac.currentTime);o.stop(ac.currentTime+0.75);
    } catch(e){}
  }

  // ── Piano note list ───────────────────────────────────────────────────
  const PN = useRef(null);
  if (!PN.current) {
    const notes=[];
    notes.push({name:'A1',white:true},{name:'A#1',white:false},{name:'B1',white:true});
    ['2','3','4','5','6','7'].forEach(o=>{
      ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].forEach(p=>{
        notes.push({name:p+o,white:p.indexOf('#')===-1});
      });
    });
    notes.push({name:'C8',white:true});
    PN.current=notes;
  }

  // ── addNote / removeNote ──────────────────────────────────────────────
  const addNote = useCallback((raw) => {
    const FLAT_MAP={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};
    const base=raw.slice(0,-1);
    const spelled = accMode==='flat' && FLAT_MAP[base] ? FLAT_MAP[base]+raw.slice(-1) : raw;
    setSelNotes(prev=>{
      if (insertAt>=0) { const n=[...prev];n.splice(insertAt,0,spelled);return n; }
      return [...prev,spelled];
    });
    if (insertAt>=0) setInsertAt(i=>i+1);
    setGenerated(false);
  },[accMode,insertAt]);

  const removeNote = i => setSelNotes(prev=>prev.filter((_,j)=>j!==i));

  // ── Piano SVG ─────────────────────────────────────────────────────────
  useEffect(()=>{
    const svg=pianoRef.current;
    if (!svg) return;
    const pn=PN.current;
    const whites=pn.filter(n=>n.white);
    const VW=1008,VH=130,ww=VW/whites.length,bw=ww*0.58,bh=VH*0.62;
    svg.innerHTML='';
    function mkS(tag,attrs){
      const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
      Object.keys(attrs).forEach(k=>el.setAttribute(k,attrs[k]));
      return el;
    }
    whites.forEach((note,i)=>{
      const r=mkS('rect',{x:i*ww+0.5,y:0.5,width:ww-1,height:VH-1,rx:2,
        fill:'#fdfaf5',stroke:'#ccc','stroke-width':0.7,'data-note':note.name});
      svg.appendChild(r);
      if (note.name.charAt(0)==='C' && note.name.indexOf('#')===-1) {
        if (note.name==='C4') {
          svg.appendChild(mkS('circle',{cx:i*ww+ww/2,cy:VH-16,r:3,fill:'#8b3a1a','pointer-events':'none'}));
        }
        const t=mkS('text',{x:i*ww+ww/2,y:VH-5,'text-anchor':'middle',
          'font-size':note.name==='C4'?8:6,
          fill:note.name==='C4'?'#8b3a1a':'#bbb',
          'font-family':'Inconsolata,monospace','pointer-events':'none'});
        t.textContent=note.name; svg.appendChild(t);
      }
    });
    const FLAT_NAMES={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};
    let wi=0;
    pn.forEach(note=>{
      if (note.white){wi++;return;}
      const bx=(wi-1)*ww+ww-bw/2+ww*0.07;
      svg.appendChild(mkS('rect',{x:bx,y:0,width:bw,height:bh,rx:2,
        fill:'#1a1612',stroke:'#111','stroke-width':0.5,'data-note':note.name}));
      const baseName=note.name.slice(0,-1);
      const spelled=accMode==='flat'?(FLAT_NAMES[baseName]||baseName):baseName;
      const label=spelled.replace('#','♯').replace(/([A-G])b/,'$1♭');
      const lbl=mkS('text',{x:bx+bw/2,y:bh*0.62,
        'text-anchor':'middle','dominant-baseline':'middle',
        'font-size':5.8,'font-weight':'bold',
        fill:'#c8b89a','font-family':'Inconsolata,monospace',
        'pointer-events':'none'});
      lbl.textContent=label;
      svg.appendChild(lbl);
    });

    const handlePress = e => {
      e.preventDefault();
      const pt=e.changedTouches?{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY}:{x:e.clientX,y:e.clientY};
      let k=document.elementFromPoint(pt.x,pt.y);
      while(k&&k!==svg){if(k.getAttribute&&k.getAttribute('data-note'))break;k=k.parentNode;}
      if(!k||!k.getAttribute||!k.getAttribute('data-note')) return;
      const raw=k.getAttribute('data-note'); const isBlack=raw.indexOf('#')!==-1;
      k.setAttribute('fill','#c8601a');
      setTimeout(()=>k.setAttribute('fill',isBlack?'#1a1612':'#fdfaf5'),160);
      playNote(raw);
      if (!activeGroup) return;
      addNote(raw);
    };

    svg.addEventListener('click',handlePress);
    let _tx=0,_tswiped=false,_ttimer=null;
    svg.addEventListener('touchstart',e=>{_tx=e.touches[0].clientX;_tswiped=false;
      _ttimer=setTimeout(()=>{if(!_tswiped)handlePress(e);_ttimer=null;},150);
      e.preventDefault();},{passive:false});
    svg.addEventListener('touchmove',e=>{if(Math.abs(e.touches[0].clientX-_tx)>8){
      _tswiped=true;if(_ttimer){clearTimeout(_ttimer);_ttimer=null;}}},{passive:true});
    svg.addEventListener('touchend',e=>{if(_ttimer){clearTimeout(_ttimer);_ttimer=null;
      if(!_tswiped)handlePress(e);}},{passive:true});
  },[activeGroup,addNote,pianoMounted,accMode]);

  // ── Live staff preview ────────────────────────────────────────────────
  useEffect(()=>{
    const ABCJS=window.ABCJS; const div=liveStaffRef.current;
    if(!ABCJS||!div) return;
    if(!selNotes.length){div.innerHTML='';return;}
    const abcClef=clef==='bass'?' clef=bass':clef==='alto'?' clef=alto':clef==='tenor'?' clef=tenor':'';
    const noteAbc=selNotes.map(n=>{
      const m=n.match(/^([A-G])(##|bb|#|b|n)?(\d)$/);if(!m)return 'C8';
      const pc=m[1],acc=m[2]||'',oct=parseInt(m[3]);
      const prefix=acc==='##'?'^^':acc==='bb'?'__':acc==='#'?'^':acc==='b'?'_':acc==='n'?'=':'';
      const letter=oct<=4?pc:pc.toLowerCase();
      const octMod=oct===3?',':(oct===2?',,':(oct===1?',,,':(oct===6?"'":(oct===7?"''":''))))
      return prefix+letter+octMod+'8';
    }).join(' ');
    const abc=`X:1\nM:4/4\nL:1/32\nK:C${abcClef}\n|${noteAbc}|`;
    try {
      ABCJS.renderAbc(div,abc,{
        scale:1.0,staffwidth:Math.min((div.offsetWidth||400)-20,680),
        paddingright:10,paddingleft:10,paddingbottom:8,paddingtop:8,add_classes:true,
      });
      div.querySelectorAll('svg path,svg rect,svg ellipse,svg line,svg text').forEach(el=>{
        el.style.fill='#1a1208';el.style.stroke='#1a1208';
      });
    } catch(e){}
  },[selNotes,clef]);

  // ── Exercise rendering (small screen) ─────────────────────────────────
  useEffect(()=>{
    if(!generated||!exercises.length) return;
    const ABCJS=window.ABCJS; if(!ABCJS) return;
    const ex=exercises[exIdx]; if(!ex) return;
    const div=exDivRef.current; if(!div) return;
    div.innerHTML='';
    const abc=buildAbcString(ex.pat,selNotes,clef,'C');
    try {
      ABCJS.renderAbc(div,abc,{
        scale:1.1,staffwidth:Math.min(div.offsetWidth-20,860),
        paddingright:20,paddingleft:10,paddingbottom:10,paddingtop:10,
        add_classes:true,
        wrap:{minSpacing:1.2,maxSpacing:2.8,preferredMeasuresPerLine:land?4:2}
      });
      div.querySelectorAll('svg path,svg rect,svg ellipse,svg line,svg text').forEach(el=>{
        el.style.fill='#1a1208';el.style.stroke='#1a1208';
      });
    } catch(e){}
  },[generated,exIdx,exercises,clef,selNotes,land]);

  // ── Generate ──────────────────────────────────────────────────────────
  const generate = () => {
    if(!activeGroup||!selNotes.length) return;
    const sec=g2s(activeGroup);
    setExercises(MUR_DB.filter(p=>p.section===sec).map(p=>({pat:p})));
    setExIdx(0); setGenerated(true);
    try {
      const prof=JSON.parse(localStorage.getItem('murProfile')||'{}');
      if(prof.email) sbPost('/rest/v1/practice_log',{
        user_email:prof.email,piece_id:piece?.id||null,strategy:'RV',
        grouping:g2s(activeGroup),n_notes:selNotes.length,
      }).catch(()=>{});
    } catch(e){}
  };

  const saveExercise = async () => {
    if(!selNotes.length||!activeGroup) return;
    setSaving(true);setSaveMsg('Saving...');
    try {
      await sbPost('/rest/v1/exercises',{
        user_email:profile.email,doc_name:docName.trim()||null,
        grouping:g2s(activeGroup),clef,key:'C',notes:selNotes.join(','),
        instrument:profile.instrument||'',
      });
      setSaveMsg('Saved!');setTimeout(()=>setSaveMsg(''),2000);
    } catch { setSaveMsg('Save failed.'); }
    setSaving(false);
  };

  // ── Playback ──────────────────────────────────────────────────────────
  const playPassage = () => {
    if(!selNotes.length) return;
    selNotes.forEach((n,i)=>setTimeout(()=>playNote(n),i*520));
  };

  const stopPlayback = () => {
    if(playTimerRef.current){clearTimeout(playTimerRef.current);playTimerRef.current=null;}
    setPlayingIdx(-1);
  };

  const playExerciseAt = (idx) => {
    if(playingIdx===idx){stopPlayback();return;}
    stopPlayback();
    if(!exercises.length) return;
    const DUR_BEATS={'w':4,'h.':3,'h':2,'q.':1.5,'q':1,'8.':0.75,'8':0.5,'16.':0.375,'16':0.25,'32':0.125};
    const pat=exercises[idx].pat;const bpm=80;const spb=60/bpm;
    const ppr=pat.notes.filter(c=>c.slice(-1)!=='r').length;
    const reps=Math.min(ppr>0?Math.ceil(selNotes.length/ppr):1,32);
    let pi=0,t=0;const ac=getAC();const scheduled=[];
    for(let rep=0;rep<reps;rep++){
      let done=false;
      pat.notes.forEach(code=>{
        if(done)return;
        const isRest=code.slice(-1)==='r',isTup=code.indexOf('t')!==-1&&!isRest;
        const base=code.replace('.','').replace('r','').replace('t','');
        const dotted=code.indexOf('.')!==-1;
        const beats=(DUR_BEATS[base+(dotted?'.':'')]||DUR_BEATS[base]||0.5)*(isTup?2/3:1);
        if(!isRest){if(pi<selNotes.length){scheduled.push({time:t,note:selNotes[pi]});pi++;}else{done=true;return;}}
        t+=beats*spb;
      });
      if(pi>=selNotes.length) break;
    }
    setPlayingIdx(idx);
    scheduled.forEach(({time,note})=>{
      const st=ac.currentTime+time;
      const f=440*Math.pow(2,(murMidi(note)+instrTranspose-69)/12);
      const o=ac.createOscillator(),g=ac.createGain();
      o.connect(g);g.connect(ac.destination);o.type='triangle';
      o.frequency.setValueAtTime(f,st);
      g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.3,st+0.01);
      g.gain.exponentialRampToValueAtTime(0.001,st+0.45);
      o.start(st);o.stop(st+0.5);
    });
    playTimerRef.current=setTimeout(()=>setPlayingIdx(-1),(t+0.2)*1000);
  };

  // ── Mic ───────────────────────────────────────────────────────────────
  const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  function autoCorr(buf,sr){
    const SIZE=buf.length;let rms=0;
    for(let i=0;i<SIZE;i++)rms+=buf[i]*buf[i];
    rms=Math.sqrt(rms/SIZE);
    if(rms<0.008)return{freq:-1,rms};
    let r1=0,r2=SIZE-1;
    for(let i=0;i<SIZE/2;i++){if(Math.abs(buf[i])<0.2){r1=i;break;}}
    for(let i=1;i<SIZE/2;i++){if(Math.abs(buf[SIZE-i])<0.2){r2=SIZE-i;break;}}
    const b2=buf.slice(r1,r2),SZ=b2.length;
    const c=new Float32Array(SZ);
    for(let i=0;i<SZ;i++)for(let j=0;j<SZ-i;j++)c[i]+=b2[j]*b2[j+i];
    let d=0;while(c[d]>c[d+1])d++;
    let mx=-1,mp=-1;
    for(let i=d;i<SZ;i++){if(c[i]>mx){mx=c[i];mp=i;}}
    if(mp<2||mp>=SZ-1)return{freq:-1,rms};
    const x1=c[mp-1],x2=c[mp],x3=c[mp+1];
    const a=(x1+x3-2*x2)/2,bv=(x3-x1)/2;
    const T=a?mp-bv/(2*a):mp;
    return{freq:sr/T,rms};
  }
  function freqToNote(freq){
    if(!freq||freq<80||freq>4200)return null;
    const m=Math.round(12*Math.log2(freq/440)+69);
    if(m<45||m>108)return null;
    return NOTE_NAMES[m%12]+(Math.floor(m/12)-1);
  }
  const toggleMic = async () => {
    const mic=micRef.current;
    if(mic.active){
      mic.active=false;
      if(mic.timer)clearTimeout(mic.timer);
      if(mic.stream)mic.stream.getTracks().forEach(t=>t.stop());
      if(mic.ctx)mic.ctx.close();
      mic.stream=mic.ctx=mic.analyser=null;
      setMicActive(false);setMicStatus('');return;
    }
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      mic.stream=stream;
      mic.ctx=new(window.AudioContext||window.webkitAudioContext)();
      if(mic.ctx.state==='suspended')await mic.ctx.resume();
      mic.analyser=mic.ctx.createAnalyser();mic.analyser.fftSize=2048;
      mic.ctx.createMediaStreamSource(stream).connect(mic.analyser);
      mic.active=true;setMicActive(true);setMicStatus('Listening...');
      let noteActive=false,stableCount=0,lastFreq=0,lockout=0,lastSound=0;
      const detect=()=>{
        if(!mic.active)return;
        const buf=new Float32Array(mic.analyser.fftSize);
        mic.analyser.getFloatTimeDomainData(buf);
        const {freq,rms}=autoCorr(buf,mic.ctx.sampleRate);
        const now=Date.now();
        if(rms>0.005)lastSound=now;
        if(lastSound>0&&now-lastSound>3000){mic.active=false;setMicActive(false);setMicStatus('');return;}
        if(now<lockout){mic.timer=setTimeout(detect,25);return;}
        const note=freq>0?freqToNote(freq):null;
        if(rms<0.008){noteActive=false;stableCount=0;lastFreq=0;}
        else if(note){
          if(!noteActive){noteActive=true;stableCount=1;lastFreq=freq;}
          else{
            const prev=lastFreq>0?freqToNote(lastFreq):null;
            if(note===prev||Math.abs(freq-lastFreq)/lastFreq<0.10){
              lastFreq=(lastFreq+freq)/2;stableCount++;
              setMicStatus(note+' '+stableCount+'/2');
              if(stableCount>=2){
                const FLAT_MAP={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};
                const base=note.slice(0,-1);
                const written=accMode==='flat'&&FLAT_MAP[base]?(FLAT_MAP[base]+note.slice(-1)):note;
                addNote(written);setMicStatus(written);
                lockout=now+600;noteActive=false;stableCount=0;lastFreq=0;
              }
            } else {stableCount=1;lastFreq=freq;}
          }
        }
        mic.timer=setTimeout(detect,25);
      };
      detect();
    } catch(e){setMicStatus('Mic error: '+(e.name||e.message));}
  };
  useEffect(()=>()=>{
    const mic=micRef.current;
    if(mic.active){mic.active=false;if(mic.timer)clearTimeout(mic.timer);
      if(mic.stream)mic.stream.getTracks().forEach(t=>t.stop());
      if(mic.ctx)mic.ctx.close();}
  },[]);

  // ── Group button SVGs ─────────────────────────────────────────────────
  const GRP_SVGS = {
    3: <svg viewBox="0 0 52 36" width="42" height="28"><line x1="11" y1="7" x2="39" y2="7" stroke="#f5f0e8" strokeWidth="2.5"/><line x1="11" y1="7" x2="11" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="6" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,6,30)"/><line x1="25" y1="7" x2="25" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="20" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,20,30)"/><line x1="39" y1="7" x2="39" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="34" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,34,30)"/></svg>,
    4: <svg viewBox="0 0 54 36" width="42" height="28"><line x1="10" y1="7" x2="49" y2="7" stroke="#f5f0e8" strokeWidth="2.5"/><line x1="10" y1="12" x2="49" y2="12" stroke="#f5f0e8" strokeWidth="2.5"/><line x1="10" y1="7" x2="10" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="5" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,5,30)"/><line x1="23" y1="7" x2="23" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="18" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,18,30)"/><line x1="36" y1="7" x2="36" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="31" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,31,30)"/><line x1="49" y1="7" x2="49" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="44" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,44,30)"/></svg>,
    5: <svg viewBox="0 0 68 44" width="50" height="34"><text x="35" y="6" textAnchor="middle" fontSize="8" fill="#f5f0e8" fontFamily="serif" fontWeight="bold">5</text><line x1="4" y1="9" x2="4" y2="13" stroke="#f5f0e8" strokeWidth="1.5"/><line x1="4" y1="11" x2="66" y2="11" stroke="#f5f0e8" strokeWidth="1.5"/><line x1="66" y1="9" x2="66" y2="13" stroke="#f5f0e8" strokeWidth="1.5"/><line x1="10" y1="17" x2="62" y2="17" stroke="#f5f0e8" strokeWidth="2.5"/><line x1="10" y1="17" x2="10" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="5" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,5,37)"/><line x1="23" y1="17" x2="23" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="18" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,18,37)"/><line x1="36" y1="17" x2="36" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="31" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,31,37)"/><line x1="49" y1="17" x2="49" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="44" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,44,37)"/><line x1="62" y1="17" x2="62" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="57" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,57,37)"/></svg>,
    6: <svg viewBox="0 0 74 36" width="56" height="28"><line x1="10" y1="7" x2="34" y2="7" stroke="#f5f0e8" strokeWidth="2.5"/><line x1="46" y1="7" x2="70" y2="7" stroke="#f5f0e8" strokeWidth="2.5"/><line x1="10" y1="7" x2="10" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="5" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,5,30)"/><line x1="22" y1="7" x2="22" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="17" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,17,30)"/><line x1="34" y1="7" x2="34" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="29" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,29,30)"/><line x1="46" y1="7" x2="46" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="41" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,41,30)"/><line x1="58" y1="7" x2="58" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="53" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,53,30)"/><line x1="70" y1="7" x2="70" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="65" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,65,30)"/></svg>,
    7: <svg viewBox="0 0 80 44" width="60" height="34"><text x="40" y="6" textAnchor="middle" fontSize="8" fill="#f5f0e8" fontFamily="serif" fontWeight="bold">7</text><line x1="3" y1="9" x2="3" y2="13" stroke="#f5f0e8" strokeWidth="1.5"/><line x1="3" y1="11" x2="77" y2="11" stroke="#f5f0e8" strokeWidth="1.5"/><line x1="77" y1="9" x2="77" y2="13" stroke="#f5f0e8" strokeWidth="1.5"/><line x1="9" y1="17" x2="75" y2="17" stroke="#f5f0e8" strokeWidth="2.5"/><line x1="9" y1="22" x2="75" y2="22" stroke="#f5f0e8" strokeWidth="2.5"/><line x1="9" y1="17" x2="9" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="4" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,4,37)"/><line x1="20" y1="17" x2="20" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="15" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,15,37)"/><line x1="31" y1="17" x2="31" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="26" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,26,37)"/><line x1="42" y1="17" x2="42" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="37" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,37,37)"/><line x1="53" y1="17" x2="53" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="48" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,48,37)"/><line x1="64" y1="17" x2="64" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="59" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,59,37)"/><line x1="75" y1="17" x2="75" y2="35" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="70" cy="37" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,70,37)"/></svg>,
    8: <svg viewBox="0 0 90 36" width="68" height="28"><line x1="9" y1="7" x2="86" y2="7" stroke="#f5f0e8" strokeWidth="2.5"/><line x1="9" y1="12" x2="86" y2="12" stroke="#f5f0e8" strokeWidth="2.5"/><line x1="9" y1="7" x2="9" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="4" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,4,30)"/><line x1="20" y1="7" x2="20" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="15" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,15,30)"/><line x1="31" y1="7" x2="31" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="26" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,26,30)"/><line x1="42" y1="7" x2="42" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="37" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,37,30)"/><line x1="53" y1="7" x2="53" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="48" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,48,30)"/><line x1="64" y1="7" x2="64" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="59" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,59,30)"/><line x1="75" y1="7" x2="75" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="70" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,70,30)"/><line x1="86" y1="7" x2="86" y2="28" stroke="#f5f0e8" strokeWidth="1.8"/><ellipse cx="81" cy="30" rx="5.5" ry="3.5" fill="#f5f0e8" transform="rotate(-20,81,30)"/></svg>,
  };

  // ── Section header helper ─────────────────────────────────────────────
  const SH = ({title,right}) => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'10px 28px',borderBottom:`1px solid ${C.bord}`,flexShrink:0,
      background:'#0e0c09'}}>
      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.78rem',
        letterSpacing:'0.25em',color:C.cream}}>{title}</span>
      {right}
    </div>
  );

  // ── Chip insert button ────────────────────────────────────────────────
  const InsBtn = ({idx}) => (
    <button onClick={()=>setInsertAt(insertAt===idx?-1:idx)} style={{
      width:18,height:18,borderRadius:'50%',flexShrink:0,
      border:`1px solid ${insertAt===idx?C.accent:C.bord}`,
      background:insertAt===idx?C.accent:'none',
      color:insertAt===idx?'white':C.rule,
      cursor:'pointer',padding:0,fontSize:'0.7rem',lineHeight:1,
      WebkitTapHighlightColor:'transparent',
    }}>+</button>
  );

  const patternCount = MUR_DB.filter(p=>p.section===g2s(activeGroup)).length;

  // ── Large-screen all-exercises view ───────────────────────────────────
  const AllExView = generated && exercises.length>0 && isLarge && (
    <AllExercisesView
      exercises={exercises} selNotes={selNotes} clef={clef} murKey="C"
      playingIdx={playingIdx} onPlay={playExerciseAt} land={land}
    />
  );

  // ── Small-screen single exercise ──────────────────────────────────────
  const SmallExView = generated && exercises.length>0 && !isLarge && (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'6px 14px',flexShrink:0,background:C.ink,borderTop:`1px solid ${C.bord}`}}>
        <button onClick={()=>setExIdx(i=>Math.max(0,i-1))} disabled={exIdx===0}
          style={{background:'none',border:`1px solid ${C.bord}`,color:C.cream,
            width:36,height:36,cursor:'pointer',fontSize:'1rem',opacity:exIdx===0?0.35:1}}>←</button>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',color:C.muted}}>
            {exIdx+1} / {exercises.length}
          </span>
          <button onClick={()=>playExerciseAt(exIdx)}
            style={{background:playingIdx===exIdx?C.accent:'none',
              border:`1px solid ${playingIdx===exIdx?C.accent:C.bord}`,
              color:'white',width:30,height:30,borderRadius:'50%',cursor:'pointer',fontSize:'0.75rem'}}>
            {playingIdx===exIdx?'⏸':'▶'}
          </button>
        </div>
        <button onClick={()=>setExIdx(i=>Math.min(exercises.length-1,i+1))}
          disabled={exIdx===exercises.length-1}
          style={{background:'none',border:`1px solid ${C.bord}`,color:C.cream,
            width:36,height:36,cursor:'pointer',fontSize:'1rem',
            opacity:exIdx===exercises.length-1?0.35:1}}>→</button>
      </div>
      <div ref={exDivRef} style={{background:'white',flex:'1 1 0',overflowY:'auto',padding:'8px 12px'}} />
    </div>
  );

  // ── Controls panel (scrollable) ───────────────────────────────────────
  const ControlsPanel = (
    <div style={{flex:'1 1 0',minHeight:0,overflowY:'auto',background:C.ink}}
      onClick={()=>setRespellChip(null)}>

      {/* STEP 1: Note Grouping */}
      <SH title="NOTE GROUPING OF PASSAGE" />
      <div style={{padding:'12px 28px 16px',borderBottom:`1px solid ${C.bord}`}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {[3,4,5,6,7,8].map(n=>(
            <button key={n} onClick={()=>{setActiveGroup(n);setGenerated(false);}} style={{
              minWidth:56,height:72,border:`2px solid ${activeGroup===n?C.accent:'#2a231d'}`,
              background:activeGroup===n?C.accent:'transparent',
              cursor:'pointer',display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'flex-end',padding:'4px 4px 6px',gap:2,
              WebkitTapHighlightColor:'transparent',transition:'all 0.12s',
            }}>
              {GRP_SVGS[n]}
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,
                color:activeGroup===n?'white':C.accent,letterSpacing:'0.05em'}}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 2: Instrument Setup */}
      {showStep2 && (
        <>
          <SH title="INSTRUMENT SETUP" />
          <div style={{padding:'12px 28px 16px',borderBottom:`1px solid ${C.bord}`,
            display:'flex',gap:20,flexWrap:'wrap',alignItems:'flex-end'}}>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.6rem',
                letterSpacing:'0.22em',color:C.muted}}>CLEF</div>
              <div style={{position:'relative'}}>
                <select value={clef} onChange={e=>setClef(e.target.value)}
                  style={{minWidth:90,appearance:'none',WebkitAppearance:'none',
                    background:'#1a1410',border:`1px solid ${C.bord}`,color:C.cream,
                    padding:'7px 26px 7px 10px',fontFamily:"'Cormorant Garamond',serif",fontSize:'0.9rem',cursor:'pointer'}}>
                  <option value="treble">Treble</option>
                  <option value="bass">Bass</option>
                  <option value="alto">Alto</option>
                  <option value="tenor">Tenor</option>
                </select>
                <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                  color:C.muted,pointerEvents:'none',fontSize:'0.65rem'}}>▾</span>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:160}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.6rem',
                letterSpacing:'0.22em',color:C.muted}}>INSTRUMENT</div>
              <div style={{position:'relative'}}>
                <select value={instrTranspose}
                  onChange={e=>{setInstrTranspose(parseInt(e.target.value));setInstrSelected(true);}}
                  style={{width:'100%',appearance:'none',WebkitAppearance:'none',
                    background:'#1a1410',border:`1px solid ${C.bord}`,color:C.cream,
                    padding:'7px 26px 7px 10px',fontFamily:"'Cormorant Garamond',serif",fontSize:'0.9rem',cursor:'pointer'}}>
                  <option value="" disabled={instrSelected}>Select instrument...</option>
                  <option value="0">Flute</option><option value="0">Oboe</option>
                  <option value="-2">B♭ Clarinet</option><option value="-3">A Clarinet</option>
                  <option value="0">Bassoon</option><option value="3">E♭ Alto Sax</option>
                  <option value="-2">Tenor Sax</option><option value="-7">E♭ Bari Sax</option>
                  <option value="-5">Horn in F</option><option value="-2">B♭ Trumpet</option>
                  <option value="0">Trombone</option><option value="0">Violin</option>
                  <option value="0">Viola</option><option value="0">Cello</option>
                  <option value="0">Piano</option><option value="0">Other (Concert Pitch)</option>
                </select>
                <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                  color:C.muted,pointerEvents:'none',fontSize:'0.65rem'}}>▾</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* STEP 3: Enter Your Passage */}
      {showStep3 && (
        <>
          <SH title="ENTER YOUR PASSAGE" right={
            <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.55rem',
                letterSpacing:'0.18em',color:C.muted}}>NOTE ENTRY METHOD</span>
              {['keys','mic'].map(t=>(
                <button key={t} onClick={()=>setInputTab(t)} style={{
                  padding:'4px 12px',
                  background:inputTab===t?C.accent:'none',
                  border:`1px solid ${inputTab===t?C.accent:'rgba(245,240,232,0.25)'}`,
                  color:inputTab===t?'white':'rgba(245,240,232,0.7)',
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.68rem',
                  letterSpacing:'0.1em',cursor:'pointer',borderRadius:2,
                  WebkitTapHighlightColor:'transparent',
                }}>
                  {t==='keys'?'🎹 KEYBOARD':'● RECORD'}
                </button>
              ))}
              <button onClick={()=>setAccMode(m=>m==='sharp'?'flat':'sharp')} style={{
                padding:'4px 10px',
                background:'none',border:`1px solid rgba(245,240,232,0.25)`,
                color:'rgba(245,240,232,0.7)',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.68rem',
                letterSpacing:'0.1em',cursor:'pointer',borderRadius:2,
                WebkitTapHighlightColor:'transparent',
              }}>{accMode==='sharp'?'SHARPS':'FLATS'}</button>
              <button onClick={()=>{setSelNotes([]);setInsertAt(-1);setRespellChip(null);setGenerated(false);}} style={{
                padding:'4px 10px',background:'none',
                border:`1px solid rgba(245,240,232,0.25)`,
                color:'rgba(245,240,232,0.7)',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.68rem',
                letterSpacing:'0.1em',cursor:'pointer',borderRadius:2,
                WebkitTapHighlightColor:'transparent',
              }}>CLEAR</button>
            </div>
          } />

          {/* Keyboard */}
          {inputTab==='keys' && (
            <>
              <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',touchAction:'pan-x'}}>
                <svg ref={el=>{pianoRef.current=el;if(el&&!pianoMounted)setPianoMounted(true);}}
                  viewBox="0 0 1008 130" preserveAspectRatio="none"
                  style={{width:2200,height:200,display:'block',cursor:'pointer',touchAction:'none'}} />
              </div>
              <div style={{background:'#0e0c09',padding:'5px 0',textAlign:'center'}}>
                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.6rem',
                  letterSpacing:'0.2em',color:'rgba(245,240,232,0.35)'}}>
                  ← DRAG TO SCROLL KEYBOARD →
                </span>
              </div>
              <div style={{textAlign:'center',padding:'2px 0 4px',background:'#0e0c09'}}>
                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.55rem',
                  letterSpacing:'0.15em',color:'rgba(245,240,232,0.3)'}}>
                  🔔 ENSURE DEVICE IS NOT MUTED
                </span>
              </div>
            </>
          )}

          {/* Mic */}
          {inputTab==='mic' && (
            <div style={{padding:'24px',textAlign:'center',background:'#0e0c09'}}>
              <button onClick={toggleMic} style={{
                width:80,height:80,borderRadius:'50%',
                background:micActive?'rgba(229,53,53,0.2)':'rgba(139,58,26,0.15)',
                border:`3px solid ${micActive?'#e53535':C.accent}`,
                cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',
              }}>
                <div style={{width:32,height:32,background:micActive?'#e53535':C.accent,
                  borderRadius:micActive?4:'50%',transition:'all 0.2s'}} />
              </button>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
                letterSpacing:'0.2em',color:'rgba(245,240,232,0.7)',marginTop:10}}>
                {micActive?'RECORDING — TAP TO STOP':'TAP TO RECORD'}
              </div>
              {micStatus && <div style={{fontFamily:"'Bebas Neue',sans-serif",
                fontSize:'2rem',color:C.accent,marginTop:4}}>{micStatus}</div>}
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                fontSize:'0.9rem',color:'rgba(245,240,232,0.7)',maxWidth:380,margin:'8px auto 0',lineHeight:1.5}}>
                Play each note separately — one at a time with a brief silence between notes.
              </div>
            </div>
          )}

          {/* Live staff */}
          {selNotes.length>0 && (
            <div ref={liveStaffRef} style={{background:'white',overflowX:'auto',
              WebkitOverflowScrolling:'touch',padding:'4px 14px',
              borderTop:`1px solid ${C.bord}`,minHeight:80}} />
          )}

          {/* Drag to scroll notes band */}
          {selNotes.length>0 && (
            <div style={{background:C.accent,padding:'5px 0',textAlign:'center'}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.55rem',
                letterSpacing:'0.2em',color:'rgba(255,255,255,0.7)'}}>
                ← DRAG TO SCROLL NOTES →
              </span>
            </div>
          )}

          {/* Chips row */}
          <div style={{padding:'10px 28px 6px'}}>
            {respellChip!==null && (
              <RespellPopup
                note={selNotes[respellChip.idx]}
                anchorY={respellChip.y}
                onClose={()=>setRespellChip(null)}
                onDelete={()=>{removeNote(respellChip.idx);setRespellChip(null);}}
                onUpdate={newNote=>{
                  setSelNotes(prev=>{const n=[...prev];n[respellChip.idx]=newNote;return n;});
                  setRespellChip(prev=>({...prev}));
                }}
              />
            )}
            {selNotes.length===0 ? (
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.05rem',
                letterSpacing:'0.1em',color:'#888'}}>No notes entered</span>
            ) : (
              <div style={{display:'flex',flexWrap:'wrap',gap:4,alignItems:'center',
                overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                <InsBtn idx={0} />
                {selNotes.map((n,i)=>(
                  <React.Fragment key={i}>
                    <span
                      onClick={e=>{
                        e.stopPropagation();
                        if(respellChip?.idx===i){setRespellChip(null);return;}
                        setRespellChip({idx:i,y:e.currentTarget.getBoundingClientRect().top});
                      }}
                      style={{
                        background:respellChip?.idx===i?C.accentH:C.accent,
                        color:'white',fontFamily:"'Inconsolata',monospace",
                        fontSize:'0.78rem',padding:'3px 8px 3px 10px',
                        display:'inline-flex',alignItems:'center',gap:3,
                        cursor:'pointer',userSelect:'none',
                        WebkitTapHighlightColor:'transparent',
                        animation:'pop 0.1s ease',
                      }}>
                      {dn(n)}
                    </span>
                    <InsBtn idx={i+1} />
                  </React.Fragment>
                ))}
              </div>
            )}
            {selNotes.length>0 && (
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.05rem',
                letterSpacing:'0.1em',color:'#aaa',marginTop:6}}>
                <strong style={{color:'white'}}>{selNotes.length}</strong> PITCHES · <strong style={{color:'white'}}>{patternCount||'—'}</strong> PATTERNS
              </div>
            )}
            {insertAt>=0 && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                marginTop:6,padding:'5px 0',borderTop:`1px solid ${C.bord}`}}>
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                  fontSize:'0.85rem',color:C.cream}}>Tap a key to insert at marked position</span>
                <button onClick={()=>setInsertAt(-1)} style={{
                  background:'none',border:`1px solid rgba(255,255,255,0.3)`,
                  color:'rgba(255,255,255,0.8)',padding:'2px 10px',
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                  letterSpacing:'0.1em',cursor:'pointer'}}>CANCEL</button>
              </div>
            )}
          </div>

          {/* Play passage */}
          {selNotes.length>0 && (
            <div style={{padding:'0 28px 8px'}}>
              <button onClick={playPassage} style={{
                width:'100%',padding:'10px',background:'#2a231d',
                border:`1px solid ${C.bord}`,color:C.cream,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',
                letterSpacing:'0.12em',cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>▶ PLAY PASSAGE</button>
            </div>
          )}
        </>
      )}

      {/* STEP 4: Generate */}
      {showStep4 && !generated && (
        <>
          <SH title="GENERATE" />
          <div style={{padding:'14px 28px 20px'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.6rem',
              letterSpacing:'0.22em',color:C.muted,marginBottom:5}}>DOCUMENT NAME</div>
            <input type="text" value={docName} onChange={e=>setDocName(e.target.value)}
              placeholder="e.g. Brahms mvt 1"
              style={{width:'100%',background:'#1a1410',border:`1px solid ${C.bord}`,
                color:C.cream,padding:'8px 10px',fontFamily:"'Inconsolata',monospace",
                fontSize:'0.82rem',outline:'none',boxSizing:'border-box',marginBottom:10}} />
            <button onClick={generate} style={{
              width:'100%',padding:'13px',background:C.accent,border:'none',
              color:'white',fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.05rem',
              letterSpacing:'0.12em',cursor:'pointer',
              WebkitTapHighlightColor:'transparent',
            }}>GENERATE EXERCISES</button>
            {saveMsg && <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',
              color:C.gold,marginTop:8}}>{saveMsg}</div>}
          </div>
        </>
      )}

      {/* Generated — small screen */}
      {SmallExView}

    </div>
  );

  // ── Layout ────────────────────────────────────────────────────────────
  const hasScore = pageImages.length>0;
  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <TopBar
        left={<BackBtn onClick={onBack} />}
        center={piece?.title||(savedExercise?.doc_name||'RHYTHMIC VARIATION')}
        right={generated ? (
          <button onClick={()=>{setGenerated(false);setExercises([]);}} style={{
            background:'none',border:`1px solid ${C.bord}`,color:C.cream,
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
            letterSpacing:'0.1em',padding:'5px 12px',cursor:'pointer'}}>
            ← EDIT
          </button>
        ) : null}
      />

      <div style={{flex:'1 1 0',minHeight:0,display:'flex',
        flexDirection:(land&&hasScore)?'row':'column'}}>

        {/* Score */}
        {hasScore && (
          <ZoomableScore src={pageImages[currentPage]} tapPos={tapPos}
            currentPage={currentPage} totalPages={pageImages.length}
            onPageChange={setCurrentPage}
            flex={land?'0 0 45%':'0 0 36%'} />
        )}

        {/* Main panel */}
        {generated && AllExView ? (
          <div style={{flex:'1 1 0',minHeight:0,display:'flex',flexDirection:'column'}}>
            {AllExView}
            <div style={{padding:'8px 14px',flexShrink:0,borderTop:`1px solid ${C.bord}`,
              display:'flex',gap:8,alignItems:'center'}}>
              <input type="text" value={docName} onChange={e=>setDocName(e.target.value)}
                placeholder="Document name"
                style={{flex:1,background:C.panel,border:`1px solid ${C.bord}`,color:C.cream,
                  padding:'6px 10px',fontFamily:"'Inconsolata',monospace",fontSize:'0.8rem',outline:'none'}} />
              <Btn onClick={saveExercise} disabled={saving}>{saving?'SAVING...':'SAVE'}</Btn>
            </div>
          </div>
        ) : ControlsPanel}

      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   MUR — ALL EXERCISES VIEW (large screen)
═══════════════════════════════════════════════════════════════════════ */
function AllExercisesView({ exercises, selNotes, clef, murKey, playingIdx, onPlay, land }) {
  const containerRef = useRef();
  useEffect(()=>{
    const ABCJS=window.ABCJS;
    if(!ABCJS||!exercises.length||!containerRef.current) return;
    const container=containerRef.current;
    exercises.forEach((ex,i)=>{
      const div=container.querySelector('#mur-ex-'+i);
      if(!div) return;
      const abc=buildAbcString(ex.pat,selNotes,clef,murKey);
      try {
        ABCJS.renderAbc(div,abc,{
          scale:1.1,staffwidth:Math.min((container.offsetWidth||700)-60,820),
          paddingright:20,paddingleft:10,paddingbottom:8,paddingtop:8,
          add_classes:true,
          wrap:{minSpacing:1.2,maxSpacing:2.8,preferredMeasuresPerLine:land?4:3},
        });
        div.querySelectorAll('svg path,svg rect,svg ellipse,svg line,svg text').forEach(el=>{
          el.style.fill='#1a1208';el.style.stroke='#1a1208';
        });
      } catch(e){}
    });
  },[exercises,selNotes,clef,murKey,land]);

  return (
    <div ref={containerRef} style={{background:'white',flex:'1 1 0',overflowY:'auto',padding:'8px 12px'}}>
      {exercises.map((ex,i)=>(
        <div key={i} style={{borderBottom:'1px solid #e8e0d4',paddingBottom:4,marginBottom:4}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 0 2px'}}>
            <button onClick={()=>onPlay(i)}
              style={{background:playingIdx===i?'#8b3a1a':'none',
                border:`1px solid ${playingIdx===i?'#8b3a1a':'#c8b89a'}`,
                color:playingIdx===i?'white':'#5a4e42',
                width:26,height:26,borderRadius:'50%',cursor:'pointer',
                fontSize:'0.65rem',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {playingIdx===i?'⏸':'▶'}
            </button>
            <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.65rem',color:'#9a8e82'}}>
              {ex.pat.timeSig} &nbsp;·&nbsp; {ex.pat.section.replace(' Rhythm Patterns','')}
            </span>
          </div>
          <div id={'mur-ex-'+i} />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ICU — MARKER SCREEN
═══════════════════════════════════════════════════════════════════════ */
function MarkerScreen({ piece, pageImages, currentPage, setCurrentPage, markers, setMarkers, onBack, onNext }) {
  const imgRef    = useRef();
  const canvasRef = useRef();
  const imgRef2   = useRef();
  const canvasRef2 = useRef();
  const [loaded,setLoaded]   = useState(false);
  const [loaded2,setLoaded2] = useState(false);
  const land = useOrientation();
  const totalPages = pageImages.length;
  const showTwoPages = land && totalPages>1;
  const rightPage = currentPage+1<totalPages?currentPage+1:null;

  const drawArrow = (ctx,px,py,color) => {
    const w=10,h=13;
    ctx.fillStyle=color;
    ctx.beginPath();ctx.moveTo(px-w,py-h-2);ctx.lineTo(px+w,py-h-2);ctx.lineTo(px,py-2);ctx.closePath();ctx.fill();
  };

  const drawPage = (canvas,img,pageIdx) => {
    if(!canvas||!img) return;
    const w=img.clientWidth,h=img.clientHeight;
    if(!w||!h) return;
    canvas.width=w;canvas.height=h;canvas.style.width=w+'px';canvas.style.height=h+'px';
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
    markers.filter(m=>m.page===pageIdx).forEach(m=>drawArrow(ctx,m.x*w,m.y*h,C.accent));
  };

  const draw = useCallback(()=>{
    drawPage(canvasRef.current,imgRef.current,currentPage);
    if(rightPage!==null) drawPage(canvasRef2.current,imgRef2.current,rightPage);
  },[markers,currentPage,rightPage]);

  useEffect(()=>{draw();},[draw]);
  useEffect(()=>{setLoaded(false);setLoaded2(false);},[currentPage]);
  useEffect(()=>{
    const ro=new ResizeObserver(()=>draw());
    if(imgRef.current) ro.observe(imgRef.current);
    return ()=>ro.disconnect();
  },[loaded,draw]);
  useEffect(()=>{draw();},[land,draw]);

  const handleTap = e => {
    const img=imgRef.current; if(!img) return;
    const rect=img.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width, y=(e.clientY-rect.top)/rect.height;
    const hitX=44/img.clientWidth, hitY=44/img.clientHeight;
    const near=markers.findIndex(m=>m.page===currentPage&&Math.abs(m.x-x)<hitX&&Math.abs(m.y-y)<hitY);
    if(near>=0) setMarkers(prev=>prev.filter((_,i)=>i!==near));
    else setMarkers(prev=>[...prev,{page:currentPage,x,y}]);
  };

  const handleTap2 = e => {
    if(rightPage===null) return;
    const img=imgRef2.current; if(!img) return;
    const rect=img.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width, y=(e.clientY-rect.top)/rect.height;
    const hitX=44/img.clientWidth, hitY=44/img.clientHeight;
    const near=markers.findIndex(m=>m.page===rightPage&&Math.abs(m.x-x)<hitX&&Math.abs(m.y-y)<hitY);
    if(near>=0) setMarkers(prev=>prev.filter((_,i)=>i!==near));
    else setMarkers(prev=>[...prev,{page:rightPage,x,y}]);
  };

  const totalMarkers=markers.length;
  const pageMarkers=markers.filter(m=>m.page===currentPage).length;


  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <TopBar
        left={<BackBtn onClick={onBack} />}
        center={piece?.title||'MARK UNITS'}
        right={
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <Btn onClick={()=>setMarkers([])} disabled={totalMarkers===0}
              style={{fontSize:'0.85rem',padding:'7px 14px',
                color:totalMarkers>0?'#e05555':C.dim,
                borderColor:totalMarkers>0?'#e05555':C.bord}}>
              CLEAR
            </Btn>
            <Btn onClick={onNext} disabled={totalMarkers<2}
              style={{fontSize:'0.85rem',padding:'7px 14px',
                background:totalMarkers>=2?C.accent:'transparent',
                color:totalMarkers>=2?'white':C.dim,
                borderColor:totalMarkers>=2?C.accent:C.bord}}>
              SESSION SETUP →
            </Btn>
          </div>
        }
      />

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'6px 14px',flexShrink:0,borderBottom:`1px solid ${C.bord}`,gap:12}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:C.cream,flex:1}}>
          Tap above the first note of each unit to place a marker
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center',flexShrink:0}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:'0.08em',color:C.accent}}>
            {totalMarkers} marker{totalMarkers!==1?'s':''}
            {pageMarkers>0&&totalPages>1?` (${pageMarkers} this page)`:''}
          </div>
          {!showTwoPages && totalPages>1 && (
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <Btn onClick={()=>setCurrentPage(p=>Math.max(0,p-1))}
                disabled={currentPage===0}
                style={{padding:'5px 12px',fontSize:'0.85rem'}}>← PAGE</Btn>
              <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.8rem',color:C.cream}}>
                {currentPage+1}/{totalPages}
              </span>
              <Btn onClick={()=>setCurrentPage(p=>Math.min(totalPages-1,p+1))}
                disabled={currentPage===totalPages-1}
                style={{padding:'5px 12px',fontSize:'0.85rem'}}>PAGE →</Btn>
            </div>
          )}
        </div>
      </div>

      <div style={{flex:'1 1 0',minHeight:0,background:'#0a0805',display:'flex',flexDirection:'row'}}>
        <div style={{position:'relative',flex:1,minWidth:0,overflow:'hidden'}}>
          <img ref={imgRef} src={pageImages[currentPage]}
            onLoad={()=>{setLoaded(true);requestAnimationFrame(()=>draw());}}
            onClick={handleTap}
            style={{width:'100%',height:'100%',objectFit:'contain',display:'block',
              userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none'}}
            onContextMenu={e=>e.preventDefault()}
            draggable={false} />
          <canvas ref={canvasRef} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}} />
        </div>
        {showTwoPages&&rightPage!==null&&(
          <div style={{position:'relative',flex:1,minWidth:0,borderLeft:`1px solid ${C.bord}`,overflow:'hidden'}}>
            <img ref={imgRef2} src={pageImages[rightPage]}
              onLoad={()=>{setLoaded2(true);requestAnimationFrame(()=>draw());}}
              onClick={handleTap2}
              style={{width:'100%',height:'100%',objectFit:'contain',display:'block',
                userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none'}}
              onContextMenu={e=>e.preventDefault()}
              draggable={false} />
            <canvas ref={canvasRef2} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ICU — PARAMS SCREEN
═══════════════════════════════════════════════════════════════════════ */
function ParamsScreen({ N, startTempo, setStartTempo, goalTempo, setGoalTempo, increment, setIncrement, onBack, onStart }) {
  const valid = goalTempo>startTempo&&increment>0&&increment<=goalTempo-startTempo;
  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <TopBar left={<BackBtn onClick={onBack} />} center="SESSION SETUP" right={null} />
      <div style={{flex:'1 1 0',overflowY:'auto',padding:'12px 20px',display:'flex',flexDirection:'column',gap:14,maxWidth:540,margin:'0 auto',width:'100%'}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',color:C.cream,letterSpacing:'0.1em'}}>
          {N} UNIT{N!==1?'S':''}
        </div>
        <Spinner label="START TEMPO" value={startTempo} set={setStartTempo} min={20} max={goalTempo-1} />
        <Spinner label="GOAL TEMPO"  value={goalTempo}  set={setGoalTempo}  min={startTempo+1} max={320} />
        <Spinner label="INCREMENT"   value={increment}  set={setIncrement}  min={1} max={40} />
        {valid && (
          <div style={{padding:'10px 14px',background:C.panel,border:`1px solid ${C.bord2}`,
            fontFamily:"'Inconsolata',monospace",fontSize:'0.95rem',color:C.cream,lineHeight:1.7}}>
            {Math.floor((goalTempo-startTempo)/increment)+1} steps per phase &nbsp;&middot;&nbsp; {N} phases
          </div>
        )}
      </div>
      <div style={{padding:'10px 20px',borderTop:`1px solid ${C.bord}`,flexShrink:0,background:C.ink}}>
        <Btn onClick={onStart} disabled={!valid} big full
          style={{background:valid?C.accent:'transparent',color:valid?'white':C.dim,borderColor:valid?C.accent:C.bord,fontSize:'1.3rem',padding:'18px 24px',letterSpacing:'0.15em'}}>
          BEGIN SESSION →
        </Btn>
      </div>
    </div>
  );
}

function Spinner({ label, value, set, min, max }) {
  const S={background:'none',border:`1px solid ${C.bord}`,color:C.cream,width:34,height:34,cursor:'pointer',fontSize:'1.1rem',fontFamily:'monospace',flexShrink:0};
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:'0.1em',fontSize:'1.2rem',color:C.cream}}>{label}</div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <button style={S} onClick={()=>set(v=>Math.max(min,v-1))}>-</button>
        <input type="number" value={value} onChange={e=>{const v=parseInt(e.target.value);if(!isNaN(v))set(Math.max(min,Math.min(max,v)));}} />
        <button style={S} onClick={()=>set(v=>Math.min(max,v+1))}>+</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ICU — SESSION SCREEN
═══════════════════════════════════════════════════════════════════════ */
function SessionScreen({ pageImages, markers, N, startTempo, goalTempo, increment, onBack, onDone, profile, piece, tapPos }) {
  const steps     = useRef(generateSteps(N,startTempo,goalTempo,increment)).current;
  const [idx,setIdx]         = useState(0);
  const [metroOn,setMetroOn] = useState(false);
  const [currentPage,setCurrentPage] = useState(()=>markers[0]?.page||0);
  const metro   = useRef(new Metro());
  const imgRef  = useRef();
  const canvasRef = useRef();
  const imgRef2S   = useRef();
  const canvasRef2S = useRef();
  const [imgLoaded,setImgLoaded]   = useState(false);
  const [imgLoaded2,setImgLoaded2] = useState(false);
  const land = useOrientation();

  const safeIdx  = Math.min(idx,steps.length-1);
  const step     = steps[safeIdx];

  // Log practice session on mount
  useEffect(()=>{
    try {
      const prof = profile || JSON.parse(localStorage.getItem('murProfile')||'{}');
      if(prof.email) {
        sbPost('/rest/v1/practice_log', {
          user_email: prof.email,
          piece_id: piece?.id||null,
          strategy: 'ICU',
          n_units: N,
          start_tempo: startTempo,
          goal_tempo: goalTempo,
          score_page: tapPos?.page??null,
          score_x: tapPos?.x??null,
          score_y: tapPos?.y??null,
        }).catch(()=>{});
      }
    } catch(e){}
  },[]);

  const handleDone = () => {
    // Log completion and return to score
    try {
      const prof = profile || JSON.parse(localStorage.getItem('murProfile')||'{}');
      if(prof.email) {
        sbPost('/rest/v1/practice_log', {
          user_email: prof.email,
          piece_id: piece?.id||null,
          strategy: 'ICU',
          n_units: N,
          start_tempo: startTempo,
          goal_tempo: goalTempo,
          completed_tempo: step.tempo,
          score_page: tapPos?.page??null,
          score_x: tapPos?.x??null,
          score_y: tapPos?.y??null,
          event: 'completed',
        }).catch(()=>{});
      }
    } catch(e){}
    if(onDone) onDone();
  };
  const atGoal   = step.tempo>=goalTempo;
  const pastGoal = step.tempo>goalTempo;
  const nextPhaseIdx = steps.findIndex((s,i)=>i>safeIdx&&s.phase===step.phase+1);
  const hasNextPhase = nextPhaseIdx>=0;
  const progress = (safeIdx+1)/steps.length;
  const unitLabel = step.units.length===1?`UNIT ${step.units[0]+1}`:`UNITS ${step.units[0]+1}–${step.units[step.units.length-1]+1}`;
  const showTwo = land&&pageImages.length>1;
  const rightPageS = currentPage+1<pageImages.length?currentPage+1:null;

  useEffect(()=>{
    const as=step.units[0];
    if(markers[as]) setCurrentPage(markers[as].page);
  },[step.units]);

  useEffect(()=>{setImgLoaded(false);setImgLoaded2(false);},[currentPage]);
  useEffect(()=>{if(metroOn)metro.current.start(step.tempo);else metro.current.stop();},[metroOn]);
  useEffect(()=>{metro.current.setBpm(step.tempo);},[step.tempo]);
  useEffect(()=>()=>metro.current.stop(),[]);

  const drawArrow = (ctx,px,py,color) => {
    const w=10,h=13;ctx.fillStyle=color;
    ctx.beginPath();ctx.moveTo(px-w,py-h-2);ctx.lineTo(px+w,py-h-2);ctx.lineTo(px,py-2);ctx.closePath();ctx.fill();
  };

  const drawOnCanvas = useCallback((canvas,img,pageIdx)=>{
    if(!canvas||!img||!img.complete) return;
    const w=img.clientWidth,h=img.clientHeight;if(!w||!h) return;
    canvas.width=w;canvas.height=h;canvas.style.width=w+'px';canvas.style.height=h+'px';
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
    const activeStart=step.units[0];
    const activeEnd=Math.min(step.units[step.units.length-1]+1,markers.length-1);
    const GREEN='#3db06a';
    markers.filter(m=>m.page===pageIdx).forEach(m=>{
      const gi=markers.indexOf(m);
      const isStart=gi===activeStart,isEnd=gi===activeEnd;
      // Only show active start and end — hide all others
      if(!isStart&&!isEnd) return;
      drawArrow(ctx,m.x*w,m.y*h,GREEN);
    });
  },[step.units,markers]);

  const drawOverlay = useCallback(()=>{
    drawOnCanvas(canvasRef.current,imgRef.current,currentPage);
    if(showTwo&&rightPageS!==null) drawOnCanvas(canvasRef2S.current,imgRef2S.current,rightPageS);
  },[drawOnCanvas,currentPage,showTwo,rightPageS]);

  useEffect(()=>{drawOverlay();},[drawOverlay]);
  useEffect(()=>{
    const ro=new ResizeObserver(()=>drawOverlay());
    if(imgRef.current) ro.observe(imgRef.current);
    return ()=>ro.disconnect();
  },[imgLoaded,drawOverlay]);
  useEffect(()=>{drawOverlay();},[land,drawOverlay]);

  const progressBar = (
    <div style={{height:3,background:C.bord,flexShrink:0}}>
      <div style={{height:'100%',background:C.accent,width:`${progress*100}%`,transition:'width 0.25s'}} />
    </div>
  );

  const photoBlock = (
    <div style={{flex:'1 1 0',minHeight:0,background:'#0a0805',display:'flex'}}>
      <div style={{position:'relative',flex:1,minWidth:0,overflow:'hidden'}}>
        <img ref={imgRef} src={pageImages[currentPage]}
          onLoad={()=>{setImgLoaded(true);requestAnimationFrame(()=>drawOverlay());}}
          style={{width:'100%',height:'100%',objectFit:'contain',display:'block',userSelect:'none'}}
          draggable={false} />
        <canvas ref={canvasRef} style={{position:'absolute',top:0,left:0,pointerEvents:'none'}} />
      </div>
      {showTwo&&rightPageS!==null&&(
        <div style={{position:'relative',flex:1,minWidth:0,borderLeft:`1px solid ${C.bord}`,overflow:'hidden'}}>
          <img ref={imgRef2S} src={pageImages[rightPageS]}
            onLoad={()=>{setImgLoaded2(true);requestAnimationFrame(()=>drawOverlay());}}
            style={{width:'100%',height:'100%',objectFit:'contain',display:'block',userSelect:'none'}}
            draggable={false} />
          <canvas ref={canvasRef2S} style={{position:'absolute',top:0,left:0,pointerEvents:'none'}} />
        </div>
      )}
    </div>
  );

  const topBarContent = (compact) => (
    <div style={{flexShrink:0,borderBottom:`2px solid ${C.accent}`,background:C.ink}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:compact?'3px 12px':'5px 12px'}}>
        <button onClick={onBack} style={{background:'none',border:`1px solid ${C.bord2}`,color:C.cream,padding:'6px 14px',cursor:'pointer',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'0.1em',flexShrink:0}}>← EXIT</button>
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:compact?'clamp(1.4rem,4vw,2rem)':'clamp(1.8rem,7vw,2.6rem)',color:atGoal?C.accent:C.cream,lineHeight:1}}>
            ♩ = {step.tempo}
            {pastGoal&&<span style={{fontSize:'0.4em',color:C.muted,marginLeft:8,verticalAlign:'middle'}}>PAST GOAL</span>}
          </div>
          <button onClick={()=>setMetroOn(m=>!m)} style={{background:metroOn?C.accent:'#2a231d',border:`2px solid ${metroOn?C.accent:'#666'}`,color:'white',width:compact?38:46,height:compact?38:46,cursor:'pointer',fontSize:compact?'1.1rem':'1.3rem',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            {metroOn?'⏸':'▶'}
          </button>
        </div>
        <button onClick={handleDone} style={{
          background:C.accent,border:`1px solid ${C.accent}`,
          color:'white',padding:'6px 14px',cursor:'pointer',
          fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
          letterSpacing:'0.1em',flexShrink:0}}>DONE ✓</button>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:compact?'2px 12px 2px':'3px 12px 4px',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:compact?12:15,color:C.cream}}>
        <span>Play from</span>
        <span style={{display:'inline-block',width:0,height:0,borderLeft:`${compact?5:6}px solid transparent`,borderRight:`${compact?5:6}px solid transparent`,borderBottom:`${compact?7:8}px solid #3db06a`,transform:'rotate(180deg)',marginTop:1}} />
        <span style={{color:C.muted}}>to</span>
        <span style={{display:'inline-block',width:0,height:0,borderLeft:`${compact?5:6}px solid transparent`,borderRight:`${compact?5:6}px solid transparent`,borderBottom:`${compact?7:8}px solid #3db06a`,transform:'rotate(180deg)',marginTop:1}} />
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:compact?11:13,color:C.muted,letterSpacing:'0.06em',marginLeft:4}}>{unitLabel}</span>
      </div>
    </div>
  );

  const bottomBar = (
    <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:0,flexShrink:0,borderTop:`2px solid ${C.bord}`}}>
      <Btn onClick={()=>setIdx(nextPhaseIdx)} disabled={!hasNextPhase} full
        style={{padding:'12px 8px',fontSize:'1rem',borderRadius:0,border:'none',borderRight:`1px solid ${C.bord}`,background:hasNextPhase?C.panel:'transparent',color:hasNextPhase?C.cream:C.dim}}>
        NEXT PHASE »
      </Btn>
      <Btn onClick={()=>setIdx(i=>Math.min(steps.length-1,i+1))} disabled={idx>=steps.length-1} full
        style={{padding:'12px 8px',fontSize:'1.1rem',borderRadius:0,border:'none',background:idx>=steps.length-1?'transparent':C.accent,color:'white'}}>
        NEXT STEP →
      </Btn>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0,background:C.ink}}>
      {topBarContent(land)}
      {progressBar}
      {photoBlock}
      {bottomBar}
    </div>
  );
}
