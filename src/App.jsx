import React, { useState, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   SUPABASE
═══════════════════════════════════════════════════════════════════════ */
const SB_URL = 'https://twjdatheptwcskqhinie.supabase.co';
const SB_KEY = 'sb_publishable_BwKwqYjD_TTeL2BTu7jpTw_YQfdqvQ7';
const SB_H   = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
const sbGet  = p => fetch(SB_URL + p, { headers: SB_H });
const sbPost = (p, b) => fetch(SB_URL + p, { method:'POST', headers:{ ...SB_H, Prefer:'return=representation' }, body:JSON.stringify(b) });
const sbDelete = p => fetch(SB_URL + p, { method:'DELETE', headers: SB_H });
const sbPatch = (p, b) => fetch(SB_URL + p, { method:'PATCH', headers:{ ...SB_H, Prefer:'return=minimal' }, body:JSON.stringify(b) });

/* ═══════════════════════════════════════════════════════════════════════
   DESIGN SYSTEM
═══════════════════════════════════════════════════════════════════════ */
const C = {
  ink:'#ffffff', surf:'#f7f7f7', panel:'#ffffff',
  bord:'#e8e8e8', bord2:'#d4d4d4',
  accent:'#e0564b', accentH:'#c94a40', gold:'#b8860b',
  rule:'#333', cream:'#1a1a1a', mid:'#999',
  muted:'rgba(0,0,0,0.45)', dim:'rgba(0,0,0,0.18)',
  green:'#2eaa57',
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Bebas+Neue&family=Inconsolata:wght@400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html{height:-webkit-fill-available;}
  body{height:-webkit-fill-available;font-family:'Cormorant Garamond',Georgia,serif;background:#f5f5f5;
    padding-top:env(safe-area-inset-top);overflow:hidden;}
  #root{height:100%;}
  input[type=number],input[type=text],input[type=email]{
    background:#fff;color:#1a1a1a;border:1px solid #d4d4d4;border-radius:8px;
    padding:10px 14px;font-family:'Inconsolata',monospace;font-size:1rem;width:100%;}
  input:focus{outline:2px solid ${C.accent};outline-offset:-1px;}
  input[type=number]{width:78px;text-align:center;}
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
  input[type=number]{-moz-appearance:textfield;}
  select{appearance:none;-webkit-appearance:none;background:#fff;color:#1a1a1a;
    border:1px solid #d4d4d4;border-radius:8px;padding:10px 14px;font-family:'Inconsolata',monospace;
    font-size:0.9rem;width:100%;cursor:pointer;}
  select:focus{outline:2px solid ${C.accent};}
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
    background: active?C.accent:disabled?'#f0f0f0':'#fff',
    color: active?'white':disabled?'#bbb':'#333',
    border:`1px solid ${active?C.accent:disabled?'#ddd':'#ccc'}`,
    borderRadius:8, cursor:disabled?'not-allowed':'pointer',
    transition:'background 0.12s,color 0.12s,border-color 0.12s',
    userSelect:'none', WebkitTapHighlightColor:'transparent', ...style,
  }}>{children}</button>
);

const BackBtn = ({ onClick, label='← BACK' }) => (
  <button onClick={onClick} style={{
    background:'none',border:'none',color:'#333',padding:0,
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
    borderBottom:`1px solid ${C.bord}`,background:'#fff',
  }}>
    <div style={{ minWidth:80 }}>{left}</div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.3rem',
      letterSpacing:'0.15em',color:'#1a1a1a',textAlign:'center' }}>{center}</div>
    <div style={{ minWidth:80,display:'flex',justifyContent:'flex-end' }}>{right}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════ */
const range = (a,b) => Array.from({length:b-a},(_,i)=>a+i);

function getProfile() { try { return JSON.parse(localStorage.getItem('murProfile')||'{}'); } catch { return {}; } }
function setProfile(p) { localStorage.setItem('murProfile', JSON.stringify(p)); }

// User-facing strategy names
const STRAT_NAME = {
  icu: 'Interleaved Click-Up',
  scu: 'Slow Click-Up',
  mur: 'Rhythmic Variation',
  unguided: 'Unguided',
  recording: 'Recording',
};
const stratName = s => STRAT_NAME[s] || s || 'Practice';
const localDate = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

// Find or create a practice_spots record near a tap position
async function findOrCreateSpot(email, pieceId, tapPos) {
  if(!email || !pieceId || !tapPos) return null;
  try {
    const r = await sbGet(`/rest/v1/practice_spots?user_email=eq.${encodeURIComponent(email)}&piece_id=eq.${pieceId}&score_page=eq.${tapPos.page}&order=created_at.desc`);
    const spots = await r.json()||[];
    const match = spots.find(s => Math.abs(s.score_y - tapPos.y) < 0.06 && (s.score_x == null || Math.abs(s.score_x - tapPos.x) < 0.06));
    if(match) {
      // Update label if a new one was provided
      if(tapPos.label && tapPos.label !== match.label) {
        try { await sbPatch(`/rest/v1/practice_spots?id=eq.${match.id}`, { label: tapPos.label }); } catch(e){}
      }
      return match.id;
    }
    // Create new spot
    const cr = await sbPost('/rest/v1/practice_spots', {
      user_email: email,
      piece_id: pieceId,
      score_page: tapPos.page,
      score_x: tapPos.x,
      score_y: tapPos.y,
      label: tapPos.label || null,
    });
    const rows = await cr.json();
    return rows?.[0]?.id || null;
  } catch(e) { console.error('findOrCreateSpot failed', e); return null; }
}

function useWindowHeight() {
  const getH = () => window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const [h,setH] = useState(getH);
  useEffect(()=>{
    const u = ()=>setH(getH());
    window.addEventListener('resize',u);
    window.addEventListener('orientationchange',()=>setTimeout(u,150));
    if(window.visualViewport) window.visualViewport.addEventListener('resize',u);
    return ()=>{
      window.removeEventListener('resize',u);
      if(window.visualViewport) window.visualViewport.removeEventListener('resize',u);
    };
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
  const [large,setLarge] = useState(()=>Math.max(window.innerWidth,window.innerHeight)>=768);
  useEffect(()=>{
    const u = ()=>setLarge(Math.max(window.innerWidth,window.innerHeight)>=768);
    window.addEventListener('resize',u);
    window.addEventListener('orientationchange',()=>setTimeout(u,150));
    return ()=>{window.removeEventListener('resize',u);};
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
  constructor(){this.ctx=null;this.id=null;this.bpm=80;this.next=0;this.subdiv=1;this.subCount=0;}
  _ensureCtx(){
    if(!this.ctx||this.ctx.state==='closed'){
      this.ctx=new(window.AudioContext||window.webkitAudioContext)();
    }
    if(this.ctx.state==='suspended') this.ctx.resume();
  }
  _click(t, isBeat){
    try {
      const o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.connect(g);g.connect(this.ctx.destination);
      o.frequency.value = isBeat ? 1100 : 700;
      const vol = isBeat ? 0.7 : 0.35;
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(vol,t+0.003);
      g.gain.exponentialRampToValueAtTime(0.001,t+0.06);
      o.start(t);o.stop(t+0.07);
    } catch(e){}
  }
  _sched(){
    const subInterval = 60 / this.bpm / this.subdiv;
    while(this.next<this.ctx.currentTime+0.25){
      const isBeat = this.subCount % this.subdiv === 0;
      this._click(this.next, isBeat);
      this.next += subInterval;
      this.subCount++;
    }
    this.id=setTimeout(()=>this._sched(),80);
  }
  start(bpm){
    this.stop();this.bpm=bpm;this.subCount=0;
    this._ensureCtx();
    this.next=this.ctx.currentTime+0.05;this._sched();
  }
  setSubdiv(s){ this.subdiv=s; }
  setBpm(bpm){
    this.bpm=bpm;
    if(this.ctx&&this.ctx.state==='suspended') this.ctx.resume();
  }
  stop(){if(this.id){clearTimeout(this.id);this.id=null;}}
}

const SubdivBtns = ({subdiv, setSubdiv, metro, metroOn, bpm, compact}) => (
  <div style={{display:'flex',gap:2}}>
    {[{v:1,label:'♩'},{v:2,label:'♪♪'},{v:3,label:'♪³'}].map(({v,label})=>(
      <button key={v} onClick={()=>{
        setSubdiv(v);
        metro.current.setSubdiv(v);
        if(metroOn) metro.current.start(bpm);
      }} style={{
        background: subdiv===v ? '#555' : '#f0f0f0',
        color: subdiv===v ? '#fff' : '#999',
        border: `1px solid ${subdiv===v ? '#555' : '#ddd'}`,
        padding: compact ? '3px 6px' : '4px 8px',
        fontFamily:"'Bebas Neue',sans-serif",
        fontSize: compact ? '0.65rem' : '0.75rem',
        cursor:'pointer',borderRadius:4,
        WebkitTapHighlightColor:'transparent',
        lineHeight:1,
      }}>{label}</button>
    ))}
  </div>
);

// Audio playback from localStorage
function AudioPlayBtn({audioKey}) {
  const [playing, setPlaying] = useState(false);
  const aRef = useRef(null);
  const play = () => {
    if(playing) { aRef.current?.pause(); aRef.current=null; setPlaying(false); return; }
    try {
      const b64 = localStorage.getItem(audioKey);
      if(!b64) return;
      // Convert data URL to blob for reliable iOS playback
      const parts = b64.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'audio/mp4';
      const raw = atob(parts[1]);
      const arr = new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i);
      const blob = new Blob([arr], {type:mime});
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.onended = ()=>{setPlaying(false);URL.revokeObjectURL(url);};
      a.onerror = ()=>{setPlaying(false);URL.revokeObjectURL(url);};
      a.play().then(()=>setPlaying(true)).catch(()=>{setPlaying(false);URL.revokeObjectURL(url);});
      aRef.current = a;
      setPlaying(true);
    } catch(e){ console.error('playback error',e); }
  };
  return (
    <button onClick={play} style={{
      display:'inline-flex',alignItems:'center',gap:4,
      background: playing ? 'rgba(220,50,50,0.12)' : 'rgba(220,50,50,0.06)',
      border:`1px solid ${playing ? 'rgba(220,50,50,0.3)' : 'rgba(220,50,50,0.15)'}`,
      borderRadius:8,padding:'4px 10px',cursor:'pointer',
      fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
      letterSpacing:'0.06em',color:'#dc3232',
      WebkitTapHighlightColor:'transparent',marginTop:4,
    }}>{playing?'⏸ STOP':'▶ PLAY RECORDING'}</button>
  );
}
const parseAudioKey = (notes) => {
  if(!notes) return null;
  const m = notes.match(/\[audio:(pfn_audio_\d+)\]/);
  return m ? m[1] : null;
};
const stripAudioTag = (notes) => notes ? notes.replace(/\s*\[audio:pfn_audio_\d+\]/, '').trim() : '';

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

import { MUR_DB, g2s, s2g } from './rhythmDB.js';

/* ═══════════════════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════════════════ */
function RootContainer({children}) {
  return (
    <div style={{height:'100dvh',background:'#f5f5f5',color:'#1a1a1a',
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
  const [sessionMode,setSessionMode]       = useState('massed');
  const [interleavedSpots,setInterleavedSpots] = useState([]);
  const [interleavedMode,setInterleavedMode] = useState(null); // 'timed' | 'consistency'
  const [interleavedValue,setInterleavedValue] = useState(5); // minutes or reps
  const [tapPos,setTapPos]             = useState(null);
  const [showOverlay,setShowOverlay]   = useState(false);
  const [locateEx,setLocateEx]         = useState(null);
  const [locateResult,setLocateResult] = useState(null); // 'ok' | 'fail' | error string
  const [scuSpot,setScuSpot]           = useState(null); // spot data for Slow Click Up
  const [spotPicker,setSpotPicker]     = useState(null); // {nearby:[], tapPos:{}}
  const [selectedSpot,setSelectedSpot] = useState(null); // spot object from picker
  const [spotSetup, setSpotSetup]      = useState(null); // {tapPos, nearby[], spotName}
  const [spotName, setSpotName]        = useState('');
  const [unguidedActive, setUnguidedActive] = useState(false);
  const [strategyNote, setStrategyNote] = useState(null); // {strategy, returnScreen} — pending notes prompt
  const [noteText, setNoteText] = useState('');
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
          locateResult={locateResult}
          onLocateResultClear={()=>setLocateResult(null)}
          onSelectRepertoire={(p,imgs)=>{
            setPiece(p);setPageImages(imgs);
            setMarkers([]);setCurrentPage(0);
            setSessionMode('massed');setInterleavedSpots([]);
            setScreen('score');
          }}
          onLoadExercise={ex=>{
            setSavedExercise(ex);setPiece(null);setPageImages([]);
            setScreen('mur');
          }}
          onLocateExercise={(ex,p,imgs)=>{
            // Open score in locate mode: tap a spot → patch exercise location
            setLocateEx(ex);
            setPiece(p);setPageImages(imgs);
            setMarkers([]);setCurrentPage(0);
            setScreen('score');
          }}
          onSignOut={()=>{setProfile({});setProfileState({});setScreen('signin');}}
          onPracticeAgain={async ({log, piece:p, spot})=>{
            if(!p) return;
            // Load piece images
            let imgs = [];
            if(p.file_type==='image') {
              imgs = [p.file_url];
            } else {
              try {
                const pdfjsLib = window['pdfjs-dist/build/pdf'];
                if(pdfjsLib) {
                  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                  const pdf = await pdfjsLib.getDocument(p.file_url).promise;
                  for(let pg=1;pg<=pdf.numPages;pg++){
                    const page=await pdf.getPage(pg);
                    const vp=page.getViewport({scale:2});
                    const canvas=document.createElement('canvas');
                    canvas.width=vp.width;canvas.height=vp.height;
                    await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
                    imgs.push(canvas.toDataURL('image/png'));
                  }
                }
              } catch { imgs = [p.file_url]; }
            }
            setPiece(p); setPageImages(imgs); setCurrentPage(0); setMarkers([]);
            const pos = spot ? {page:spot.score_page, x:spot.score_x, y:spot.score_y} : {page:0,x:0.5,y:0.5};
            setTapPos(pos);
            const st = log?.strategy || 'scu';
            if(st==='icu') { setMarkers([]); setScreen('mark'); }
            else if(st==='mur') { setSavedExercise(null); setScreen('mur'); }
            else if(st==='scu') { setScuSpot({page:pos.page,x:pos.x,y:pos.y,piece_id:p.id||null}); setScreen('scu'); }
            else { setScreen('score'); }
          }}
        />
      )}

      {/* Strategy completion notes prompt */}
      {strategyNote && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.4)'}}
            onClick={()=>setStrategyNote(null)} />
          <div style={{
            position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
            zIndex:201,background:'#fff',borderRadius:16,
            width:'min(420px,90vw)',
            boxShadow:'0 12px 48px rgba(0,0,0,0.2)',
            display:'flex',flexDirection:'column',overflow:'hidden',
          }}>
            <div style={{padding:'20px 24px 8px',textAlign:'center'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.3rem',
                letterSpacing:'0.12em',color:'#1a1a1a'}}>
                {stratName(strategyNote.strategy).toUpperCase()} COMPLETE
              </div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                fontSize:'1rem',color:'#888',marginTop:4}}>
                Any notes about this session?
              </div>
            </div>
            <div style={{padding:'8px 20px 16px'}}>
              <textarea value={noteText} onChange={e=>setNoteText(e.target.value)}
                placeholder="What went well? What needs work? Any observations..."
                rows={4}
                style={{
                  width:'100%',padding:'12px 14px',borderRadius:10,
                  border:'1.5px solid #ddd',fontFamily:"'Cormorant Garamond',serif",
                  fontSize:'1.05rem',color:'#1a1a1a',resize:'vertical',
                  outline:'none',boxSizing:'border-box',lineHeight:1.5,
                }}
                onFocus={e=>{e.target.style.borderColor=C.accent}}
                onBlur={e=>{e.target.style.borderColor='#ddd'}}
              />
            </div>
            <div style={{padding:'0 20px 20px',display:'flex',gap:10}}>
              <button onClick={()=>setStrategyNote(null)} style={{
                flex:1,padding:'12px',borderRadius:10,
                background:'#f0f0f0',border:'none',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
                letterSpacing:'0.1em',color:'#666',cursor:'pointer',
              }}>SKIP</button>
              <button onClick={async ()=>{
                if(noteText.trim() && profile?.email) {
                  try {
                    // Find the most recent log for this strategy and update its notes
                    const r = await sbGet(`/rest/v1/practice_logs?user_email=eq.${encodeURIComponent(profile.email)}&piece_id=eq.${piece?.id||''}&strategy=eq.${strategyNote.strategy}&order=created_at.desc&limit=1`);
                    const rows = await r.json();
                    if(rows?.[0]?.id) {
                      await sbPatch(`/rest/v1/practice_logs?id=eq.${rows[0].id}`, {
                        notes: rows[0].notes ? rows[0].notes + '\n' + noteText.trim() : noteText.trim(),
                      });
                    } else {
                      // Fallback: create new entry if no recent log found
                      await sbPost('/rest/v1/practice_logs', {
                        user_email: profile.email,
                        piece_id: piece?.id||null,
                        spot_id: null,
                        strategy: strategyNote.strategy,
                        notes: noteText.trim(),
                        session_date: localDate(),
                      });
                    }
                  } catch(e){}
                }
                setStrategyNote(null);
              }} style={{
                flex:1,padding:'12px',borderRadius:10,
                background:noteText.trim()?C.accent:'#e0e0e0',border:'none',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
                letterSpacing:'0.1em',color:noteText.trim()?'#fff':'#999',cursor:'pointer',
              }}>SAVE NOTE</button>
            </div>
          </div>
        </>
      )}

      {/* Score view — home base for a piece */}
      {screen==='score' && (
        <ScoreViewScreen
          piece={piece} pageImages={pageImages} profile={profile}
          currentPage={currentPage} setCurrentPage={setCurrentPage}
          suppressPicker={!!strategyNote}
          sessionMode={sessionMode} setSessionMode={s=>{
            setSessionMode(s);
            if(s!=='interleaved') setInterleavedSpots([]);
          }}
          interleavedSpots={interleavedSpots}
          interleavedMode={interleavedMode} setInterleavedMode={setInterleavedMode}
          interleavedValue={interleavedValue} setInterleavedValue={setInterleavedValue}
          onRemoveSpot={id=>setInterleavedSpots(prev=>{
            const filtered=prev.filter(s=>s.id!==id);
            return filtered.map((s,i)=>({...s,id:i+1}));
          })}
          onBpmChange={(id,bpm)=>setInterleavedSpots(prev=>prev.map(s=>s.id===id?{...s,bpm}:s))}
          onStartSession={()=>setScreen('interleaved-session')}
          locateEx={locateEx}
          onBack={()=>{ setLocateEx(null); setInterleavedSpots([]); setScreen('library'); }}
          onLaunchStrategy={(strategy, pos)=>{
            setTapPos(pos);
            if(strategy==='icu') {
              setMarkers([]);
              setScreen('mark');
            } else if(strategy==='mur') {
              setSavedExercise(null);
              setScreen('mur');
            } else if(strategy==='scu') {
              setScuSpot({page:pos.page,x:pos.x,y:pos.y,piece_id:piece?.id||null});
              setScreen('scu');
            } else if(strategy==='journal') {
              setScreen('spot-log');
            }
          }}
          onTapPassage={async (pos)=>{
            if(locateEx) {
              setTapPos(pos);
              try {
                const res = await sbPatch(`/rest/v1/exercises?id=eq.${locateEx.id}`,{
                  piece_id: piece?.id||null,
                  score_page: pos.page,
                  score_y: pos.y,
                });
                if(!res.ok) {
                  const body = await res.text();
                  setLocateResult({status:'fail', msg:`Error ${res.status}: ${body||res.statusText}`});
                } else {
                  const vr = await sbGet(`/rest/v1/exercises?id=eq.${locateEx.id}&select=score_page,score_y`);
                  const rows = await vr.json();
                  const saved = rows?.[0];
                  if(saved && (saved.score_page != null || saved.score_y != null)) {
                    setLocateResult({status:'ok', exId: locateEx.id});
                  } else {
                    setLocateResult({status:'fail', msg:'Columns missing in Supabase — location was not saved.'});
                  }
                }
              } catch(e) {
                setLocateResult({status:'fail', msg:'Network error: ' + e.message});
              }
              setLocateEx(null);
              setScreen('library');
            } else if(sessionMode==='interleaved') {
              setInterleavedSpots(prev=>{
                
                return [...prev,{id:prev.length+1,page:pos.page,x:pos.x,y:pos.y,checks:0,bpm:null}];
              });
            } else {
              // Blocked mode: show spot setup (name or pick existing)
              // If tapped directly on a tempo tracker dot, skip naming
              if(pos.spotDirect) {
                setTapPos(pos);
                setScuSpot({page:pos.page, x:pos.x, y:pos.y, piece_id:piece?.id||null});
                setScreen('scu');
                return;
              }
              const prof = profile || getProfile();
              let nearby = [];
              if(prof.email && piece?.id) {
                try {
                  const r = await sbGet(`/rest/v1/practice_spots?user_email=eq.${encodeURIComponent(prof.email)}&piece_id=eq.${piece.id}&score_page=eq.${pos.page}`);
                  const allSpots = await r.json()||[];
                  nearby = allSpots.filter(s => Math.abs(s.score_y - pos.y) < 0.10 && (s.score_x == null || Math.abs(s.score_x - pos.x) < 0.10));
                } catch(e) { console.error('spot check failed', e); }
              }
              // Always show spot setup popover
              setSpotSetup({tapPos:pos, nearby, screenX: pos.screenX||0, screenY: pos.screenY||0});
              setSpotName('');
            }
          }}
        />
      )}

      {/* Spot setup — popover near tap */}
      {spotSetup && (()=>{
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const popW = Math.min(320, vw * 0.85);
        let left = Math.min(Math.max(spotSetup.screenX - popW/2, 8), vw - popW - 8);
        let top = spotSetup.screenY + 12;
        if(top + 200 > vh) top = Math.max(8, spotSetup.screenY - 220);
        return (
          <>
            <div onClick={()=>setSpotSetup(null)} style={{
              position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.15)'}}/>
            <div style={{
              position:'fixed',left,top,
              zIndex:401,background:'#fff',
              borderRadius:14,
              width:popW,
              boxShadow:'0 8px 32px rgba(0,0,0,0.18)',
              display:'flex',flexDirection:'column',overflow:'hidden',
              maxHeight: vh * 0.5,
            }}>
              {/* Existing spots nearby — shown first */}
              {spotSetup.nearby.length > 0 && (
                <div style={{padding:'12px 16px 8px'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
                    letterSpacing:'0.1em',color:'#999',marginBottom:6}}>
                    SELECT A SPOT
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:5,
                    maxHeight:'30vh',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
                    {spotSetup.nearby.map(sp=>(
                      <button key={sp.id} onClick={()=>{
                        setSpotSetup(null);
                        setSelectedSpot(sp);
                        setTapPos({page:sp.score_page, x:sp.score_x, y:sp.score_y, label:sp.label});
                        setShowOverlay(true);
                      }} style={{
                        display:'flex',alignItems:'center',gap:10,
                        padding:'10px 12px',background:'#fafafa',
                        border:`1.5px solid ${C.bord}`,borderRadius:10,
                        cursor:'pointer',textAlign:'left',width:'100%',
                        WebkitTapHighlightColor:'transparent',
                      }}>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',
                            letterSpacing:'0.06em',color:'#1a1a1a'}}>
                            {sp.label || 'Unlabeled spot'}
                          </div>
                          {sp.perf_tempo && (
                            <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',
                              color:'#999',marginTop:1}}>♩ = {sp.perf_tempo}</div>
                          )}
                        </div>
                        <span style={{color:'#ccc',fontSize:'1rem'}}>›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* New spot */}
              <div style={{padding: spotSetup.nearby.length > 0 ? '4px 16px 12px' : '12px 16px',
                borderTop: spotSetup.nearby.length > 0 ? `1px solid #f0f0f0` : 'none'}}>
                {spotSetup.nearby.length > 0 && (
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
                    letterSpacing:'0.1em',color:'#999',marginBottom:6}}>
                    OR NAME A NEW SPOT
                  </div>
                )}
                {spotSetup.nearby.length === 0 && (
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
                    letterSpacing:'0.1em',color:'#1a1a1a',marginBottom:6}}>
                    NAME THIS SPOT
                  </div>
                )}
                <div style={{display:'flex',gap:6}}>
                  <input type="text" value={spotName} onChange={e=>setSpotName(e.target.value)}
                    placeholder="e.g. m.32 run"
                    style={{
                      flex:1,padding:'10px 12px',borderRadius:8,
                      border:'1.5px solid #ddd',fontFamily:"'Cormorant Garamond',serif",
                      fontSize:'1rem',color:'#1a1a1a',outline:'none',boxSizing:'border-box',
                    }}
                    onFocus={e=>{e.target.style.borderColor=C.accent}}
                    onBlur={e=>{e.target.style.borderColor='#ddd'}}
                    onKeyDown={e=>{if(e.key==='Enter' && spotName.trim()){
                      setSpotSetup(null); setSelectedSpot(null);
                      setTapPos({...spotSetup.tapPos, label:spotName.trim()});
                      setShowOverlay(true);
                    }}}
                  />
                  <button onClick={()=>{
                    if(spotName.trim()){
                      setSpotSetup(null); setSelectedSpot(null);
                      setTapPos({...spotSetup.tapPos, label:spotName.trim()});
                      setShowOverlay(true);
                    }
                  }} style={{
                    padding:'10px 14px',borderRadius:8,
                    background:spotName.trim()?C.accent:'#e0e0e0',border:'none',
                    fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
                    letterSpacing:'0.08em',color:spotName.trim()?'#fff':'#999',
                    cursor:spotName.trim()?'pointer':'default',flexShrink:0,
                  }}>GO →</button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Strategy overlay — massed mode only */}
      {screen==='score' && showOverlay && !locateEx && sessionMode!=='interleaved' && (
        <StrategyOverlay
          piece={piece}
          profile={profile}
          tapPos={tapPos}
          selectedSpot={selectedSpot}
          onClose={()=>{setShowOverlay(false);setSelectedSpot(null);}}
          onICU={()=>{
            setShowOverlay(false);
            setMarkers([]);
            setScreen('mark');
          }}
          onRV={(ex)=>{
            setShowOverlay(false);
            setSavedExercise(ex||null);
            setScreen('mur');
          }}
          onSCU={()=>{
            setShowOverlay(false);
            setScuSpot({page:tapPos.page,x:tapPos.x,y:tapPos.y,piece_id:piece?.id||null});
            setScreen('scu');
          }}
          onUnguided={()=>{
            setShowOverlay(false);
            setUnguidedActive(true);
          }}
          onViewLog={()=>{
            setShowOverlay(false);
            setScreen('spot-log');
          }}
        />
      )}

      {/* Unguided practice — floating DONE button */}
      {screen==='score' && unguidedActive && (
        <div style={{
          position:'fixed',bottom:30,left:'50%',transform:'translateX(-50%)',
          zIndex:100,display:'flex',gap:10,alignItems:'center',
        }}>
          <div style={{
            background:'rgba(255,255,255,0.97)',backdropFilter:'blur(12px)',
            WebkitBackdropFilter:'blur(12px)',borderRadius:14,
            padding:'12px 20px',boxShadow:'0 4px 24px rgba(0,0,0,0.15)',
            border:'1px solid rgba(0,0,0,0.08)',
            display:'flex',alignItems:'center',gap:12,
          }}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
              fontSize:'1rem',color:'#666'}}>
              Practicing: {tapPos?.label || 'spot'}
            </div>
            <button onClick={async ()=>{
              // Log the unguided session
              const prof = profile || getProfile();
              if(prof.email) {
                try {
                  const sid = await findOrCreateSpot(prof.email, piece?.id, tapPos);
                  await sbPost('/rest/v1/practice_logs', {
                    user_email: prof.email,
                    spot_id: sid,
                    piece_id: piece?.id||null,
                    strategy: 'unguided',
                    session_date: localDate(),
                  });
                } catch(e){}
              }
              setUnguidedActive(false);
              setStrategyNote({strategy:'unguided'});
              setNoteText('');
            }} style={{
              padding:'10px 20px',borderRadius:10,
              background:'#888',border:'none',
              fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
              letterSpacing:'0.1em',color:'#fff',cursor:'pointer',
              WebkitTapHighlightColor:'transparent',
            }}>DONE ✓</button>
          </div>
        </div>
      )}

      {screen==='mark' && (
        <MarkerScreen
          piece={piece} pageImages={pageImages}
          currentPage={currentPage} setCurrentPage={setCurrentPage}
          markers={markers} setMarkers={setMarkers}
          onBack={()=>setScreen('score')}
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
          onDone={()=>{setShowOverlay(false);setStrategyNote({strategy:'icu'}); setNoteText(''); setScreen('score');}}
        />
      )}

      {screen==='mur' && (
        <MURScreen
          piece={piece} pageImages={pageImages}
          profile={profile} savedExercise={savedExercise}
          tapPos={tapPos}
          onBack={()=>{setShowOverlay(false); setScreen(piece?'score':'library');}}
          onDone={()=>{setShowOverlay(false); setStrategyNote({strategy:'mur'}); setNoteText(''); setScreen(piece?'score':'library');}}
        />
      )}

      {screen==='interleaved-session' && (
        <InterleavedSessionScreen
          pageImages={pageImages}
          spots={interleavedSpots}
          rotationMode={interleavedMode}
          rotationValue={interleavedValue}
          onBack={()=>{ setInterleavedSpots([]); setSessionMode('massed'); setScreen('score'); }}
          onDone={()=>{ setStrategyNote({strategy:'interleaved'}); setNoteText(''); setInterleavedSpots([]); setSessionMode('massed'); setScreen('score'); }}
        />
      )}

      {screen==='scu' && (
        <SlowClickUpScreen
          profile={profile}
          piece={piece}
          pageImages={pageImages}
          tapPos={tapPos}
          scuSpot={scuSpot}
          onBack={()=>setScreen('score')}
          onDone={()=>{setShowOverlay(false);setStrategyNote({strategy:'scu'}); setNoteText(''); setScreen('score');}}
        />
      )}

      {screen==='spot-log' && (
        <SpotLogScreen
          profile={profile}
          piece={piece}
          tapPos={tapPos}
          spotFilter={selectedSpot}
          onBack={()=>setScreen('score')}
          onPracticeAgain={({strategy, spot, piece:p})=>{
            const pos = {page:spot.score_page, x:spot.score_x, y:spot.score_y};
            setTapPos(pos);
            if(strategy==='icu') {
              setMarkers([]);
              setScreen('mark');
            } else if(strategy==='mur') {
              setSavedExercise(null);
              setScreen('mur');
            } else if(strategy==='scu') {
              setScuSpot({page:pos.page,x:pos.x,y:pos.y,piece_id:p?.id||piece?.id||null});
              setScreen('scu');
            }
          }}
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
function LibraryScreen({ profile, onSelectRepertoire, onLoadExercise, onLocateExercise, onPracticeAgain, onSignOut, locateResult, onLocateResultClear }) {
  const [tab,setTab]             = useState('pieces');
  const [pieces,setPieces]       = useState([]);
  const [exercises,setExercises] = useState([]);
  const [logs,setLogs]           = useState([]);
  const [spots,setSpots]         = useState([]);
  const [loading,setLoading]     = useState(true);
  const [showUpload,setShowUpload] = useState(false);
  const [title,setTitle]         = useState('');
  const [composer,setComposer]   = useState('');
  const [inst,setInst]           = useState(profile.instrument||'');
  const [uploading,setUploading] = useState(false);
  const [uploadMsg,setUploadMsg] = useState('');
  const [search,setSearch]       = useState('');
  const [confirmDel,setConfirmDel] = useState(null); // {type:'piece'|'exercise', id, title}
  const [deleting,setDeleting]   = useState(false);
  const [locatePicker,setLocatePicker] = useState(null);
  const [locateMsg,setLocateMsg]       = useState(null);
  const [loadingPdf,setLoadingPdf]     = useState(null);
  const [editingLog, setEditingLog]    = useState(null); // {id, notes}
  const [deletingLog, setDeletingLog]  = useState(null); // log id to confirm delete

  // React to locate result coming back from score screen
  useEffect(()=>{
    if(!locateResult) return;
    if(locateResult.status==='ok') {
      setLocateMsg({ok:true, text:'Exercise located — it will now appear when you tap that spot in the score.'});
      loadAll(); // re-fetch so the filter removes it cleanly
    } else {
      setLocateMsg({ok:false, text:locateResult.msg||'Failed to save location.'});
    }
    onLocateResultClear();
    const t = setTimeout(()=>setLocateMsg(null), 6000);
    return ()=>clearTimeout(t);
  },[locateResult]);
  const fileRef = useRef();
  const INSTRUMENTS = ['Flute','Oboe','Clarinet','Bassoon','Saxophone','Horn','Trumpet','Trombone','Tuba','Violin','Viola','Cello','Double Bass','Harp','Piano','Percussion','Voice','Other'];

  useEffect(()=>{ loadAll(); },[]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rp, re, rl, rs] = await Promise.all([
        sbGet(`/rest/v1/pieces?user_email=eq.${encodeURIComponent(profile.email)}&order=composer.asc,title.asc`),
        sbGet(`/rest/v1/exercises?user_email=eq.${encodeURIComponent(profile.email)}&order=created_at.desc`),
        sbGet(`/rest/v1/practice_logs?user_email=eq.${encodeURIComponent(profile.email)}&order=session_date.desc,created_at.desc&limit=100`),
        sbGet(`/rest/v1/practice_spots?user_email=eq.${encodeURIComponent(profile.email)}`),
      ]);
      setPieces(await rp.json()||[]);
      setExercises(await re.json()||[]);
      setLogs(await rl.json()||[]);
      setSpots(await rs.json()||[]);
    } catch { setPieces([]); setExercises([]); setLogs([]); setSpots([]); }
    setLoading(false);
  };

  const deletePiece = async (piece) => {
    setDeleting(true);
    try {
      // Cascade: delete all exercises for this piece first
      await sbDelete(`/rest/v1/exercises?piece_id=eq.${piece.id}`);
      // Delete the piece record
      await sbDelete(`/rest/v1/pieces?id=eq.${piece.id}`);
      setPieces(prev => prev.filter(p => p.id !== piece.id));
    } catch(e) { console.error('Delete failed', e); }
    setConfirmDel(null);
    setDeleting(false);
  };

  const deleteExercise = async (ex) => {
    setDeleting(true);
    try {
      await sbDelete(`/rest/v1/exercises?id=eq.${ex.id}`);
      setExercises(prev => prev.filter(e => e.id !== ex.id));
    } catch(e) { console.error('Delete failed', e); }
    setConfirmDel(null);
    setDeleting(false);
  };

  const openLocate = async (ex) => {
    // If exercise already has a piece_id, open that piece directly
    if(ex.piece_id) {
      const linked = pieces.find(p=>String(p.id)===String(ex.piece_id));
      if(linked) { openLocateWithPiece(ex, linked); return; }
    }
    // Otherwise show piece picker
    setLocatePicker(ex);
  };

  const openLocateWithPiece = async (ex, p) => {
    setLocatePicker(null);
    if(p.file_type==='image'){
      onLocateExercise(ex, p, [p.file_url]);
    } else {
      try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        if(!pdfjsLib) throw new Error('PDF.js not loaded');
        pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument(p.file_url).promise;
        const imgs=[];
        for(let pg=1;pg<=pdf.numPages;pg++){
          const page=await pdf.getPage(pg);
          const vp=page.getViewport({scale:2});
          const canvas=document.createElement('canvas');
          canvas.width=vp.width;canvas.height=vp.height;
          await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
          imgs.push(canvas.toDataURL('image/png'));
        }
        onLocateExercise(ex, p, imgs);
      } catch { onLocateExercise(ex, p, [p.file_url]); }
    }
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
      setLoadingPdf(piece.title||'Loading…');
      try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        if(!pdfjsLib) throw new Error('PDF.js not loaded');
        pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument(piece.file_url).promise;
        const imgs=[];
        for(let p=1;p<=pdf.numPages;p++){
          setLoadingPdf(`${piece.title||'Loading'} — page ${p} of ${pdf.numPages}`);
          const page=await pdf.getPage(p);
          const vp=page.getViewport({scale:2});
          const canvas=document.createElement('canvas');
          canvas.width=vp.width;canvas.height=vp.height;
          await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
          imgs.push(canvas.toDataURL('image/png'));
        }
        setLoadingPdf(null);
        onSelectRepertoire(piece,imgs);
      } catch {
        setLoadingPdf(null);
        onSelectRepertoire(piece,[piece.file_url]);
      }
    }
  };

  const tabStyle = active => ({
    fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'0.12em',
    padding:'10px 20px',cursor:'pointer',background:'none',border:'none',
    color:active?C.cream:C.muted,
    borderBottom:active?`2px solid ${C.accent}`:'2px solid transparent',
  });

  const q = search.toLowerCase().trim();
  const filteredPieces = q
    ? pieces.filter(p=>(p.title||'').toLowerCase().includes(q)||(p.composer||'').toLowerCase().includes(q))
    : pieces;

  // Group pieces by composer
  const grouped = filteredPieces.reduce((acc,p)=>{
    const key = p.composer?.trim()||'No composer listed';
    if(!acc[key]) acc[key]=[];
    acc[key].push(p);
    return acc;
  },{});

  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>

      {/* PDF loading overlay */}
      {loadingPdf && (
        <div style={{position:'fixed',inset:0,zIndex:900,
          background:'rgba(16,13,10,0.93)',
          display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',gap:24}}>
          <style>{`@keyframes pfn-spin{to{transform:rotate(360deg);}}`}</style>
          <div style={{width:52,height:52,borderRadius:'50%',
            border:`4px solid ${C.bord}`,borderTopColor:C.accent,
            animation:'pfn-spin 0.9s linear infinite'}}/>
          <div style={{textAlign:'center',maxWidth:300,padding:'0 20px'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
              letterSpacing:'0.18em',color:C.accent,marginBottom:6}}>LOADING SCORE</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
              fontSize:'1rem',color:C.muted,lineHeight:1.5}}>{loadingPdf}</div>
          </div>
        </div>
      )}

      <TopBar
        left={<span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',color:C.cream}}>{profile.name||profile.email}</span>}
        center="MY LIBRARY"
        right={<BackBtn onClick={onSignOut} label="SIGN OUT" />}
      />

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:`1px solid ${C.bord}`,flexShrink:0,background:'#fff'}}>
        <button style={tabStyle(tab==='pieces')} onClick={()=>{setTab('pieces');setSearch('');}}>Repertoire</button>
        <button style={tabStyle(tab==='log')} onClick={()=>{setTab('log');setSearch('');}}>Practice Journal</button>
      </div>

      {/* Locate result toast */}
      {locateMsg && (
        <div style={{padding:'12px 16px',flexShrink:0,
          background:locateMsg.ok?'rgba(61,176,106,0.15)':'rgba(229,53,53,0.18)',
          borderBottom:`1px solid ${locateMsg.ok?'#3db06a':'#e53535'}`,
          display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
              letterSpacing:'0.12em',color:locateMsg.ok?'#3db06a':'#e57373'}}>
              {locateMsg.ok ? '✓ ' : '⚠ '}{locateMsg.text}
            </span>
            <button onClick={()=>setLocateMsg(null)}
              style={{background:'none',border:'none',color:'#888',cursor:'pointer',
                fontSize:'1rem',flexShrink:0,padding:'0 4px'}}>✕</button>
          </div>
          {!locateMsg.ok && (
            <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.78rem',
              color:'#e5a835',lineHeight:1.6,background:'rgba(0,0,0,0.3)',padding:'8px 10px'}}>
              The exercises table is missing required columns. Run this in your Supabase SQL editor:<br/>
              <span style={{color:'#fff'}}>
                alter table exercises add column if not exists piece_id text;<br/>
                alter table exercises add column if not exists score_page integer;<br/>
                alter table exercises add column if not exists score_y float8;
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search bar */}
      <div style={{padding:'10px 16px',borderBottom:`1px solid ${C.bord}`,flexShrink:0,background:'#f5f5f5'}}>
        <input
          type="text"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder={tab==='pieces'?'Search by title or composer…':'Search exercises…'}
          style={{width:'100%',background:'#fff',border:`1px solid ${C.bord}`,color:C.cream,
            padding:'8px 12px',fontFamily:"'Inconsolata',monospace",fontSize:'0.95rem',
            outline:'none',boxSizing:'border-box'}}
        />
      </div>

      {/* Delete confirm modal */}
      {confirmDel && (
        <>
          <div onClick={()=>setConfirmDel(null)}
            style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.3)'}}/>
          <div style={{position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
            zIndex:501,background:'#fff',border:`1px solid ${C.bord}`,
            padding:28,width:320,display:'flex',flexDirection:'column',gap:14,
            boxShadow:'0 8px 40px rgba(0,0,0,0.15)'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
              letterSpacing:'0.18em',color:'#e57373'}}>
              {confirmDel.type==='piece' ? 'DELETE REPERTOIRE?' : 'DELETE EXERCISE?'}
            </div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',
              color:C.cream,lineHeight:1.5}}>
              <strong>"{confirmDel.title}"</strong>
              {confirmDel.type==='piece' &&
                <span style={{color:C.muted}}><br/>This will also delete all exercises associated with this piece.</span>
              }
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>confirmDel.type==='piece'?deletePiece(confirmDel):deleteExercise(confirmDel)}
                disabled={deleting}
                style={{flex:1,padding:'10px',background:'#e53535',border:'none',color:'white',
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
                  letterSpacing:'0.1em',cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
                {deleting?'DELETING…':'YES, DELETE'}
              </button>
              <button onClick={()=>setConfirmDel(null)}
                style={{flex:1,padding:'10px',background:'none',border:`1px solid ${C.bord}`,
                  color:C.cream,fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
                  letterSpacing:'0.1em',cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
                CANCEL
              </button>
            </div>
          </div>
        </>
      )}

      {/* Piece picker for locate */}
      {locatePicker && (
        <>
          <div onClick={()=>setLocatePicker(null)}
            style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.3)'}}/>
          <div style={{position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
            zIndex:501,background:'#fff',border:`1px solid ${C.bord}`,
            padding:24,width:340,display:'flex',flexDirection:'column',gap:12,
            boxShadow:'0 8px 40px rgba(0,0,0,0.15)'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
              letterSpacing:'0.18em',color:C.gold}}>SELECT A PIECE TO LOCATE IN</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
              fontSize:'0.9rem',color:C.muted,lineHeight:1.4}}>
              Tap a piece to open its score, then tap the spot where "<strong style={{color:C.cream,fontStyle:'normal'}}>{locatePicker.doc_name||'Untitled'}</strong>" lives.
            </div>
            <div style={{overflowY:'auto',maxHeight:'40vh',display:'flex',flexDirection:'column',gap:6}}>
              {pieces.length===0 && (
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                  fontSize:'0.9rem',color:C.muted,padding:'8px 0'}}>
                  No repertoire in library yet — add some first.
                </div>
              )}
              {pieces.map(p=>(
                <button key={p.id} onClick={()=>openLocateWithPiece(locatePicker,p)}
                  style={{textAlign:'left',padding:'14px 16px',background:'#fff',
                    border:`1px solid ${C.bord}`,cursor:'pointer',width:'100%',
                    WebkitTapHighlightColor:'transparent',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surf}
                  onMouseLeave={e=>e.currentTarget.style.background=C.panel}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.05rem',
                    letterSpacing:'0.08em',color:C.cream}}>{p.title||'Untitled'}</div>
                  {p.composer && <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.78rem',
                    color:C.muted,marginTop:3}}>{p.composer}</div>}
                </button>
              ))}
            </div>
            <button onClick={()=>setLocatePicker(null)}
              style={{padding:'10px',background:'none',border:`1px solid ${C.bord}`,
                color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
                letterSpacing:'0.1em',cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>CANCEL</button>
          </div>
        </>
      )}

      <div style={{flex:'1 1 0',overflowY:'auto',padding:16}}>
        {tab==='pieces' && (
          <>
            <button onClick={()=>setShowUpload(s=>!s)} style={{
              width:'100%',border:`2px dashed ${C.bord2}`,background:'none',
              color:C.cream,padding:18,fontFamily:"'Bebas Neue',sans-serif",
              fontSize:'1rem',letterSpacing:'0.12em',cursor:'pointer',marginBottom:16
            }}>+ ADD REPERTOIRE</button>

            {showUpload && (
              <div style={{background:'#fff',border:`1px solid ${C.bord}`,padding:20,marginBottom:20,display:'flex',flexDirection:'column',gap:14}}>
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
            {!loading && filteredPieces.length===0 && !showUpload && (
              <div style={{textAlign:'center',padding:60,color:C.muted,fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:'1.1rem'}}>
                {q ? 'No results matching "'+q+'"' : 'No pieces yet — add one above'}
              </div>
            )}

            {/* Grouped by composer */}
            {Object.entries(grouped).map(([comp, cpieces])=>(
              <div key={comp} style={{marginBottom:8}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
                  letterSpacing:'0.22em',color:C.muted,padding:'10px 4px 5px',
                  borderBottom:`1px solid ${C.bord}`}}>
                  {comp}
                </div>
                {cpieces.map(p=>(
                  <div key={p.id} style={{display:'flex',alignItems:'center',
                    borderBottom:`1px solid ${C.bord}`,
                    background:'transparent',transition:'background 0.1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div onClick={()=>openPiece(p)}
                      style={{flex:1,padding:'14px 14px',cursor:'pointer',minWidth:0}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',
                        letterSpacing:'0.08em',color:C.cream}}>{p.title||'Untitled'}</div>
                      <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.8rem',
                        color:C.muted,marginTop:3}}>
                        {[p.instrument,p.file_type?.toUpperCase()].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <button
                      onClick={e=>{e.stopPropagation();setConfirmDel({type:'piece',id:p.id,title:p.title||'Untitled',...p});}}
                      style={{padding:'14px 16px',background:'none',border:'none',
                        color:'#555',cursor:'pointer',fontSize:'1.1rem',flexShrink:0,
                        WebkitTapHighlightColor:'transparent'}}
                      title="Delete">✕</button>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {tab==='log' && (
          <>
            {/* Delete confirmation */}
            {deletingLog && (
              <>
                <div onClick={()=>setDeletingLog(null)} style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.25)'}}/>
                <div style={{position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
                  zIndex:501,background:'#fff',borderRadius:14,padding:'20px 24px',
                  width:'min(320px,85vw)',boxShadow:'0 8px 32px rgba(0,0,0,0.15)',
                  textAlign:'center'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',
                    letterSpacing:'0.1em',color:'#1a1a1a',marginBottom:8}}>DELETE THIS ENTRY?</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                    fontSize:'1rem',color:'#888',marginBottom:16}}>This cannot be undone.</div>
                  <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                    <button onClick={()=>setDeletingLog(null)} style={{
                      padding:'10px 20px',borderRadius:10,background:'#f0f0f0',border:'none',
                      fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',color:'#666',cursor:'pointer',
                    }}>CANCEL</button>
                    <button onClick={async ()=>{
                      try {
                        await sbDelete(`/rest/v1/practice_logs?id=eq.${deletingLog}`);
                        setLogs(prev=>prev.filter(l=>l.id!==deletingLog));
                      } catch(e){}
                      setDeletingLog(null);
                    }} style={{
                      padding:'10px 20px',borderRadius:10,background:'#e57373',border:'none',
                      fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',color:'#fff',cursor:'pointer',
                    }}>DELETE</button>
                  </div>
                </div>
              </>
            )}
            {loading && <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'1rem',color:C.muted,textAlign:'center',padding:40}}>Loading...</div>}
            {!loading && logs.length===0 && (
              <div style={{textAlign:'center',padding:60,color:C.muted,fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:'1.2rem'}}>
                No practice sessions yet. Start practicing to build your journal!
              </div>
            )}
            {!loading && (() => {
              const now = Date.now();
              const relDate = (d) => {
                if(!d) return '';
                const diff = Math.floor((now - new Date(d+'T12:00:00').getTime()) / 86400000);
                if(diff===0) return 'today';
                if(diff===1) return 'yesterday';
                if(diff<7) return `${diff} days ago`;
                if(diff<30) return `${Math.floor(diff/7)} week${Math.floor(diff/7)>1?'s':''} ago`;
                return `${Math.floor(diff/30)} month${Math.floor(diff/30)>1?'s':''} ago`;
              };
              const stratColor = s => s==='icu'?C.accent:s==='mur'?C.gold:s==='scu'?'#2eaa57':s==='recording'?'#dc3232':'#999';

              // Group: date → piece → spot → entries
              const byDate = {};
              logs.forEach(l => {
                const d = l.session_date || 'Unknown';
                if(!byDate[d]) byDate[d]=[];
                byDate[d].push(l);
              });

              return Object.entries(byDate).map(([date, dayLogs]) => {
                // Group by piece
                const byPiece = {};
                dayLogs.forEach(l => {
                  const pid = l.piece_id || 'unknown';
                  if(!byPiece[pid]) byPiece[pid]=[];
                  byPiece[pid].push(l);
                });

                return (
                  <div key={date} style={{marginBottom:20}}>
                    {/* Date header */}
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',
                      letterSpacing:'0.18em',color:'#1a1a1a',padding:'14px 4px 6px',
                      borderBottom:`2px solid ${C.bord}`,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                      <span>{new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</span>
                      <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.95rem',
                        letterSpacing:0,color:C.muted}}>{relDate(date)}</span>
                    </div>

                    {Object.entries(byPiece).map(([pid, pieceLogs]) => {
                      const p = pieces.find(p=>String(p.id)===String(pid));

                      // Group by spot
                      const bySpot = {};
                      pieceLogs.forEach(l => {
                        const sid = l.spot_id || 'none';
                        if(!bySpot[sid]) bySpot[sid]=[];
                        bySpot[sid].push(l);
                      });

                      return (
                        <div key={pid} style={{marginLeft:8,borderLeft:`3px solid ${C.bord}`,marginTop:8}}>
                          {/* Piece header */}
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',
                            letterSpacing:'0.1em',color:'#333',padding:'10px 12px 2px'}}>
                            {p?.title || 'Unknown piece'}
                            {p?.composer ? <span style={{color:'#aaa',fontWeight:400}}> — {p.composer}</span> : ''}
                          </div>

                          {Object.entries(bySpot).map(([sid, spotLogs]) => {
                            const sp = spots.find(s=>s.id===sid);
                            return (
                              <div key={sid} style={{marginLeft:12,marginBottom:8}}>
                                {/* Spot label */}
                                {sp?.label && (
                                  <div style={{fontFamily:"'Bebas Neue',sans-serif",
                                    fontSize:'1.05rem',letterSpacing:'0.06em',color:'#555',
                                    padding:'6px 12px 2px'}}>
                                    {sp.label}
                                  </div>
                                )}

                                {spotLogs.map(l => {
                                  const pct = (l.perf_tempo && l.max_tempo)
                                    ? Math.min(100, Math.round((l.max_tempo / l.perf_tempo) * 100))
                                    : null;
                                  const isEditing = editingLog?.id === l.id;
                                  return (
                                    <div key={l.id} style={{padding:'6px 12px',borderBottom:`1px solid #f0f0f0`,
                                      display:'flex',alignItems:'flex-start',gap:10}}>
                                      <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,
                                        background:stratColor(l.strategy),marginTop:5}}/>
                                      <div style={{flex:1,minWidth:0}}>
                                        <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.95rem',
                                          color:'#999',letterSpacing:'0.02em'}}>
                                          {stratName(l.strategy)}
                                          {l.start_tempo && l.max_tempo ? ` · ♩ ${l.start_tempo} → ${l.max_tempo}` : ''}
                                          {l.perf_tempo ? ` (goal: ${l.perf_tempo})` : ''}
                                          {l.reps_clean ? ` · ${l.reps_clean} clean` : ''}
                                        </div>
                                        {isEditing ? (
                                          <div style={{marginTop:4}}>
                                            <textarea value={editingLog.notes} onChange={e=>setEditingLog({...editingLog, notes:e.target.value})}
                                              rows={2} style={{
                                                width:'100%',padding:'8px 10px',borderRadius:8,
                                                border:'1.5px solid #ddd',fontFamily:"'Cormorant Garamond',serif",
                                                fontSize:'0.95rem',color:'#333',outline:'none',boxSizing:'border-box',
                                                resize:'vertical',lineHeight:1.4,
                                              }}
                                              onFocus={e=>{e.target.style.borderColor=C.accent}}
                                              onBlur={e=>{e.target.style.borderColor='#ddd'}}
                                            />
                                            <div style={{display:'flex',gap:6,marginTop:4}}>
                                              <button onClick={async ()=>{
                                                try {
                                                  await sbPatch(`/rest/v1/practice_logs?id=eq.${l.id}`, {notes: editingLog.notes||null});
                                                  setLogs(prev=>prev.map(lg=>lg.id===l.id?{...lg,notes:editingLog.notes}:lg));
                                                } catch(e){}
                                                setEditingLog(null);
                                              }} style={{
                                                padding:'4px 12px',borderRadius:6,background:C.accent,border:'none',
                                                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem',
                                                letterSpacing:'0.06em',color:'#fff',cursor:'pointer',
                                              }}>SAVE</button>
                                              <button onClick={()=>setEditingLog(null)} style={{
                                                padding:'4px 12px',borderRadius:6,background:'#f0f0f0',border:'none',
                                                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem',
                                                letterSpacing:'0.06em',color:'#666',cursor:'pointer',
                                              }}>CANCEL</button>
                                            </div>
                                          </div>
                                        ) : (<>
                                          {l.notes && stripAudioTag(l.notes) && (
                                            <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                                              fontSize:'1.05rem',color:'#555',marginTop:3,lineHeight:1.4}}>
                                              {stripAudioTag(l.notes)}
                                            </div>
                                          )}
                                          {parseAudioKey(l.notes) && (
                                            <AudioPlayBtn audioKey={parseAudioKey(l.notes)} />
                                          )}
                                        </>)}
                                      </div>
                                      {pct !== null && l.strategy === 'scu' && (
                                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',
                                          color:'#2eaa57',flexShrink:0}}>{pct}%</div>
                                      )}
                                      {!isEditing && (
                                        <div style={{display:'flex',gap:2,flexShrink:0,marginTop:2}}>
                                          <button onClick={()=>setEditingLog({id:l.id, notes:l.notes||''})} style={{
                                            background:'none',border:'none',color:'#bbb',cursor:'pointer',
                                            fontSize:'1.3rem',padding:'4px 8px',WebkitTapHighlightColor:'transparent',
                                          }}>✎</button>
                                          <button onClick={()=>setDeletingLog(l.id)} style={{
                                            background:'none',border:'none',color:'#dbb',cursor:'pointer',
                                            fontSize:'1.3rem',padding:'4px 8px',WebkitTapHighlightColor:'transparent',
                                          }}>✕</button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
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
  sessionMode, setSessionMode, interleavedSpots, interleavedMode, setInterleavedMode,
  interleavedValue, setInterleavedValue, onRemoveSpot, onBpmChange, onStartSession,
  locateEx, onBack, onTapPassage, onLaunchStrategy, profile, suppressPicker }) {

  const land = useOrientation();
  const totalPages = pageImages.length;
  const showTwo = land && totalPages > 1;
  const rightPage = currentPage + 1 < totalPages ? currentPage + 1 : null;
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  // Timer mode
  const [timerTotal, setTimerTotal] = useState(null); // seconds
  const [timerLeft, setTimerLeft] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [timerPos, setTimerPos] = useState({x:20, y:80}); // floating position
  const [timerExpanded, setTimerExpanded] = useState(false);
  const timerDragRef = useRef(null);
  const timerRef = useRef(null);
  const [customMin, setCustomMin] = useState('');

  // Floating metronome
  const [showMetro, setShowMetro] = useState(false);
  const [metroOn, setMetroOn] = useState(false);
  const [metroBpm, setMetroBpm] = useState(80);
  const [metroSubdiv, setMetroSubdiv] = useState(1);
  const [metroExpanded, setMetroExpanded] = useState(true);
  const [metroPos, setMetroPos] = useState({x:20, y:140});
  const metroDragRef = useRef(null);
  const placeMet = useRef(new Metro());

  useEffect(()=>{
    if(metroOn) placeMet.current.start(metroBpm); else placeMet.current.stop();
  },[metroOn]);
  useEffect(()=>{placeMet.current.setBpm(metroBpm);},[metroBpm]);
  useEffect(()=>()=>placeMet.current.stop(),[]);

  // Annotation (Apple Pencil)
  const [pencilMode, setPencilMode] = useState(false);
  const [pencilColor, setPencilColor] = useState('#e74c3c');
  const [pencilWidth, setPencilWidth] = useState(2);
  const [eraserOn, setEraserOn] = useState(false);
  const annotKey = piece?.id ? `pfn_annot_${piece.id}` : null;
  const [annotations, setAnnotations] = useState(()=>{
    if(!annotKey) return {};
    try { return JSON.parse(localStorage.getItem(annotKey)||'{}'); } catch { return {}; }
  });
  useEffect(()=>{
    if(annotKey) localStorage.setItem(annotKey, JSON.stringify(annotations));
  },[annotations, annotKey]);
  const annotCanvasRef = useRef(null);
  const annotDrawing = useRef(false);
  const annotCurrent = useRef([]);

  const drawAnnotations = useCallback((canvas, pageNum) => {
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const strokes = annotations[pageNum] || [];
    strokes.forEach(s => {
      if(s.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(s.points[0].x * canvas.width, s.points[0].y * canvas.height);
      for(let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * canvas.width, s.points[i].y * canvas.height);
      }
      ctx.stroke();
    });
  },[annotations]);

  // Redraw annotations when page changes or annotations update
  useEffect(()=>{
    if(annotCanvasRef.current) drawAnnotations(annotCanvasRef.current, currentPage);
  },[currentPage, annotations, drawAnnotations]);

  // Resize canvas when image resizes
  useEffect(()=>{
    if(!annotCanvasRef.current) return;
    const ro = new ResizeObserver(()=>{
      const el = annotCanvasRef.current;
      if(!el) return;
      const img = el.parentElement?.querySelector('img');
      if(img && img.clientWidth) {
        el.width = img.clientWidth; el.height = img.clientHeight;
        drawAnnotations(el, currentPage);
      }
    });
    const img = annotCanvasRef.current.parentElement?.querySelector('img');
    if(img) ro.observe(img);
    return ()=>ro.disconnect();
  },[currentPage, drawAnnotations]);

  // Pen drawing via document-level listeners (avoids event conflicts with touch handlers)
  const annotActiveRef = useRef(false); // true while pen is drawing

  useEffect(()=>{
    const onDown = (e) => {
      const isPen = e.pointerType === 'pen';
      if(!isPen && !pencilMode) return;
      const canvas = annotCanvasRef.current;
      if(!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      // Only draw if pointer is within the canvas bounds
      if(x < 0 || x > 1 || y < 0 || y > 1) return;

      if(isPen) { e.preventDefault(); e.stopPropagation(); }

      if(eraserOn && pencilMode) {
        setAnnotations(prev => {
          const strokes = prev[currentPage] || [];
          const filtered = strokes.filter(s =>
            !s.points.some(p => Math.abs(p.x - x) < 0.025 && Math.abs(p.y - y) < 0.025)
          );
          return {...prev, [currentPage]: filtered};
        });
        return;
      }

      annotActiveRef.current = true;
      annotDrawing.current = true;
      annotCurrent.current = [{x, y}];
    };

    const onMove = (e) => {
      if(!annotDrawing.current) return;
      const isPen = e.pointerType === 'pen';
      if(!isPen && !pencilMode) { annotDrawing.current = false; return; }
      if(eraserOn && pencilMode) return;
      const canvas = annotCanvasRef.current;
      if(!canvas) return;
      if(isPen) { e.preventDefault(); e.stopPropagation(); }
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      annotCurrent.current.push({x, y});

      const ctx = canvas.getContext('2d');
      const pts = annotCurrent.current;
      if(pts.length >= 2) {
        const prev = pts[pts.length - 2];
        ctx.beginPath();
        ctx.strokeStyle = pencilColor;
        ctx.lineWidth = pencilWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
        ctx.lineTo(x * canvas.width, y * canvas.height);
        ctx.stroke();
      }
    };

    const onUp = (e) => {
      if(!annotDrawing.current) return;
      annotDrawing.current = false;
      annotActiveRef.current = false;
      if(annotCurrent.current.length >= 2) {
        const newStroke = {points: [...annotCurrent.current], color: pencilColor, width: pencilWidth};
        setAnnotations(prev => ({
          ...prev,
          [currentPage]: [...(prev[currentPage]||[]), newStroke],
        }));
      }
      annotCurrent.current = [];
    };

    document.addEventListener('pointerdown', onDown, {capture: true});
    document.addEventListener('pointermove', onMove, {capture: true});
    document.addEventListener('pointerup', onUp, {capture: true});
    document.addEventListener('pointercancel', onUp, {capture: true});
    return () => {
      document.removeEventListener('pointerdown', onDown, {capture: true});
      document.removeEventListener('pointermove', onMove, {capture: true});
      document.removeEventListener('pointerup', onUp, {capture: true});
      document.removeEventListener('pointercancel', onUp, {capture: true});
    };
  },[pencilMode, eraserOn, pencilColor, pencilWidth, currentPage, annotations]);

  // Export annotated PDF
  const [exportingScore, setExportingScore] = useState(false);

  const exportAnnotatedPdf = async () => {
    setExportingScore(true);
    try {
      if(!window.jspdf) {
        await new Promise((res,rej)=>{
          const s=document.createElement('script');
          s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
          s.onload=res; s.onerror=rej;
          document.head.appendChild(s);
        });
      }
      const { jsPDF } = window.jspdf;

      // Helper: load image as blob URL to avoid CORS taint
      const loadImg = async (src) => {
        try {
          const resp = await fetch(src);
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const im = await new Promise((res,rej)=>{
            const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url;
          });
          return {im, url};
        } catch(e) {
          // Fallback: load directly (may taint canvas)
          const im = await new Promise((res,rej)=>{
            const i=new Image(); i.crossOrigin='anonymous';
            i.onload=()=>res(i); i.onerror=rej; i.src=src;
          });
          return {im, url:null};
        }
      };

      const first = await loadImg(pageImages[0]);
      const imgAspect = first.im.naturalWidth / first.im.naturalHeight;
      const pdf = new jsPDF({orientation: imgAspect>1?'landscape':'portrait', unit:'pt', format:'letter'});
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      if(first.url) URL.revokeObjectURL(first.url);

      for(let p=0; p<pageImages.length; p++) {
        if(p > 0) pdf.addPage();
        const {im: img, url: blobUrl} = await loadImg(pageImages[p]);
        const canvas = document.createElement('canvas');
        const scale = 2;
        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if(blobUrl) URL.revokeObjectURL(blobUrl);
        // Overlay annotations
        (annotations[p]||[]).forEach(s=>{
          if(s.points.length<2) return;
          ctx.beginPath();
          ctx.strokeStyle=s.color; ctx.lineWidth=s.width*scale;
          ctx.lineCap='round'; ctx.lineJoin='round';
          ctx.moveTo(s.points[0].x*canvas.width, s.points[0].y*canvas.height);
          for(let j=1;j<s.points.length;j++)
            ctx.lineTo(s.points[j].x*canvas.width, s.points[j].y*canvas.height);
          ctx.stroke();
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const fitH = pageW / (img.naturalWidth / img.naturalHeight);
        const finalW = fitH>pageH ? pageH*(img.naturalWidth/img.naturalHeight) : pageW;
        const finalH = fitH>pageH ? pageH : fitH;
        pdf.addImage(imgData, 'JPEG', (pageW-finalW)/2, (pageH-finalH)/2, finalW, finalH);
      }
      pdf.save(`${(piece?.title||'score').replace(/[^a-z0-9]/gi,'_')}_annotated.pdf`);
    } catch(e) {
      console.error('Annotated PDF export failed', e);
      alert('Export failed: '+(e.message||'Unknown error'));
    }
    setExportingScore(false);
  };

  // Audio recorder
  const [showRecorder, setShowRecorder] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordings, setRecordings] = useState([]); // [{url, blob, date, duration, mime}]
  const [playingIdx, setPlayingIdx] = useState(null);
  const [recDuration, setRecDuration] = useState(0);
  const [recPos, setRecPos] = useState({x: null, y: null}); // null = default position
  const recorderRef = useRef(null);
  const recChunks = useRef([]);
  const recTimer = useRef(null);
  const recStart = useRef(0);
  const audioRef = useRef(null);
  const recDragRef = useRef(null);

  const getRecMime = () => {
    // iOS Safari supports mp4, Chrome/Firefox support webm
    if(typeof MediaRecorder==='undefined') return null;
    for(const t of ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg']) {
      try { if(MediaRecorder.isTypeSupported(t)) return t; } catch(e){}
    }
    return '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mime = getRecMime();
      const opts = mime ? {mimeType:mime} : {};
      const mr = new MediaRecorder(stream, opts);
      recChunks.current = [];
      mr.ondataavailable = e => { if(e.data.size>0) recChunks.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t=>t.stop());
        const usedMime = mr.mimeType || mime || 'audio/webm';
        const blob = new Blob(recChunks.current, {type:usedMime});
        const url = URL.createObjectURL(blob);
        const dur = Math.round((Date.now()-recStart.current)/1000);
        setRecordings(prev=>[{url, blob, date:new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}), duration:dur, mime:usedMime}, ...prev]);
        setRecDuration(0);
      };
      recorderRef.current = mr;
      mr.start(250); // collect data every 250ms for reliability
      recStart.current = Date.now();
      setRecording(true);
      setRecDuration(0);
      recTimer.current = setInterval(()=>setRecDuration(d=>d+1), 1000);
    } catch(e) { console.error('mic access denied', e); }
  };

  const stopRecording = () => {
    if(recorderRef.current && recorderRef.current.state==='recording') {
      recorderRef.current.stop();
    }
    setRecording(false);
    clearInterval(recTimer.current);
  };

  const playRecording = (idx) => {
    if(audioRef.current) { audioRef.current.pause(); audioRef.current=null; }
    if(playingIdx===idx) { setPlayingIdx(null); return; }
    try {
      const a = new Audio();
      a.src = recordings[idx].url;
      a.onended = ()=>setPlayingIdx(null);
      a.onerror = ()=>setPlayingIdx(null);
      a.play().catch(()=>setPlayingIdx(null));
      audioRef.current = a;
      setPlayingIdx(idx);
    } catch(e) { setPlayingIdx(null); }
  };

  const deleteRecording = (idx) => {
    if(playingIdx===idx) { audioRef.current?.pause(); setPlayingIdx(null); }
    URL.revokeObjectURL(recordings[idx].url);
    setRecordings(prev=>prev.filter((_,i)=>i!==idx));
  };

  const [savingIdx, setSavingIdx] = useState(null);
  const [newRecSpotName, setNewRecSpotName] = useState('');

  const saveRecording = async (idx, spotId) => {
    const rec = recordings[idx];
    if(rec.saved) return;
    setSavingIdx(null);
    setNewRecSpotName('');
    try {
      const reader = new FileReader();
      const b64 = await new Promise((res,rej)=>{
        reader.onload=()=>res(reader.result);
        reader.onerror=rej;
        reader.readAsDataURL(rec.blob);
      });
      const audioKey = `pfn_audio_${Date.now()}`;
      localStorage.setItem(audioKey, b64);

      const prof = profile || getProfile();
      if(prof.email) {
        await sbPost('/rest/v1/practice_logs', {
          user_email: prof.email,
          piece_id: piece?.id||null,
          spot_id: spotId||null,
          strategy: 'recording',
          session_date: localDate(),
          notes: `🎙 Recording (${fmtDur(rec.duration)}) [audio:${audioKey}]`,
        });
      }
      setRecordings(prev=>prev.map((r,i)=>i===idx?{...r,saved:true}:r));
    } catch(e) { console.error('save recording failed', e); }
  };

  const saveRecordingNewSpot = async (idx, name) => {
    if(!name.trim()) return;
    const prof = profile || getProfile();
    if(!prof.email) return;
    try {
      const r = await sbPost('/rest/v1/practice_spots', {
        user_email: prof.email,
        piece_id: piece?.id||null,
        score_page: currentPage,
        score_x: 0.5,
        score_y: 0.5,
        label: name.trim(),
      });
      const rows = await r.json();
      const newId = rows?.[0]?.id || null;
      await saveRecording(idx, newId);
    } catch(e) { console.error('create spot failed', e); saveRecording(idx, null); }
  };

  const fmtDur = s => `${Math.floor(s/60)}:${(s%60)<10?'0':''}${s%60}`;

  useEffect(()=>{
    if(!timerRunning || timerLeft==null) return;
    if(timerLeft <= 0) {
      setTimerRunning(false);
      // Play alert tone
      try {
        const ctx = new (window.AudioContext||window.webkitAudioContext)();
        [0, 0.3, 0.6].forEach(t => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = 880; g.gain.value = 0.3;
          o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.15);
        });
      } catch(e){}
      if(navigator.vibrate) navigator.vibrate([200,100,200,100,200]);
      return;
    }
    timerRef.current = setTimeout(()=>setTimerLeft(prev=>prev-1), 1000);
    return ()=>clearTimeout(timerRef.current);
  },[timerRunning, timerLeft]);

  // Auto-pause timer on screen lock
  useEffect(()=>{
    const onVis = () => {
      if(document.hidden && timerRunning) setTimerRunning(false);
    };
    document.addEventListener('visibilitychange', onVis);
    return ()=>document.removeEventListener('visibilitychange', onVis);
  },[timerRunning]);

  const fmtTimer = (s) => {
    const m = Math.floor(s/60), sec = s%60;
    return `${m}:${sec<10?'0':''}${sec}`;
  };

  // Practice spots with per-strategy log summaries
  const [practiceSpots, setPracticeSpots] = useState([]);
  const [draggingSpot, setDraggingSpot] = useState(null);
  const dragStartRef = useRef(null);

  useEffect(()=>{
    if(!profile?.email || !piece?.id) return;
    (async ()=>{
      try {
        const [sr, lr, er] = await Promise.all([
          sbGet(`/rest/v1/practice_spots?user_email=eq.${encodeURIComponent(profile.email)}&piece_id=eq.${piece.id}`),
          sbGet(`/rest/v1/practice_logs?user_email=eq.${encodeURIComponent(profile.email)}&piece_id=eq.${piece.id}&order=session_date.desc,created_at.desc`),
          sbGet(`/rest/v1/exercises?user_email=eq.${encodeURIComponent(profile.email)}&order=created_at.desc&limit=50`),
        ]);
        const spots = await sr.json()||[];
        const logs = await lr.json()||[];
        const exercises = (await er.json()||[]).filter(ex =>
          String(ex.piece_id)===String(piece.id) && ex.score_page!=null && ex.score_y!=null
        );

        // For exercises that don't have a matching spot, create virtual spots
        const virtualSpots = [];
        exercises.forEach(ex => {
          const hasSpot = spots.some(s =>
            s.score_page === parseInt(ex.score_page) &&
            Math.abs(s.score_y - parseFloat(ex.score_y)) < 0.07
          );
          const hasVirtual = virtualSpots.some(v =>
            v.score_page === parseInt(ex.score_page) &&
            Math.abs(v.score_y - parseFloat(ex.score_y)) < 0.07
          );
          if(!hasSpot && !hasVirtual) {
            virtualSpots.push({
              id: 'ex-'+ex.id,
              score_page: parseInt(ex.score_page),
              score_x: 0.5,
              score_y: parseFloat(ex.score_y),
              label: ex.doc_name||null,
              virtual: true,
              strategies: { mur: { logs:[], best_tempo:0, last_date: ex.created_at?.split('T')[0]||null }},
              total_sessions: 1,
              scu_best: 0, scu_pct: null,
            });
          }
        });

        // Also check for orphaned logs (no spot_id) and match by proximity
        const orphanedLogs = logs.filter(l => !l.spot_id);

        const merged = spots.map(s => {
          // Logs linked by spot_id
          const sl = logs.filter(l=>l.spot_id===s.id);
          // Also grab orphaned logs near this spot
          orphanedLogs.forEach(l => {
            if(sl.some(existing => existing.id === l.id)) return;
            // Can't match by position without score coords on log, skip
          });
          // Check if any exercises are near this spot
          const nearExercises = exercises.filter(ex =>
            parseInt(ex.score_page) === s.score_page &&
            Math.abs(parseFloat(ex.score_y) - s.score_y) < 0.07
          );
          const strategies = {};
          sl.forEach(l=>{
            const st = l.strategy||'other';
            if(!strategies[st]) strategies[st] = {logs:[], best_tempo:0, last_date:null};
            strategies[st].logs.push(l);
            if(l.max_tempo && l.max_tempo > strategies[st].best_tempo) strategies[st].best_tempo = l.max_tempo;
            if(!strategies[st].last_date) strategies[st].last_date = l.session_date;
          });
          // Add MUR strategy if nearby exercises exist but no mur logs
          if(nearExercises.length > 0 && !strategies.mur) {
            strategies.mur = { logs:[], best_tempo:0, last_date: nearExercises[0].created_at?.split('T')[0]||null };
          }
          const scuBest = strategies.scu?.best_tempo || 0;
          const scuPct = (s.perf_tempo && scuBest) ? Math.min(100, Math.round((scuBest / s.perf_tempo) * 100)) : null;
          return { ...s, strategies, total_sessions: sl.length, scu_best: scuBest, scu_pct: scuPct };
        });
        setPracticeSpots([...merged, ...virtualSpots]);
      } catch(e) { console.error('spot fetch failed', e); }
    })();
  },[piece?.id]);

  const handleDotDragStart = (e, spot) => {
    e.stopPropagation();
    e.preventDefault();
    const touch = e.touches?.[0] || e;
    dragStartRef.current = { spotId: spot.id, startX: touch.clientX, startY: touch.clientY,
      origOx: spot.visual_offset_x||0, origOy: spot.visual_offset_y||0 };
    setDraggingSpot(spot.id);
  };

  const handleDotDragMove = useCallback((e) => {
    if(!dragStartRef.current) return;
    const touch = e.touches?.[0] || e;
    const container = document.querySelector('[data-score-container]');
    if(!container) return;
    const rect = container.getBoundingClientRect();
    const dx = touch.clientX - dragStartRef.current.startX;
    const dy = touch.clientY - dragStartRef.current.startY;
    setPracticeSpots(prev => prev.map(s =>
      s.id === dragStartRef.current.spotId
        ? { ...s, visual_offset_x: dragStartRef.current.origOx + dx/rect.width,
                   visual_offset_y: dragStartRef.current.origOy + dy/rect.height }
        : s
    ));
  },[]);

  const handleDotDragEnd = useCallback(()=>{
    if(!dragStartRef.current) return;
    const spotId = dragStartRef.current.spotId;
    const spot = practiceSpots.find(s=>s.id===spotId);
    if(spot) {
      sbPatch(`/rest/v1/practice_spots?id=eq.${spotId}`, {
        visual_offset_x: spot.visual_offset_x||0,
        visual_offset_y: spot.visual_offset_y||0,
      }).catch(()=>{});
    }
    dragStartRef.current = null;
    setDraggingSpot(null);
  },[practiceSpots]);

  // Document-level mouse handlers for dot dragging
  useEffect(()=>{
    if(!draggingSpot) return;
    const onMove = (e) => {
      if(!dragStartRef.current) return;
      const container = document.querySelector('[data-score-container]');
      if(!container) return;
      const rect = container.getBoundingClientRect();
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setPracticeSpots(prev => prev.map(s =>
        s.id === dragStartRef.current.spotId
          ? { ...s, visual_offset_x: dragStartRef.current.origOx + dx/rect.width,
                     visual_offset_y: dragStartRef.current.origOy + dy/rect.height }
          : s
      ));
    };
    const onUp = () => handleDotDragEnd();
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return ()=>{ document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  },[draggingSpot, handleDotDragEnd]);
  const isInterleaved = sessionMode === 'interleaved';
  const [showChrome, setShowChrome] = useState(true);
  const longPressRef = useRef(null);
  const touchRef = useRef({startX:0, startY:0, startTime:0, moved:false, longFired:false});
  const touchHandled = useRef(false); // prevent click after touch

  const handleTouchStart = (e) => {
    e.preventDefault();
    touchHandled.current = true;
    const t = e.touches[0];
    touchRef.current = {startX:t.clientX, startY:t.clientY, startTime:Date.now(), moved:false, longFired:false};
  };

  const handleTouchMove = (e) => {
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchRef.current.startX);
    const dy = Math.abs(t.clientY - touchRef.current.startY);
    if(dx > 10 || dy > 10) {
      touchRef.current.moved = true;
    }
  };

  const handleTouchEnd = (e) => {
    if(touchRef.current.longFired) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchRef.current.startX;
    const elapsed = Date.now() - touchRef.current.startTime;
    // Swipe detection — navigate pages
    if(Math.abs(dx) > 60 && elapsed < 400) {
      if(dx < 0 && currentPage < totalPages - 1) setCurrentPage(p=> showTwo ? p+2 : p+1);
      if(dx > 0 && currentPage > 0) setCurrentPage(p=> showTwo ? Math.max(0,p-2) : p-1);
      return;
    }
    // Quick tap
    if(!touchRef.current.moved && elapsed < 300) {
      if(isInterleaved || locateEx) {
        // Tap in interleaved/locate = place spot
        const img = e.target.closest('img');
        if(img) {
          const rect = img.getBoundingClientRect();
          const x = (endX - rect.left) / rect.width;
          const y = (endY - rect.top) / rect.height;
          const page = img.dataset.page ? parseInt(img.dataset.page) : currentPage;
          onTapPassage({page, x, y});
        }
      } else {
        // Blocked mode: tap = select spot
        const img = e.target.closest('img');
        if(img) {
          const rect = img.getBoundingClientRect();
          const x = (endX - rect.left) / rect.width;
          const y = (endY - rect.top) / rect.height;
          const page = img.dataset.page ? parseInt(img.dataset.page) : currentPage;
          onTapPassage({page, x, y, screenX: endX, screenY: endY});
        }
      }
    }
  };

  // Mouse click for desktop
  const handleClick = (e) => {
    if(touchHandled.current) { touchHandled.current = false; return; }
    if(isInterleaved || locateEx) {
      const img = e.target.closest('img');
      if(img) {
        const rect = img.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const page = img.dataset.page ? parseInt(img.dataset.page) : currentPage;
        onTapPassage({page, x, y});
      }
    } else {
      // Blocked mode: select spot
      const img = e.target.closest('img');
      if(img) {
        const rect = img.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const page = img.dataset.page ? parseInt(img.dataset.page) : currentPage;
        onTapPassage({page, x, y, screenX: e.clientX, screenY: e.clientY});
      }
    }
  };

  const handleLongTap = (e) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    const page = img.dataset.page ? parseInt(img.dataset.page) : currentPage;
    onTapPassage({ page, x, y });
  }; // used for interleaved/locate modes only

  const modeBtn = (mode, label) => (
    <button onClick={()=>{
      setSessionMode(mode);
      if(mode==='interleaved') setShowIntroModal(true);
    }} style={{
      fontFamily:"'Bebas Neue',sans-serif", fontSize:'0.9rem',
      letterSpacing:'0.1em', padding:'7px 18px', borderRadius:6,
      background: sessionMode===mode ? C.accent : '#f0f0f0',
      color: sessionMode===mode ? 'white' : '#666',
      border: `1px solid ${sessionMode===mode ? C.accent : '#ddd'}`,
      cursor:'pointer',
    }}>{label}</button>
  );

  // ── Interleaved placement layout ─────────────────────────────────────
  const [selectedSpotId, setSelectedSpotId] = useState(null);
  const [placeMetroBpm, setPlaceMetroBpm]   = useState(80);
  const [placeMetroOn,  setPlaceMetroOn]    = useState(false);
  const [promptSpotId,  setPromptSpotId]    = useState(null); // Y/N tempo dialog
  const [metroWaiting,  setMetroWaiting]    = useState(false); // metro bar glow
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showTempoTrackers, setShowTempoTrackers] = useState(false);
  const [showInstructions, setShowInstructions] = useState(()=>!localStorage.getItem('pfn_hideScoreInstructions')); // instructions on mode switch
  const placeMetro = useRef(new Metro());
  const bpmTimerRef    = useRef(null);
  const bpmIntervalRef = useRef(null);
  useEffect(()=>()=>placeMetro.current.stop(),[]);
  // Auto-select the most recently placed spot
  useEffect(()=>{
    if(interleavedSpots.length>0) {
      const newest = interleavedSpots[interleavedSpots.length-1];
      setSelectedSpotId(newest.id);
    }
  },[interleavedSpots.length]);


  const adjustBpm = delta => {
    const next = Math.min(220, Math.max(30, placeMetroBpm + delta));
    setPlaceMetroBpm(next);
    placeMetro.current.setBpm(next);
  };
  const toggleMetro = () => {
    const next = !placeMetroOn;
    setPlaceMetroOn(next);
    if(next) placeMetro.current.start(placeMetroBpm);
    else     placeMetro.current.stop();
  };
  const lockIn = () => {
    if(!selectedSpotId) return;
    onBpmChange(selectedSpotId, placeMetroBpm);
    setMetroWaiting(false);
  };

  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0,position:'relative',background:'#e8e5e0'}}>

      {/* Session type picker overlay */}
      {showSessionPicker && !locateEx && (
        <>
          <div onClick={()=>setShowSessionPicker(false)} style={{
            position:'absolute',inset:0,zIndex:50,background:'rgba(0,0,0,0.25)'}}/>
          <div style={{
            position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
            zIndex:51,background:'#fff',borderRadius:16,
            width:'min(420px,90vw)',
            boxShadow:'0 12px 48px rgba(0,0,0,0.15)',
            display:'flex',flexDirection:'column',overflow:'hidden',
          }}>
            <div style={{padding:'20px 24px 12px',textAlign:'center'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',
                letterSpacing:'0.12em',color:'#1a1a1a'}}>
                WHAT TYPE OF SESSION?
              </div>
            </div>
            <div style={{padding:'0 16px 20px',display:'flex',flexDirection:'column',gap:10}}>
              {/* Blocked */}
              <button onClick={()=>{
                setSessionMode('massed');
                setShowSessionPicker(false);
                setShowChrome(true);
              }} style={{
                padding:'16px 20px',background:'#fff',
                border:`2px solid ${C.accent}`,borderRadius:12,
                cursor:'pointer',textAlign:'left',width:'100%',
                WebkitTapHighlightColor:'transparent',
                display:'flex',flexDirection:'column',gap:4,
              }}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.15rem',
                  letterSpacing:'0.1em',color:C.accent}}>ONE PASSAGE AT A TIME</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                  fontSize:'1rem',color:'#666',lineHeight:1.4}}>
                  Blocked — ideal for early stages of learning
                </div>
              </button>

              {/* Interleaved */}
              <button onClick={()=>{
                setSessionMode('interleaved');
                setShowSessionPicker(false);
                setShowChrome(true);
                setShowIntroModal(true);
              }} style={{
                padding:'16px 20px',background:'#fff',
                border:'2px solid #4a9eff',borderRadius:12,
                cursor:'pointer',textAlign:'left',width:'100%',
                WebkitTapHighlightColor:'transparent',
                display:'flex',flexDirection:'column',gap:4,
              }}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.15rem',
                  letterSpacing:'0.1em',color:'#4a9eff'}}>ROTATE BETWEEN SEVERAL PASSAGES</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                  fontSize:'1rem',color:'#666',lineHeight:1.4}}>
                  Interleaved — ideal for later in the learning process
                </div>
              </button>

              {/* Memorization */}
              <div style={{
                padding:'16px 20px',background:'#fafafa',
                border:'1px solid #e0e0e0',borderRadius:12,
                opacity:0.5,
                display:'flex',flexDirection:'column',gap:4,
              }}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.15rem',
                  letterSpacing:'0.1em',color:'#999'}}>MEMORIZATION</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                  fontSize:'1rem',color:'#aaa',lineHeight:1.4}}>
                  Still in development
                </div>
              </div>

              {/* Mock Performance */}
              <div style={{
                padding:'16px 20px',background:'#fafafa',
                border:'1px solid #e0e0e0',borderRadius:12,
                opacity:0.5,
                display:'flex',flexDirection:'column',gap:4,
              }}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.15rem',
                  letterSpacing:'0.1em',color:'#999'}}>MOCK PERFORMANCE</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                  fontSize:'1rem',color:'#aaa',lineHeight:1.4}}>
                  Practice performing! — Still in development
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rotation mode picker */}
      {showIntroModal && (
        <>
          <div onClick={()=>{setShowIntroModal(false);if(!interleavedMode)setSessionMode('massed');}} style={{
            position:'absolute',inset:0,zIndex:50,background:'rgba(0,0,0,0.3)'}}/>
          <div style={{
            position:'absolute',left:'50%',top:'50%',
            transform:'translate(-50%,-50%)',
            zIndex:51,background:'#fff',
            borderRadius:16,padding:'24px',
            width:'min(400px, 90vw)',
            boxShadow:'0 12px 48px rgba(0,0,0,0.2)',
            display:'flex',flexDirection:'column',gap:14,
          }}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.3rem',
              letterSpacing:'0.12em',color:'#4a9eff',textAlign:'center'}}>
              HOW DO YOU WANT TO ROTATE?
            </div>
            {/* Timed */}
            <div style={{
              padding:'16px 20px',
              background: interleavedMode==='timed' ? 'rgba(74,158,255,0.06)' : '#fff',
              border: `2px solid ${interleavedMode==='timed' ? '#4a9eff' : '#e0e0e0'}`,
              borderRadius:12,display:'flex',flexDirection:'column',gap:8,
            }}>
              <button onClick={()=>{setInterleavedMode('timed');setInterleavedValue(3);}} style={{
                background:'none',border:'none',textAlign:'left',cursor:'pointer',
                padding:0,WebkitTapHighlightColor:'transparent',
              }}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.05rem',
                  letterSpacing:'0.1em',color:'#4a9eff'}}>TIMED ROTATION</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                  fontSize:'0.95rem',color:'#666',lineHeight:1.4,marginTop:2}}>
                  Practice freely, switch when time's up
                </div>
              </button>
              {interleavedMode==='timed' && (
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'0.95rem',color:'#888'}}>Switch every</span>
                  {[3,5,10,15].map(v=>(
                    <button key={v} onClick={()=>setInterleavedValue(v)} style={{
                      width:38,height:32,borderRadius:8,
                      background: interleavedValue===v ? '#4a9eff' : '#f5f5f5',
                      color: interleavedValue===v ? '#fff' : '#666',
                      border: `1px solid ${interleavedValue===v ? '#4a9eff' : '#ddd'}`,
                      fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
                      cursor:'pointer',WebkitTapHighlightColor:'transparent',
                    }}>{v}</button>
                  ))}
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'0.95rem',color:'#888'}}>min</span>
                </div>
              )}
            </div>
            {/* Consistency Goal */}
            <div style={{
              padding:'16px 20px',
              background: interleavedMode==='consistency' ? 'rgba(74,158,255,0.06)' : '#fff',
              border: `2px solid ${interleavedMode==='consistency' ? '#4a9eff' : '#e0e0e0'}`,
              borderRadius:12,display:'flex',flexDirection:'column',gap:8,
            }}>
              <button onClick={()=>{setInterleavedMode('consistency');setInterleavedValue(5);}} style={{
                background:'none',border:'none',textAlign:'left',cursor:'pointer',
                padding:0,WebkitTapHighlightColor:'transparent',
              }}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.05rem',
                  letterSpacing:'0.1em',color:'#4a9eff'}}>CONSISTENCY GOAL</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                  fontSize:'0.95rem',color:'#666',lineHeight:1.4,marginTop:2}}>
                  Move on after getting it right X times in a row
                </div>
              </button>
              {interleavedMode==='consistency' && (
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'0.95rem',color:'#888'}}>Correct in a row</span>
                  {[3,5,7,10].map(v=>(
                    <button key={v} onClick={()=>setInterleavedValue(v)} style={{
                      width:38,height:32,borderRadius:8,
                      background: interleavedValue===v ? '#4a9eff' : '#f5f5f5',
                      color: interleavedValue===v ? '#fff' : '#666',
                      border: `1px solid ${interleavedValue===v ? '#4a9eff' : '#ddd'}`,
                      fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
                      cursor:'pointer',WebkitTapHighlightColor:'transparent',
                    }}>{v}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={()=>{if(interleavedMode) setShowIntroModal(false);}} style={{
              padding:'12px 0',
              background: interleavedMode ? '#4a9eff' : '#e0e0e0',
              border:'none',color: interleavedMode ? 'white' : '#999',
              fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
              letterSpacing:'0.12em',cursor: interleavedMode ? 'pointer' : 'default',
              borderRadius:10,WebkitTapHighlightColor:'transparent',
            }}>PLACE SPOTS ON SCORE →</button>
          </div>
        </>
      )}

      {/* Floating placement instructions */}
      {isInterleaved && !showIntroModal && interleavedSpots.length < 3 && (
        <div style={{
          position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',
          zIndex:30,background:'rgba(255,255,255,0.95)',
          backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',
          borderRadius:14,padding:'14px 22px',
          boxShadow:'0 4px 24px rgba(0,0,0,0.12)',
          border:'1px solid rgba(74,158,255,0.2)',
          maxWidth:'min(340px,85vw)',textAlign:'center',
        }}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
            letterSpacing:'0.1em',color:'#4a9eff',marginBottom:4}}>
            {interleavedSpots.length === 0 ? 'TAP YOUR SCORE TO PLACE SPOTS' : `${interleavedSpots.length} SPOT${interleavedSpots.length>1?'S':''} PLACED`}
          </div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
            fontSize:'0.95rem',color:'#888',lineHeight:1.4}}>
            Tap near each passage you want to practice.
          </div>
        </div>
      )}

      {/* Score — fills entire screen, behind everything */}

      {/* Instruction card — blocked mode */}
      {showInstructions && !isInterleaved && !locateEx && !showSessionPicker && (
        <div style={{
          position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
          zIndex:30,background:'rgba(255,255,255,0.98)',
          backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',
          borderRadius:20,padding:'28px 32px',
          boxShadow:'0 8px 40px rgba(0,0,0,0.15)',
          border:`2px solid ${C.accent}`,
          maxWidth:'min(400px,88vw)',textAlign:'center',
        }}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.3rem',
            letterSpacing:'0.12em',color:C.accent,marginBottom:12}}>
            GETTING STARTED
          </div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",
            fontSize:'1.15rem',color:'#444',lineHeight:1.6}}>
            Tap the beginning of a passage to practice. Name the spot to save exercises and update your practice journal.
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'center',marginTop:18}}>
            <button onClick={()=>setShowInstructions(false)} style={{
              padding:'10px 24px',borderRadius:10,background:C.accent,border:'none',
              fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
              letterSpacing:'0.1em',color:'#fff',cursor:'pointer',
            }}>GOT IT</button>
            <button onClick={()=>{setShowInstructions(false);localStorage.setItem('pfn_hideScoreInstructions','1');}} style={{
              padding:'10px 20px',borderRadius:10,background:'transparent',border:'none',
              fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
              fontSize:'0.95rem',color:'#aaa',cursor:'pointer',
            }}>Don't show again</button>
          </div>
        </div>
      )}

      {/* Timer picker modal */}
      {showTimerPicker && (
        <>
          <div onClick={()=>setShowTimerPicker(false)} style={{
            position:'absolute',inset:0,zIndex:50,background:'rgba(0,0,0,0.25)'}}/>
          <div style={{
            position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
            zIndex:51,background:'#fff',borderRadius:16,
            width:'min(360px,85vw)',
            boxShadow:'0 12px 48px rgba(0,0,0,0.15)',
            display:'flex',flexDirection:'column',overflow:'hidden',
          }}>
            <div style={{padding:'20px 24px 12px',textAlign:'center'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',
                letterSpacing:'0.12em',color:'#1a1a1a'}}>SET TIMER</div>
            </div>
            <div style={{padding:'0 16px 12px',display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center'}}>
              {[3,5,10,15,20,30,45,60].map(min=>(
                <button key={min} onClick={()=>{
                  setTimerTotal(min*60); setTimerLeft(min*60);
                  setTimerRunning(true); setShowTimerPicker(false); setCustomMin('');
                }} style={{
                  width:58,height:58,borderRadius:10,
                  background:'#fff',border:'2px solid #4a78ff',
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.3rem',
                  color:'#4a78ff',cursor:'pointer',WebkitTapHighlightColor:'transparent',
                  display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                }}>
                  <span>{min}</span>
                  <span style={{fontSize:'0.5rem',letterSpacing:'0.1em',color:'#888'}}>MIN</span>
                </button>
              ))}
            </div>
            <div style={{padding:'0 16px 20px',display:'flex',gap:8,alignItems:'center',justifyContent:'center'}}>
              <input type="number" inputMode="numeric" placeholder="Custom" value={customMin}
                onChange={e=>setCustomMin(e.target.value)}
                style={{
                  width:80,padding:'10px 12px',borderRadius:10,
                  border:'2px solid #ccc',fontFamily:"'Bebas Neue',sans-serif",
                  fontSize:'1.2rem',textAlign:'center',color:'#1a1a1a',outline:'none',
                }}
                onFocus={e=>{e.target.style.borderColor='#4a78ff'}}
                onBlur={e=>{e.target.style.borderColor='#ccc'}}
              />
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
                letterSpacing:'0.1em',color:'#888'}}>MIN</span>
              <button onClick={()=>{
                const m=parseInt(customMin);
                if(m&&m>0){setTimerTotal(m*60);setTimerLeft(m*60);setTimerRunning(true);setShowTimerPicker(false);setCustomMin('');}
              }} style={{
                padding:'10px 18px',borderRadius:10,
                background:customMin&&parseInt(customMin)>0?'#4a78ff':'#e0e0e0',border:'none',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',letterSpacing:'0.1em',
                color:customMin&&parseInt(customMin)>0?'#fff':'#999',
                cursor:customMin&&parseInt(customMin)>0?'pointer':'default',
              }}>GO</button>
            </div>
          </div>
        </>
      )}

      {/* Floating draggable timer pill */}
      {timerLeft != null && timerLeft > 0 && (
        <div
          onTouchStart={e=>{
            const t=e.touches[0];
            timerDragRef.current={sx:t.clientX-timerPos.x, sy:t.clientY-timerPos.y, moved:false};
          }}
          onTouchMove={e=>{
            if(!timerDragRef.current) return;
            e.preventDefault();
            const t=e.touches[0];
            timerDragRef.current.moved=true;
            setTimerPos({x:t.clientX-timerDragRef.current.sx, y:t.clientY-timerDragRef.current.sy});
          }}
          onTouchEnd={(e)=>{
            if(timerDragRef.current && !timerDragRef.current.moved) {
              // Only toggle if tap was directly on the pill, not on a child button
              if(e.target.tagName!=='BUTTON') setTimerExpanded(p=>!p);
            }
            timerDragRef.current=null;
          }}
          style={{
            position:'absolute',left:timerPos.x,top:timerPos.y,zIndex:40,
            background: timerRunning
              ? 'rgba(74,120,255,0.85)'
              : 'rgba(150,150,150,0.85)',
            backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',
            borderRadius: timerExpanded ? 16 : 24,
            padding: timerExpanded ? '12px 16px' : '8px 16px',
            boxShadow:'0 4px 20px rgba(0,0,0,0.2)',
            cursor:'grab',touchAction:'none',userSelect:'none',WebkitUserSelect:'none',
            display:'flex',flexDirection: timerExpanded?'column':'row',
            alignItems:'center',gap: timerExpanded?8:10,
            transition:'border-radius 0.2s, padding 0.2s',
          }}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",
            fontSize: timerExpanded?'2rem':'1.3rem',
            letterSpacing:'0.05em',color:'#fff',lineHeight:1}}>
            {fmtTimer(timerLeft)}
          </div>
          {!timerExpanded && (
            <div style={{width:30,height:3,background:'rgba(255,255,255,0.4)',borderRadius:2,overflow:'hidden'}}>
              <div style={{height:'100%',background:'rgba(255,255,255,0.8)',borderRadius:2,
                width:`${((timerTotal-timerLeft)/timerTotal)*100}%`}}/>
            </div>
          )}
          {timerExpanded && (<>
            <div style={{width:'100%',height:3,background:'rgba(255,255,255,0.3)',borderRadius:2,overflow:'hidden'}}>
              <div style={{height:'100%',background:'rgba(255,255,255,0.8)',borderRadius:2,
                width:`${((timerTotal-timerLeft)/timerTotal)*100}%`}}/>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={e=>{e.stopPropagation();setTimerRunning(p=>!p);}} style={{
                background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.4)',
                borderRadius:8,padding:'4px 14px',fontFamily:"'Bebas Neue',sans-serif",
                fontSize:'0.75rem',letterSpacing:'0.08em',color:'#fff',cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>{timerRunning?'PAUSE':'RESUME'}</button>
              <button onClick={e=>{e.stopPropagation();setTimerLeft(null);setTimerTotal(null);setTimerRunning(false);setTimerExpanded(false);}} style={{
                background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.4)',
                borderRadius:8,padding:'4px 10px',fontFamily:"'Bebas Neue',sans-serif",
                fontSize:'0.75rem',letterSpacing:'0.08em',color:'#fff',cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>CANCEL</button>
            </div>
          </>)}
        </div>
      )}

      {/* Floating draggable metronome */}
      {showMetro && (
        <div
          onTouchStart={e=>{
            const t=e.touches[0];
            metroDragRef.current={sx:t.clientX-metroPos.x, sy:t.clientY-metroPos.y, moved:false};
          }}
          onTouchMove={e=>{
            if(!metroDragRef.current) return;
            e.preventDefault();
            const t=e.touches[0];
            metroDragRef.current.moved=true;
            setMetroPos({x:t.clientX-metroDragRef.current.sx, y:t.clientY-metroDragRef.current.sy});
          }}
          onTouchEnd={(e)=>{
            if(metroDragRef.current && !metroDragRef.current.moved) {
              if(e.target.tagName!=='BUTTON') setMetroExpanded(p=>!p);
            }
            metroDragRef.current=null;
          }}
          style={{
            position:'absolute',left:metroPos.x,top:metroPos.y,zIndex:40,
            background: metroOn
              ? 'rgba(168,85,200,0.9)'
              : 'rgba(150,120,170,0.85)',
            backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',
            borderRadius: metroExpanded ? 16 : 24,
            padding: metroExpanded ? '12px 14px' : '8px 14px',
            boxShadow:'0 4px 20px rgba(0,0,0,0.2)',
            cursor:'grab',touchAction:'none',userSelect:'none',WebkitUserSelect:'none',
            display:'flex',flexDirection: metroExpanded?'column':'row',
            alignItems:'center',gap: metroExpanded?8:8,
            transition:'border-radius 0.2s, padding 0.2s',
          }}>
          {/* BPM display */}
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <button onClick={e=>{e.stopPropagation();setMetroOn(m=>!m);}} style={{
              background: metroOn ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
              border:'1px solid rgba(255,255,255,0.4)',
              borderRadius:8,width:32,height:32,
              color:'#fff',fontSize:'0.9rem',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              WebkitTapHighlightColor:'transparent',
            }}>{metroOn?'⏸':'▶'}</button>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",
              fontSize: metroExpanded?'1.6rem':'1.2rem',
              letterSpacing:'0.05em',color:'#fff',lineHeight:1}}>
              ♩={metroBpm}
            </div>
          </div>
          {metroExpanded && (<>
            {/* BPM controls */}
            <div style={{display:'flex',gap:4,alignItems:'center'}}>
              <button onClick={e=>{e.stopPropagation();setMetroBpm(b=>Math.max(20,b-10));}} style={{
                background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',
                borderRadius:6,padding:'3px 8px',color:'#fff',cursor:'pointer',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem',
                WebkitTapHighlightColor:'transparent',
              }}>−10</button>
              <button onClick={e=>{e.stopPropagation();setMetroBpm(b=>Math.max(20,b-1));}} style={{
                background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',
                borderRadius:6,padding:'3px 10px',color:'#fff',cursor:'pointer',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
                WebkitTapHighlightColor:'transparent',
              }}>−</button>
              <button onClick={e=>{e.stopPropagation();setMetroBpm(b=>Math.min(300,b+1));}} style={{
                background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',
                borderRadius:6,padding:'3px 10px',color:'#fff',cursor:'pointer',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
                WebkitTapHighlightColor:'transparent',
              }}>+</button>
              <button onClick={e=>{e.stopPropagation();setMetroBpm(b=>Math.min(300,b+10));}} style={{
                background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',
                borderRadius:6,padding:'3px 8px',color:'#fff',cursor:'pointer',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem',
                WebkitTapHighlightColor:'transparent',
              }}>+10</button>
            </div>
            {/* Subdivisions */}
            <div style={{display:'flex',gap:4}}>
              {[{v:1,label:'♩'},{v:2,label:'♪♪'},{v:3,label:'♪³'}].map(({v,label})=>(
                <button key={v} onClick={e=>{
                  e.stopPropagation();
                  setMetroSubdiv(v);
                  placeMet.current.setSubdiv(v);
                  if(metroOn) placeMet.current.start(metroBpm);
                }} style={{
                  background: metroSubdiv===v ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: `1px solid ${metroSubdiv===v ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)'}`,
                  padding:'4px 10px',fontFamily:"'Bebas Neue',sans-serif",
                  fontSize:'0.75rem',cursor:'pointer',borderRadius:6,
                  WebkitTapHighlightColor:'transparent',
                }}>{label}</button>
              ))}
            </div>
            {/* Close */}
            <button onClick={e=>{e.stopPropagation();setMetroOn(false);setShowMetro(false);}} style={{
              background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',
              borderRadius:6,padding:'4px 12px',color:'#fff',cursor:'pointer',
              fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',letterSpacing:'0.06em',
              WebkitTapHighlightColor:'transparent',
            }}>CLOSE</button>
          </>)}
        </div>
      )}

      {/* Timer done overlay */}
      {timerLeft != null && timerLeft <= 0 && (
        <div style={{
          position:'absolute',inset:0,zIndex:60,
          background:'rgba(0,0,0,0.5)',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}>
          <div style={{
            background:'#fff',borderRadius:16,padding:'32px 40px',
            textAlign:'center',boxShadow:'0 12px 48px rgba(0,0,0,0.2)',
            maxWidth:'85vw',
          }}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'2rem',
              letterSpacing:'0.12em',color:'#4a78ff',marginBottom:8}}>TIME'S UP</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
              fontSize:'1.1rem',color:'#666',marginBottom:20}}>
              {Math.round(timerTotal/60)} minute{timerTotal>=120?'s':''} completed
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>{setTimerLeft(null);setTimerTotal(null);}} style={{
                padding:'10px 24px',borderRadius:10,background:'#f0f0f0',border:'none',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
                letterSpacing:'0.1em',color:'#666',cursor:'pointer',
              }}>DONE</button>
              <button onClick={()=>{setTimerLeft(timerTotal);setTimerRunning(true);}} style={{
                padding:'10px 24px',borderRadius:10,background:'#4a78ff',border:'none',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
                letterSpacing:'0.1em',color:'#fff',cursor:'pointer',
              }}>RESTART</button>
            </div>
          </div>
        </div>
      )}

      {/* Pencil annotation toolbar */}

      {/* Floating recorder */}
      {showRecorder && (
        <div
          onTouchStart={e=>{
            const t=e.touches[0];
            const pos = recPos.x!=null ? recPos : {x:window.innerWidth-236, y:window.innerHeight-200};
            recDragRef.current={sx:t.clientX-pos.x, sy:t.clientY-pos.y, moved:false};
            if(recPos.x==null) setRecPos(pos);
          }}
          onTouchMove={e=>{
            if(!recDragRef.current) return;
            if(e.target.tagName==='BUTTON') return;
            e.preventDefault();
            const t=e.touches[0];
            recDragRef.current.moved=true;
            setRecPos({x:t.clientX-recDragRef.current.sx, y:t.clientY-recDragRef.current.sy});
          }}
          onTouchEnd={()=>{recDragRef.current=null;}}
          style={{
            position:'absolute',
            ...(recPos.x!=null ? {left:recPos.x, top:recPos.y} : {bottom: pencilMode ? 90 : 20, right:16}),
            zIndex:36,background:'rgba(50,50,50,0.95)',
            backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',
            borderRadius:16,padding:'14px 16px',
            boxShadow:'0 4px 24px rgba(0,0,0,0.25)',
            width:220,display:'flex',flexDirection:'column',gap:10,
            cursor:'grab',touchAction:'none',userSelect:'none',WebkitUserSelect:'none',
          }}>
          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
              letterSpacing:'0.1em',color:'#fff'}}>
              🎙 RECORDER
            </div>
            <button onClick={()=>{if(recording)stopRecording();setShowRecorder(false);}} style={{
              background:'none',border:'none',color:'#999',fontSize:'1rem',
              cursor:'pointer',padding:'0 2px',WebkitTapHighlightColor:'transparent',
            }}>✕</button>
          </div>

          {/* Record controls */}
          <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'center'}}>
            {!recording ? (
              <button onClick={startRecording} style={{
                width:52,height:52,borderRadius:'50%',
                background:'#dc3232',border:'3px solid rgba(255,255,255,0.3)',
                cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                WebkitTapHighlightColor:'transparent',
                boxShadow:'0 0 0 4px rgba(220,50,50,0.3)',
              }}>
                <div style={{width:20,height:20,borderRadius:'50%',background:'#fff'}}/>
              </button>
            ) : (
              <button onClick={stopRecording} style={{
                width:52,height:52,borderRadius:'50%',
                background:'#dc3232',border:'3px solid rgba(255,255,255,0.3)',
                cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                WebkitTapHighlightColor:'transparent',
                animation:'pulse 1.5s infinite',
                boxShadow:'0 0 0 4px rgba(220,50,50,0.3)',
              }}>
                <div style={{width:18,height:18,borderRadius:3,background:'#fff'}}/>
              </button>
            )}
            {recording && (
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',
                color:'#dc3232',letterSpacing:'0.05em',minWidth:50}}>
                {fmtDur(recDuration)}
              </div>
            )}
          </div>

          {/* Recordings list */}
          {recordings.length > 0 && (
            <div style={{display:'flex',flexDirection:'column',gap:4,
              maxHeight:150,overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
              {recordings.map((r,i)=>(
                <div key={i} style={{display:'flex',flexDirection:'column',gap:4,
                  padding:'6px 8px',background:'rgba(255,255,255,0.08)',borderRadius:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button onClick={()=>playRecording(i)} style={{
                      width:28,height:28,borderRadius:'50%',
                      background: playingIdx===i ? '#dc3232' : 'rgba(255,255,255,0.15)',
                      border:'1px solid rgba(255,255,255,0.3)',
                      color:'#fff',fontSize:'0.75rem',cursor:'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      WebkitTapHighlightColor:'transparent',
                    }}>{playingIdx===i?'⏸':'▶'}</button>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem',
                        color:'#fff',letterSpacing:'0.06em'}}>
                        {r.date} · {fmtDur(r.duration)}
                      </div>
                    </div>
                    <button onClick={()=>deleteRecording(i)} style={{
                      background:'none',border:'none',color:'#888',fontSize:'0.9rem',
                      cursor:'pointer',padding:'2px 4px',WebkitTapHighlightColor:'transparent',
                    }}>✕</button>
                    <button onClick={()=>{
                      if(r.saved) return;
                      setSavingIdx(savingIdx===i ? null : i);
                      setNewRecSpotName('');
                    }} style={{
                      background: r.saved ? 'rgba(46,170,87,0.3)' : 'rgba(255,255,255,0.15)',
                      border:'1px solid rgba(255,255,255,0.3)',
                      borderRadius:6,padding:'3px 8px',
                      fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.6rem',
                      letterSpacing:'0.06em',color:'#fff',cursor: r.saved?'default':'pointer',
                      WebkitTapHighlightColor:'transparent',
                    }}>{r.saved?'✓ SAVED':'SAVE'}</button>
                  </div>
                  {savingIdx===i && !r.saved && (
                    <div style={{display:'flex',flexDirection:'column',gap:3,
                      padding:'6px 0 2px',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.6rem',
                        color:'rgba(255,255,255,0.5)',letterSpacing:'0.08em'}}>SAVE TO SPOT:</div>
                      <button onClick={()=>saveRecording(i, null)} style={{
                        background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',
                        borderRadius:6,padding:'4px 8px',textAlign:'left',
                        fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                        color:'#ccc',cursor:'pointer',WebkitTapHighlightColor:'transparent',
                      }}>No spot (piece only)</button>
                      {practiceSpots.filter(s=>s.label).map(s=>(
                        <button key={s.id} onClick={()=>saveRecording(i, s.id)} style={{
                          background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',
                          borderRadius:6,padding:'4px 8px',textAlign:'left',
                          fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                          color:'#fff',cursor:'pointer',WebkitTapHighlightColor:'transparent',
                        }}>{s.label}</button>
                      ))}
                      <div style={{display:'flex',gap:4,marginTop:2}}>
                        <input
                          value={newRecSpotName}
                          onChange={e=>setNewRecSpotName(e.target.value)}
                          placeholder="New spot name..."
                          style={{
                            flex:1,padding:'4px 8px',borderRadius:6,
                            border:'1px solid rgba(255,255,255,0.2)',
                            background:'rgba(255,255,255,0.08)',color:'#fff',
                            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                            letterSpacing:'0.04em',outline:'none',
                          }}
                          onFocus={e=>{e.target.style.borderColor='rgba(255,255,255,0.4)';}}
                          onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.2)';}}
                        />
                        <button onClick={()=>saveRecordingNewSpot(i, newRecSpotName)}
                          disabled={!newRecSpotName.trim()}
                          style={{
                            background: newRecSpotName.trim() ? 'rgba(46,170,87,0.4)' : 'rgba(255,255,255,0.05)',
                            border:'1px solid rgba(255,255,255,0.2)',
                            borderRadius:6,padding:'4px 8px',
                            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.6rem',
                            color: newRecSpotName.trim() ? '#fff' : '#666',
                            cursor: newRecSpotName.trim() ? 'pointer' : 'default',
                            WebkitTapHighlightColor:'transparent',
                          }}>+ SAVE</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pencil annotation toolbar */}
      {pencilMode && (
        <div style={{
          position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',
          zIndex:35,background:'rgba(80,80,80,0.95)',
          backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',
          borderRadius:16,padding:'10px 16px',
          boxShadow:'0 4px 24px rgba(0,0,0,0.25)',
          display:'flex',alignItems:'center',gap:10,
        }}>
          {/* Colors */}
          {[
            {c:'#e74c3c',label:'Red'},
            {c:'#3498db',label:'Blue'},
            {c:'#2ecc71',label:'Green'},
            {c:'#f39c12',label:'Orange'},
            {c:'#1a1a1a',label:'Black'},
          ].map(({c})=>(
            <button key={c} onClick={()=>{setPencilColor(c);setEraserOn(false);}} style={{
              width:28,height:28,borderRadius:'50%',background:c,
              border: pencilColor===c && !eraserOn ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
              cursor:'pointer',WebkitTapHighlightColor:'transparent',
              boxShadow: pencilColor===c && !eraserOn ? '0 0 0 2px rgba(255,255,255,0.5)' : 'none',
            }}/>
          ))}

          <div style={{width:1,height:24,background:'rgba(255,255,255,0.2)'}}/>

          {/* Line width */}
          {[{w:1,sz:10},{w:3,sz:16},{w:5,sz:22}].map(({w,sz})=>(
            <button key={w} onClick={()=>{setPencilWidth(w);setEraserOn(false);}} style={{
              width:30,height:30,borderRadius:8,
              background: pencilWidth===w && !eraserOn ? 'rgba(255,255,255,0.25)' : 'transparent',
              border:'1px solid rgba(255,255,255,0.2)',
              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
              WebkitTapHighlightColor:'transparent',
            }}>
              <div style={{width:sz,height:sz,borderRadius:'50%',background: !eraserOn && pencilWidth===w ? pencilColor : 'rgba(255,255,255,0.5)'}}/>
            </button>
          ))}

          <div style={{width:1,height:24,background:'rgba(255,255,255,0.2)'}}/>

          {/* Eraser */}
          <button onClick={()=>setEraserOn(e=>!e)} style={{
            background: eraserOn ? 'rgba(255,255,255,0.3)' : 'transparent',
            border:'1px solid rgba(255,255,255,0.3)',
            borderRadius:8,padding:'4px 10px',
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem',
            letterSpacing:'0.06em',color:'#fff',cursor:'pointer',
            WebkitTapHighlightColor:'transparent',
          }}>ERASER</button>

          {/* Clear page */}
          <button onClick={()=>{
            setAnnotations(prev=>({...prev,[currentPage]:[]}));
          }} style={{
            background:'transparent',
            border:'1px solid rgba(255,200,200,0.4)',
            borderRadius:8,padding:'4px 10px',
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem',
            letterSpacing:'0.06em',color:'#f88',cursor:'pointer',
            WebkitTapHighlightColor:'transparent',
          }}>CLEAR</button>

          {/* Close */}
          <button onClick={()=>setPencilMode(false)} style={{
            background:'transparent',
            border:'1px solid rgba(255,255,255,0.3)',
            borderRadius:8,padding:'4px 10px',
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem',
            letterSpacing:'0.06em',color:'#fff',cursor:'pointer',
            WebkitTapHighlightColor:'transparent',
          }}>DONE</button>
        </div>
      )}

      {/* Score page content */}
      <div data-score-container style={{position:'absolute',inset:0,display:'flex'}}>
        {/* Floating page arrows */}
        {totalPages>1 && currentPage>0 && (
          <button onClick={()=>setCurrentPage(p=>showTwo?Math.max(0,p-2):p-1)} style={{
            position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',zIndex:10,
            background:'rgba(255,255,255,0.85)',border:'none',color:'#333',fontSize:'1.8rem',
            padding:'16px 10px',cursor:'pointer',borderRadius:'0 4px 4px 0',
            WebkitTapHighlightColor:'transparent',
          }}>‹</button>
        )}
        {totalPages>1 && currentPage<totalPages-1 && !(showTwo && currentPage+2>=totalPages) && (
          <button onClick={()=>setCurrentPage(p=>showTwo?Math.min(totalPages-1,p+2):p+1)} style={{
            position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',zIndex:10,
            background:'rgba(255,255,255,0.85)',border:'none',color:'#333',fontSize:'1.8rem',
            padding:'16px 10px',cursor:'pointer',borderRadius:'4px 0 0 4px',
            WebkitTapHighlightColor:'transparent',
          }}>›</button>
        )}
        <div style={{position:'relative',flex:1,minWidth:0,overflow:'hidden'}}>
          <img data-page={currentPage} src={pageImages[currentPage]}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleClick}
            style={{width:'100%',height:'100%',objectFit:'contain',display:'block',
              userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none',
              cursor: isInterleaved?'crosshair':'default'}}
            onContextMenu={e=>e.preventDefault()}
            draggable={false} />
          {/* Annotation canvas — display only, pointer events off */}
          <canvas ref={el=>{
            annotCanvasRef.current=el;
            if(el){
              const img=el.parentElement?.querySelector('img');
              if(img&&img.clientWidth){el.width=img.clientWidth;el.height=img.clientHeight;}
              drawAnnotations(el, currentPage);
            }
          }}
            style={{
              position:'absolute',top:0,left:0,width:'100%',height:'100%',
              pointerEvents:'none',
              zIndex:5,
            }}
          />
          {isInterleaved && interleavedSpots.filter(s=>s.page===currentPage).map(spot=>(
            <SpotBox key={spot.id} spot={spot} mode="placement"
              onRemove={onRemoveSpot}
              isSelected={spot.id===selectedSpotId}
              onSelect={id=>setSelectedSpotId(id)}
              targetChecks={interleavedMode==='timed' ? 999 : (interleavedValue||5)}
            />
          ))}
          {/* SCU tempo indicators — only when toggle is on */}
          {showTempoTrackers && !isInterleaved && !locateEx && practiceSpots.filter(s=>s.score_page===currentPage && s.strategies?.scu).map(spot=>{
            const ox = spot.visual_offset_x||0;
            const oy = spot.visual_offset_y||0;
            const best = spot.scu_best||0;
            const goal = spot.perf_tempo||0;
            if(!goal) return null;
            return (
              <div key={spot.id}
                onClick={e=>{
                  e.stopPropagation();
                  // Go to strategy overlay with this spot — no naming needed
                  onTapPassage({page:spot.score_page, x:spot.score_x, y:spot.score_y, label:spot.label, spotDirect:true});
                }}
                onTouchStart={e=>handleDotDragStart(e,spot)}
                onTouchMove={handleDotDragMove}
                onTouchEnd={handleDotDragEnd}
                onMouseDown={e=>{if(e.detail>0)handleDotDragStart(e,spot);}}
                style={{
                  position:'absolute',
                  left:`${(spot.score_x+ox)*100}%`,
                  top:`${(spot.score_y+oy)*100}%`,
                  transform:'translate(-50%,-50%)',
                  cursor:'pointer',zIndex:15,
                  WebkitTapHighlightColor:'transparent',
                  touchAction:'none',
                  background:'rgba(46,170,87,0.92)',border:'1.5px solid white',
                  borderRadius:6,padding:'2px 6px',
                  boxShadow:'0 1px 6px rgba(0,0,0,0.35)',
                }}>
                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.6rem',
                  color:'white',letterSpacing:'0.04em',lineHeight:1.2,whiteSpace:'nowrap'}}>{best}/{goal}</span>
              </div>
            );
          })}
        </div>
        {showTwo && rightPage!==null && (
          <div style={{position:'relative',flex:1,minWidth:0,
            borderLeft:`1px solid ${C.bord}`,overflow:'hidden'}}>
            <img data-page={rightPage} src={pageImages[rightPage]}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleClick}
              style={{width:'100%',height:'100%',objectFit:'contain',display:'block',
                userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none',cursor:'default'}}
              onContextMenu={e=>e.preventDefault()}
              draggable={false} />
          </div>
        )}
      </div>

      {/* Chrome overlay — translucent top bar */}
      <div style={{
        position:'absolute',top:0,left:0,right:0,zIndex:20,
        transform:showChrome?'translateY(0)':'translateY(-100%)',
        transition:'transform 0.25s ease',
        background:'rgba(255,255,255,0.92)',
        backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',
        borderBottom:`1px solid rgba(0,0,0,0.1)`,
      }}>
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'0 14px',height:46,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:6,minWidth:80}}>
            <BackBtn onClick={onBack} />
            {!locateEx && !isInterleaved && (<>
              <button onClick={()=>onLaunchStrategy('journal', {page:currentPage, x:0.5, y:0.5})} style={{
                background:'rgba(232,160,50,0.12)',border:'1px solid rgba(232,160,50,0.25)',
                color:'#c88520',padding:'4px 10px',borderRadius:12,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                letterSpacing:'0.08em',cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>📋 JOURNAL</button>
              <button onClick={()=>setShowTimerPicker(true)} style={{
                background: timerLeft!=null ? 'rgba(74,120,255,0.18)' : 'rgba(74,120,255,0.08)',
                border: `1px solid ${timerLeft!=null ? 'rgba(74,120,255,0.35)' : 'rgba(74,120,255,0.18)'}`,
                color: timerLeft!=null ? '#3a6fff' : '#6b8fdf',
                padding:'4px 10px',borderRadius:12,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                letterSpacing:'0.08em',cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>⏱ TIMER</button>
              <button onClick={()=>{setShowMetro(true);setMetroExpanded(true);}} style={{
                background: metroOn ? 'rgba(180,80,200,0.18)' : 'rgba(180,80,200,0.08)',
                border: `1px solid ${metroOn ? 'rgba(180,80,200,0.35)' : 'rgba(180,80,200,0.18)'}`,
                color: metroOn ? '#a855c8' : '#b888cc',
                padding:'4px 10px',borderRadius:12,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                letterSpacing:'0.08em',cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>🎵 METRONOME</button>
              <button onClick={()=>setPencilMode(p=>!p)} style={{
                background: pencilMode ? 'rgba(230,120,50,0.18)' : 'rgba(230,120,50,0.08)',
                border: `1px solid ${pencilMode ? 'rgba(230,120,50,0.35)' : 'rgba(230,120,50,0.18)'}`,
                color: pencilMode ? '#d4722a' : '#c89060',
                padding:'4px 10px',borderRadius:12,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                letterSpacing:'0.08em',cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>{pencilMode ? '✏️ PENCIL ON' : '✏️ PENCIL'}</button>
              <button onClick={()=>setShowRecorder(true)} style={{
                background: recording ? 'rgba(220,50,50,0.18)' : 'rgba(220,50,50,0.08)',
                border: `1px solid ${recording ? 'rgba(220,50,50,0.35)' : 'rgba(220,50,50,0.18)'}`,
                color: recording ? '#dc3232' : '#c87070',
                padding:'4px 10px',borderRadius:12,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                letterSpacing:'0.08em',cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>{recording ? '⏺ REC' : '🎙 RECORD'}</button>
              <button onClick={()=>setShowTempoTrackers(t=>!t)} style={{
                background: showTempoTrackers ? 'rgba(46,170,87,0.18)' : 'rgba(46,170,87,0.08)',
                border: `1px solid ${showTempoTrackers ? 'rgba(46,170,87,0.35)' : 'rgba(46,170,87,0.18)'}`,
                color: showTempoTrackers ? '#2eaa57' : '#5cb878',
                padding:'4px 10px',borderRadius:12,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.6rem',
                letterSpacing:'0.06em',cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>{showTempoTrackers ? '♩ TEMPO TRACKER ON' : '♩ TEMPO TRACKER'}</button>
              <button onClick={exportAnnotatedPdf} disabled={exportingScore} style={{
                background: exportingScore ? 'rgba(74,120,255,0.18)' : 'rgba(74,120,255,0.08)',
                border: `1px solid ${exportingScore ? 'rgba(74,120,255,0.35)' : 'rgba(74,120,255,0.18)'}`,
                color: exportingScore ? '#4a78ff' : '#6b8fdf',
                padding:'4px 10px',borderRadius:12,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                letterSpacing:'0.08em',cursor: exportingScore?'wait':'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>{exportingScore ? '📄 EXPORTING...' : '📄 EXPORT PDF'}</button>
            </>)}
          </div>
          <div style={{textAlign:'center',flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',
              letterSpacing:'0.12em',color:'#1a1a1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {locateEx ? 'LOCATE EXERCISE' : (piece?.title||'SCORE')}
            </div>
          </div>
          <div style={{display:'flex',gap:4,alignItems:'center',justifyContent:'flex-end'}}>
            {!locateEx && !isInterleaved && (
              <button onClick={()=>{
                setSessionMode('interleaved');
                setShowIntroModal(true);
              }} style={{
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                letterSpacing:'0.06em',padding:'5px 10px',borderRadius:6,
                background:'transparent',color:'#4a9eff',border:`1.5px solid #4a9eff`,
                cursor:'pointer',WebkitTapHighlightColor:'transparent',
              }}>TRY INTERLEAVED</button>
            )}
            {isInterleaved && !locateEx && (<>
              <button onClick={()=>{
                setSessionMode('massed');
              }} style={{
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
                letterSpacing:'0.06em',padding:'5px 10px',borderRadius:6,
                background:'transparent',color:'#9b59b6',border:`1.5px solid #9b59b6`,
                cursor:'pointer',WebkitTapHighlightColor:'transparent',
              }}>BACK TO NORMAL</button>
              <button onClick={onStartSession} disabled={interleavedSpots.length<1} style={{
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
                letterSpacing:'0.1em',padding:'7px 14px',borderRadius:6,
                background:interleavedSpots.length>=1?'#4a9eff':'transparent',
                color:interleavedSpots.length>=1?'white':C.dim,
                border:`1px solid ${interleavedSpots.length>=1?'#4a9eff':C.bord}`,
                cursor:interleavedSpots.length>=1?'pointer':'not-allowed',
                WebkitTapHighlightColor:'transparent',
              }}>START →</button>
            </>)}
          </div>
        </div>
      </div>

      {/* Interleaved tempo + status sub-bar — always visible, absolute positioned below chrome */}
      {isInterleaved && !locateEx && (
        <div style={{display:'flex',alignItems:'center',gap:8,
          padding:'6px 12px',flexShrink:0,
          position:'absolute',top:46,left:0,right:0,zIndex:19,
          background:'rgba(255,255,255,0.95)',borderBottom:`1px solid ${C.bord}`,
          backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',
        }}>
          {/* BPM step buttons + display */}
          {['−','+'].map((lbl,di)=>{
            const props = di===0 ? {
              onMouseDown:()=>{adjustBpm(-1);bpmTimerRef.current=setTimeout(()=>{bpmIntervalRef.current=setInterval(()=>adjustBpm(-10),100);},600);},
              onMouseUp:()=>{clearTimeout(bpmTimerRef.current);clearInterval(bpmIntervalRef.current);},
              onMouseLeave:()=>{clearTimeout(bpmTimerRef.current);clearInterval(bpmIntervalRef.current);},
              onTouchStart:e=>{e.preventDefault();adjustBpm(-1);bpmTimerRef.current=setTimeout(()=>{bpmIntervalRef.current=setInterval(()=>adjustBpm(-10),100);},600);},
              onTouchEnd:()=>{clearTimeout(bpmTimerRef.current);clearInterval(bpmIntervalRef.current);},
            } : {
              onMouseDown:()=>{adjustBpm(1);bpmTimerRef.current=setTimeout(()=>{bpmIntervalRef.current=setInterval(()=>adjustBpm(10),100);},600);},
              onMouseUp:()=>{clearTimeout(bpmTimerRef.current);clearInterval(bpmIntervalRef.current);},
              onMouseLeave:()=>{clearTimeout(bpmTimerRef.current);clearInterval(bpmIntervalRef.current);},
              onTouchStart:e=>{e.preventDefault();adjustBpm(1);bpmTimerRef.current=setTimeout(()=>{bpmIntervalRef.current=setInterval(()=>adjustBpm(10),100);},600);},
              onTouchEnd:()=>{clearTimeout(bpmTimerRef.current);clearInterval(bpmIntervalRef.current);},
            };
            return (
              <button key={lbl} {...props} style={{
                background:'#f0f0f0',border:`1px solid ${C.bord2}`,color:C.cream,
                width:32,height:32,cursor:'pointer',userSelect:'none',flexShrink:0,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',
                display:'flex',alignItems:'center',justifyContent:'center',
                WebkitTapHighlightColor:'transparent',
              }}>{lbl}</button>
            );
          })}
          <span style={{fontFamily:"'Bebas Neue',sans-serif",
            fontSize:'1.2rem',letterSpacing:'0.06em',
            color:placeMetroOn?C.accent:C.cream,lineHeight:1,
            minWidth:72,textAlign:'center',flexShrink:0}}>♩ = {placeMetroBpm}</span>
          <button onClick={toggleMetro} style={{
            background: metroWaiting?'#4a9eff':placeMetroOn?C.accent:'#f0f0f0',
            border:`2px solid ${metroWaiting?'#4a9eff':placeMetroOn?C.accent:'#ccc'}`,
            color:(metroWaiting||placeMetroOn)?'white':'#333',width:36,height:36,cursor:'pointer',flexShrink:0,
            fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',
            WebkitTapHighlightColor:'transparent',
            boxShadow:metroWaiting?'0 0 0 3px rgba(74,158,255,0.35)':'none',
            transition:'background 0.2s,border-color 0.2s,box-shadow 0.2s',
          }}>{placeMetroOn?'⏸':'▶'}</button>
          {(() => {
            const selSpot = interleavedSpots.find(s=>s.id===selectedSpotId);
            const locked  = selSpot?.bpm === placeMetroBpm && selSpot?.bpm != null;
            return (
              <button onClick={lockIn} disabled={!selectedSpotId} style={{
                flexShrink:0,padding:'5px 10px',
                background:locked?'rgba(61,176,106,0.18)':'#f0f0f0',
                border:`1px solid ${locked?'#3db06a':selectedSpotId?C.bord2:C.bord}`,
                color:locked?'#3db06a':selectedSpotId?C.cream:C.dim,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.72rem',
                letterSpacing:'0.08em',cursor:selectedSpotId?'pointer':'not-allowed',
                WebkitTapHighlightColor:'transparent',whiteSpace:'nowrap',
              }}>{locked?'✓ SET':'SET TEMPO'}</button>
            );
          })()}
          <div style={{flex:1,fontFamily:"'Bebas Neue',sans-serif",
            fontSize:'0.78rem',color:metroWaiting?'#4a9eff':'#c4a060',
            letterSpacing:'0.08em',lineHeight:1.3,transition:'color 0.2s',minWidth:0}}>
            {metroWaiting
              ? `▶ THEN SET FOR SPOT ${selectedSpotId}`
              : interleavedSpots.length===0
              ? 'TAP SCORE TO PLACE SPOTS (3–7)'
              : interleavedSpots.length<1
              ? `${interleavedSpots.length} PLACED — NEED ${3-interleavedSpots.length} MORE`
              : `${interleavedSpots.length} SPOTS — TAP TO SELECT, THEN SET TEMPO`}
          </div>
          <button onClick={()=>setShowIntroModal(true)} style={{
            background:'none',border:`1px solid ${C.bord2}`,color:C.muted,
            width:28,height:28,cursor:'pointer',flexShrink:0,
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
            display:'flex',alignItems:'center',justifyContent:'center',
            WebkitTapHighlightColor:'transparent',borderRadius:3,
          }}>?</button>

        </div>
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   INTERLEAVED — SPOT BOX
═══════════════════════════════════════════════════════════════════════ */
function SpotBox({ spot, mode, onRemove, isCurrent, isSelected, onSelect, targetChecks=5 }) {
  const isDone    = spot.visited || spot.checks >= targetChecks;
  const dimmed    = mode === 'session' && !isCurrent;
  const selected  = mode === 'placement' && isSelected;
  const border    = dimmed   ? 'rgba(140,130,120,0.3)'
                  : selected ? '#7ec8ff'
                  : isDone   ? '#3db06a'
                  :            '#4a9eff';
  const bg        = dimmed   ? 'rgba(30,28,26,0.55)'
                  : isDone   ? 'rgba(61,176,106,0.22)'
                  :            'rgba(30,70,160,0.55)';
  const opacity   = dimmed ? 0.35 : 1;
  const boxShadow = selected ? '0 0 0 2px rgba(126,200,255,0.45)' : 'none';
  return (
    <div
      onClick={mode==='placement' ? e=>{e.stopPropagation();onSelect&&onSelect(spot.id);} : undefined}
      style={{
        position:'absolute',
        left:`calc(${spot.x*100}% - 36px)`,
        top:`calc(${spot.y*100}% - 26px)`,
        width:72, height:52,
        border:`2px solid ${border}`,
        background:bg,
        borderRadius:5,
        boxShadow,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'space-between',
        padding:'3px 5px 4px',
        opacity,
        transition:'opacity 0.2s, border-color 0.2s, box-shadow 0.2s',
        pointerEvents: mode==='placement' ? 'auto' : 'none',
        cursor: mode==='placement' ? 'pointer' : 'default',
        userSelect:'none', WebkitTapHighlightColor:'transparent',
        zIndex:5,
      }}>
      <div style={{display:'flex',width:'100%',justifyContent:'space-between',alignItems:'flex-start'}}>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,lineHeight:1,
          color:isDone?'#3db06a':'#fff',letterSpacing:'0.05em'}}>{spot.id}</span>
        <div style={{display:'flex',alignItems:'center',gap:2}}>
          {/* Tiny tempo-locked indicator */}
          {spot.bpm && (
            <span style={{fontSize:9,color:'rgba(126,200,255,0.8)',lineHeight:1}}>♩</span>
          )}
          {mode==='placement' && (
            <button onClick={e=>{e.stopPropagation();onRemove(spot.id);}} style={{
              background:'rgba(255,255,255,0.18)',border:'none',
              color:'rgba(255,255,255,0.85)',width:14,height:14,
              borderRadius:'50%',cursor:'pointer',fontSize:9,
              display:'flex',alignItems:'center',justifyContent:'center',
              padding:0,lineHeight:1,
            }}>✕</button>
          )}
        </div>
      </div>
      <div style={{display:'flex',gap:3,alignItems:'center'}}>
        {targetChecks <= 10 ? Array.from({length:targetChecks},(_,i)=>(
          <div key={i} style={{
            width:9,height:9,borderRadius:'50%',
            background: i<spot.checks ? '#3db06a' : 'rgba(255,255,255,0.2)',
            border:`1px solid ${i<spot.checks?'#3db06a':'rgba(255,255,255,0.4)'}`,
            transition:'background 0.15s',
          }}/>
        )) : spot.visited ? (
          <div style={{color:'#3db06a',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem'}}>✓</div>
        ) : null}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   INTERLEAVED — SESSION SCREEN
═══════════════════════════════════════════════════════════════════════ */
function InterleavedSessionScreen({ pageImages, spots: initialSpots, rotationMode, rotationValue, onBack, onDone }) {
  const [spots, setSpots]                 = useState(()=>initialSpots.map(s=>({...s,checks:0,visited:false})));
  const [currentSpotId, setCurrentSpotId] = useState(null);
  const [currentPage, setCurrentPage]     = useState(0);
  const [flash, setFlash]                 = useState(null);
  const [done, setDone]                   = useState(false);
  const [showNextSpot, setShowNextSpot]   = useState(false);
  const [spotTimer, setSpotTimer]         = useState(null); // seconds remaining for timed mode
  const spotTimerRef = useRef(null);
  const targetChecks = rotationMode==='consistency' ? (rotationValue||5) : 999;
  const isTimed = rotationMode==='timed';
  const queueRef        = useRef([]);
  const containerRef    = useRef();
  const imgRef          = useRef();
  const currentSpotIdRef  = useRef(null);
  const currentPageRef    = useRef(0);
  const metro             = useRef(new Metro());
  const [metroOn,  setMetroOn]  = useState(false);
  const [metroBpm, setMetroBpm] = useState(80);
  const [subdiv, setSubdiv] = useState(1);
  useEffect(()=>{ currentSpotIdRef.current = currentSpotId; },[currentSpotId]);
  useEffect(()=>{ currentPageRef.current   = currentPage;   },[currentPage]);
  // When spot changes: if it has a locked BPM, auto-load it; otherwise keep current
  useEffect(()=>{
    if(!currentSpotId) return;
    const spot = spots.find(s=>s.id===currentSpotId);
    if(spot?.bpm) {
      setMetroBpm(spot.bpm);
      metro.current.setBpm(spot.bpm);
      if(metroOn) metro.current.start(spot.bpm);
    }
  },[currentSpotId]);
  // Keep metro in sync when metroBpm changes
  useEffect(()=>{
    metro.current.setBpm(metroBpm);
    if(metroOn) metro.current.start(metroBpm);
  },[metroBpm]);
  // Stop metro on unmount
  useEffect(()=>()=>metro.current.stop(),[]);

  const shuffle = arr => {
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  };

  useEffect(()=>{
    const q=shuffle(initialSpots.map(s=>s.id));
    const first=q.shift();
    queueRef.current=q;
    setCurrentSpotId(first);
    currentSpotIdRef.current=first;
    const s=initialSpots.find(s=>s.id===first);
    if(s) setCurrentPage(s.page);
    if(isTimed) setSpotTimer((rotationValue||3)*60);
  },[]);

  // Timed mode: countdown per spot
  useEffect(()=>{
    if(!isTimed || spotTimer==null || spotTimer<=0 || showNextSpot) return;
    if(spotTimer<=0) { setShowNextSpot(true); return; }
    spotTimerRef.current = setTimeout(()=>setSpotTimer(p=>p-1), 1000);
    return ()=>clearTimeout(spotTimerRef.current);
  },[isTimed, spotTimer, showNextSpot]);
  useEffect(()=>{
    if(isTimed && spotTimer!=null && spotTimer<=0) setShowNextSpot(true);
  },[spotTimer]);

  const fmtTime = (s) => { const m=Math.floor(s/60),sec=s%60; return `${m}:${sec<10?'0':''}${sec}`; };

  const scrollToSpot = (spotId, pg, updatedSpots) => {
    requestAnimationFrame(()=>{
      if(!imgRef.current||!containerRef.current) return;
      const all = updatedSpots || [];
      const spot = all.find(s=>s.id===spotId);
      if(!spot||spot.page!==pg) return;
      const imgH=imgRef.current.offsetHeight;
      if(imgH) containerRef.current.scrollTop=Math.max(0,spot.y*imgH-containerRef.current.clientHeight*0.4);
    });
  };

  const advanceTimed = () => {
    setShowNextSpot(false);
    const updated = spots.map(s=>s.id===currentSpotId?{...s,visited:true}:s);
    setSpots(updated);
    const unvisited = updated.filter(s=>!s.visited).map(s=>s.id);
    if(unvisited.length===0){ setDone(true); return; }
    const next = unvisited[Math.floor(Math.random()*unvisited.length)];
    setCurrentSpotId(next);
    currentSpotIdRef.current=next;
    const ns=updated.find(s=>s.id===next);
    if(ns){ setCurrentPage(ns.page); scrollToSpot(next,ns.page,updated); }
    setSpotTimer((rotationValue||3)*60);
  };

  const advance = (updatedSpots) => {
    if(updatedSpots.every(s=>s.checks>=targetChecks)){setDone(true);return;}
    const incomplete=updatedSpots.filter(s=>s.checks<targetChecks).map(s=>s.id);
    let q=queueRef.current.filter(id=>incomplete.includes(id));
    if(q.length===0){
      q=shuffle([...incomplete]);
      const prev=currentSpotIdRef.current;
      if(q[0]===prev&&q.length>1){[q[0],q[1]]=[q[1],q[0]];}
    }
    const next=q.shift();
    queueRef.current=q;
    setCurrentSpotId(next);
    currentSpotIdRef.current=next;
    const nextSpot=updatedSpots.find(s=>s.id===next);
    if(nextSpot){
      setCurrentPage(nextSpot.page);
      scrollToSpot(next, nextSpot.page, updatedSpots);
    }
  };

  const handleVerdict = (success) => {
    if(!currentSpotIdRef.current||done) return;
    setFlash(success?'pass':'fail');
    setTimeout(()=>setFlash(null),500);
    const id=currentSpotIdRef.current;
    const updated=spots.map(s=>s.id===id?{...s,checks:success?s.checks+1:0}:s);
    setSpots(updated);
    advance(updated);
  };

  const completedCount=spots.filter(s=> isTimed ? s.visited : s.checks>=targetChecks).length;
  const land = useOrientation();
  const totalPages=pageImages.length;
  const showTwo = land && totalPages > 1;
  const rightPage = currentPage+1 < totalPages ? currentPage+1 : null;
  const spotsOnPage=spots.filter(s=>s.page===currentPage);
  const spotsOnRight=showTwo&&rightPage!==null?spots.filter(s=>s.page===rightPage):[];
  const verdictBg=flash==='pass'?'rgba(61,176,106,0.14)':flash==='fail'?'rgba(229,53,53,0.12)':'transparent';

  if(done) return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0,
      alignItems:'center',justifyContent:'center',background:'#fff',gap:20,padding:32}}>
      <div style={{fontSize:'3rem'}}>🎉</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'2rem',
        letterSpacing:'0.15em',color:'#3db06a',textAlign:'center'}}>ALL SPOTS MASTERED</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
        fontSize:'1.05rem',color:C.muted,textAlign:'center',maxWidth:300}}>
        {initialSpots.length} spot{initialSpots.length!==1?'s':''}, 5 in a row each.
      </div>
      <Btn big onClick={onDone||onBack}>← BACK TO SCORE</Btn>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0,background:'#fff'}}>
      <TopBar
        left={<button onClick={onBack} style={{background:'none',border:`1px solid ${C.bord2}`,
          color:C.cream,padding:'6px 10px',cursor:'pointer',
          fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
          letterSpacing:'0.1em'}}>← EXIT</button>}
        center={currentSpotId ? `SPOT ${currentSpotId} OF ${spots.length}` : 'INTERLEAVED'}
        right={<span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',color:C.muted}}>
          {completedCount}/{spots.length} done</span>}
      />

      {/* Verdict + metro bar — compact single row */}
      <div style={{display:'flex',alignItems:'center',gap:6,
        padding:'6px 10px',flexShrink:0,
        background:verdictBg,borderBottom:`1px solid ${C.bord}`,
        transition:'background 0.3s'}}>
        {/* Miss / Got it — consistency mode only */}
        {!isTimed && (<>
          <button onClick={()=>handleVerdict(false)} style={{
            padding:'6px 14px',background:'transparent',border:`1px solid #e57373`,
            color:'#e57373',cursor:'pointer',
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'0.08em',
            WebkitTapHighlightColor:'transparent',flexShrink:0,
          }}>✗ MISS</button>
          <button onClick={()=>handleVerdict(true)} style={{
            padding:'6px 14px',background:'transparent',border:`1px solid #3db06a`,
            color:'#3db06a',cursor:'pointer',
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'0.08em',
            WebkitTapHighlightColor:'transparent',flexShrink:0,
          }}>✓ GOT IT</button>
        </>)}

        {/* Timed mode: timer + next spot */}
        {isTimed && (
          showNextSpot ? (
            <button onClick={advanceTimed} style={{
              padding:'8px 20px',background:'#4a9eff',border:'none',
              color:'white',cursor:'pointer',
              fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',letterSpacing:'0.1em',
              borderRadius:8,WebkitTapHighlightColor:'transparent',flexShrink:0,
              animation:'pulse 1.5s infinite',
            }}>NEXT SPOT →</button>
          ) : (
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',
              color:'#4a9eff',letterSpacing:'0.05em',flexShrink:0,minWidth:50}}>
              {spotTimer!=null ? fmtTime(spotTimer) : ''}
            </div>
          )
        )}

        <div style={{width:1,height:24,background:C.bord,flexShrink:0}}/>

        {/* Metronome controls */}
        {(()=>{
          const curSpot = spots.find(s=>s.id===currentSpotId);
          const alreadyLocked = curSpot?.bpm === metroBpm;
          const adjBpm = delta => setMetroBpm(b=>Math.min(220,Math.max(30,b+delta)));
          return (<>
            <button onClick={()=>adjBpm(-5)} style={{
              background:'#f0f0f0',border:`1px solid ${C.bord2}`,color:C.cream,
              width:32,height:32,cursor:'pointer',flexShrink:0,
              fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',
              display:'flex',alignItems:'center',justifyContent:'center',
              WebkitTapHighlightColor:'transparent',
            }}>−</button>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",
              fontSize:'1.2rem',letterSpacing:'0.06em',
              color:metroOn?C.accent:C.cream,lineHeight:1,
              minWidth:72,textAlign:'center',flexShrink:0}}>♩ = {metroBpm}</span>
            <button onClick={()=>adjBpm(5)} style={{
              background:'#f0f0f0',border:`1px solid ${C.bord2}`,color:C.cream,
              width:32,height:32,cursor:'pointer',flexShrink:0,
              fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',
              display:'flex',alignItems:'center',justifyContent:'center',
              WebkitTapHighlightColor:'transparent',
            }}>+</button>
            <button onClick={()=>{
              const next=!metroOn;
              setMetroOn(next);
              if(next) metro.current.start(metroBpm); else metro.current.stop();
            }} style={{
              background:metroOn?C.accent:'#f0f0f0',
              border:`2px solid ${metroOn?C.accent:'#ccc'}`,
              color:metroOn?'white':'#333',width:36,height:36,cursor:'pointer',
              fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',
              flexShrink:0,WebkitTapHighlightColor:'transparent',
            }}>{metroOn?'⏸':'▶'}</button>
            <SubdivBtns subdiv={subdiv} setSubdiv={setSubdiv} metro={metro} metroOn={metroOn} bpm={metroBpm} compact />
            <button onClick={()=>{
              if(!currentSpotId) return;
              setSpots(prev=>prev.map(s=>s.id===currentSpotId?{...s,bpm:metroBpm}:s));
            }} style={{
              flexShrink:0,padding:'5px 10px',
              background:alreadyLocked?'rgba(61,176,106,0.18)':'#f0f0f0',
              border:`1px solid ${alreadyLocked?'#3db06a':C.bord2}`,
              color:alreadyLocked?'#3db06a':C.cream,
              fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.72rem',
              letterSpacing:'0.08em',cursor:'pointer',
              WebkitTapHighlightColor:'transparent',whiteSpace:'nowrap',
            }}>{alreadyLocked?'✓ SET':'SET TEMPO'}</button>
          </>);
        })()}

        {/* Checks display */}
        {(()=>{
          const curSpot = spots.find(s=>s.id===currentSpotId);
          return curSpot ? (
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
              color:'#4a9eff',letterSpacing:'0.08em',flexShrink:0,textAlign:'center',
              minWidth:30}}>
              {isTimed ? (spotTimer!=null ? fmtTime(spotTimer) : '') : `${curSpot.checks}/${targetChecks}`}
            </div>
          ) : null;
        })()}
      </div>

      {/* Score — full remaining height with floating arrows */}
      <div style={{flex:'1 1 0',minHeight:0,background:'#e8e5e0',display:'flex',position:'relative'}}>
        {/* Floating page arrows */}
        {totalPages>1 && currentPage>0 && (
          <button onClick={()=>setCurrentPage(p=>p-1)} style={{
            position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',zIndex:10,
            background:'rgba(255,255,255,0.85)',border:'none',color:C.cream,fontSize:'1.8rem',
            padding:'16px 10px',cursor:'pointer',borderRadius:'0 4px 4px 0',
            WebkitTapHighlightColor:'transparent',
          }}>‹</button>
        )}
        {totalPages>1 && currentPage<totalPages-1 && !(showTwo && currentPage+2>=totalPages) && (
          <button onClick={()=>setCurrentPage(p=>p+1)} style={{
            position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',zIndex:10,
            background:'rgba(255,255,255,0.85)',border:'none',color:C.cream,fontSize:'1.8rem',
            padding:'16px 10px',cursor:'pointer',borderRadius:'4px 0 0 4px',
            WebkitTapHighlightColor:'transparent',
          }}>›</button>
        )}

        {/* Page indicator */}
        {totalPages>1 && !showTwo && (
          <div style={{position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',
            zIndex:10,background:'rgba(255,255,255,0.9)',padding:'4px 12px',borderRadius:12,
            fontFamily:"'Inconsolata',monospace",fontSize:'0.8rem',color:C.cream,
            pointerEvents:'none'}}>
            {currentPage+1} / {totalPages}
          </div>
        )}

        {/* Left page */}
        <div ref={containerRef} style={{position:'relative',flex:1,minWidth:0,overflow:'hidden'}}
          onTouchStart={e=>{e.currentTarget._sw={x:e.touches[0].clientX,t:Date.now()};}}
          onTouchEnd={e=>{const s=e.currentTarget._sw;if(!s)return;const dx=e.changedTouches[0].clientX-s.x;if(Math.abs(dx)>60&&Date.now()-s.t<400){if(dx<0&&currentPage<totalPages-1)setCurrentPage(p=>showTwo?p+2:p+1);if(dx>0&&currentPage>0)setCurrentPage(p=>showTwo?Math.max(0,p-2):p-1);}}}>
          <img ref={imgRef} src={pageImages[currentPage]}
            style={{width:'100%',height:'100%',objectFit:'contain',display:'block',
              userSelect:'none',WebkitUserSelect:'none'}}
            draggable={false}
            onLoad={()=>{
              const id=currentSpotIdRef.current;
              const pg=currentPageRef.current;
              if(!id||!containerRef.current||!imgRef.current) return;
              const spot=spots.find(s=>s.id===id);
              if(!spot||spot.page!==pg) return;
              const imgH=imgRef.current.offsetHeight;
              if(imgH) containerRef.current.scrollTop=Math.max(0,spot.y*imgH-containerRef.current.clientHeight*0.4);
            }}
          />
          {spotsOnPage.map(spot=>(
            <SpotBox key={spot.id} spot={spot} mode="session" isCurrent={spot.id===currentSpotId} targetChecks={targetChecks} />
          ))}
          {spotsOnPage.filter(s=>s.id===currentSpotId).map(spot=>(
            <div key={'ring'+spot.id} style={{
              position:'absolute',
              left:`calc(${spot.x*100}% - 44px)`,
              top:`calc(${spot.y*100}% - 33px)`,
              width:88,height:66,
              border:'2px solid rgba(74,158,255,0.55)',
              borderRadius:8,
              boxShadow:'0 0 0 3px rgba(74,158,255,0.2), 0 0 18px rgba(74,158,255,0.35)',
              pointerEvents:'none',zIndex:6,
            }}/>
          ))}
        </div>

        {/* Right page (landscape) */}
        {showTwo && rightPage!==null && (
          <div style={{position:'relative',flex:1,minWidth:0,
            borderLeft:`1px solid ${C.bord}`,overflow:'hidden'}}>
            <img src={pageImages[rightPage]}
              style={{width:'100%',height:'100%',objectFit:'contain',display:'block',
                userSelect:'none',WebkitUserSelect:'none'}}
              draggable={false} />
            {spotsOnRight.map(spot=>(
              <SpotBox key={spot.id} spot={spot} mode="session" isCurrent={spot.id===currentSpotId} targetChecks={targetChecks} />
            ))}
            {spotsOnRight.filter(s=>s.id===currentSpotId).map(spot=>(
              <div key={'ring'+spot.id} style={{
                position:'absolute',
                left:`calc(${spot.x*100}% - 44px)`,
                top:`calc(${spot.y*100}% - 33px)`,
                width:88,height:66,
                border:'2px solid rgba(74,158,255,0.55)',
                borderRadius:8,
                boxShadow:'0 0 0 3px rgba(74,158,255,0.2), 0 0 18px rgba(74,158,255,0.35)',
                pointerEvents:'none',zIndex:6,
              }}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/* ── Exercise card with delete confirm ──────────────────────────────── */
function ExerciseCard({ ex, confirmDelete, setConfirmDelete, deleting, onDelete, onOpen }) {
  return (
    <div style={{position:'relative'}}>
      <button
        style={{display:'flex',flexDirection:'column',gap:8,padding:'16px 52px 16px 18px',
          width:'100%',textAlign:'left',cursor:'pointer',
          border:`1px solid ${C.bord}`,background:'#fff',
          WebkitTapHighlightColor:'transparent',transition:'background 0.12s'}}
        onClick={()=>{ if(confirmDelete!==ex.id) onOpen(ex); }}
        onMouseEnter={e=>e.currentTarget.style.background=C.surf}
        onMouseLeave={e=>e.currentTarget.style.background=C.panel}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.15rem',
          letterSpacing:'0.08em',color:C.cream}}>
          {ex.doc_name||'Untitled Exercise'}
        </div>
        <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.85rem',color:C.muted}}>
          {[ex.grouping, ex.instrument].filter(Boolean).join(' · ')}
          {ex.notes ? ` · ${ex.notes.split(',').filter(Boolean).length} notes` : ''}
        </div>
      </button>
      {confirmDelete !== ex.id ? (
        <button onClick={e=>{e.stopPropagation();setConfirmDelete(ex.id);}}
          style={{position:'absolute',top:'50%',right:12,transform:'translateY(-50%)',
            background:'none',border:`1px solid #444`,color:'#888',
            width:28,height:28,borderRadius:4,cursor:'pointer',fontSize:'0.9rem',
            display:'flex',alignItems:'center',justifyContent:'center',
            WebkitTapHighlightColor:'transparent'}}>✕</button>
      ) : (
        <div style={{position:'absolute',inset:0,background:'rgba(20,10,8,0.95)',
          display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'0 14px'}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
            letterSpacing:'0.1em',color:'#e57373',flex:1}}>DELETE THIS EXERCISE?</span>
          <button onClick={e=>{e.stopPropagation();onDelete(ex.id);}} disabled={deleting}
            style={{background:'#e53535',border:'none',color:'white',padding:'6px 14px',
              fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
              letterSpacing:'0.1em',cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
            {deleting?'…':'DELETE'}
          </button>
          <button onClick={e=>{e.stopPropagation();setConfirmDelete(null);}}
            style={{background:'none',border:`1px solid ${C.bord}`,color:C.cream,
              padding:'6px 12px',fontFamily:"'Bebas Neue',sans-serif",
              fontSize:'0.85rem',letterSpacing:'0.1em',cursor:'pointer',
              WebkitTapHighlightColor:'transparent'}}>CANCEL</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STRATEGY OVERLAY — floating panel over score
═══════════════════════════════════════════════════════════════════════ */
function StrategyOverlay({ piece, profile, tapPos, selectedSpot, onClose, onICU, onRV, onSCU, onUnguided, onViewLog }) {
  const [panel, setPanel] = useState('strategies');
  const [nearby, setNearby] = useState([]);
  const [unlocated, setUnlocated] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [attaching, setAttaching] = useState(null); // exercise id being attached

  const openRV = async () => {
    setPanel('rv');
    setLoading(true);
    try {
      const r = await sbGet(
        `/rest/v1/exercises?user_email=eq.${encodeURIComponent(profile.email)}&order=created_at.desc&limit=50`
      );
      const all = await r.json() || [];

      const nb = [], ul = [];

      all.forEach(ex => {
        // Match by spot_id
        if(selectedSpot && ex.spot_id === selectedSpot.id) { nb.push(ex); return; }

        // Match by proximity (works whether or not selectedSpot is set)
        const refPage = selectedSpot?.score_page ?? tapPos?.page;
        const refY = selectedSpot?.score_y ?? tapPos?.y ?? 0;
        const hasLocation = ex.score_page != null && ex.score_y != null;

        if(hasLocation) {
          if(ex.piece_id && piece?.id && String(ex.piece_id) !== String(piece.id)) return;
          const samePage = parseInt(ex.score_page) === refPage;
          const closeY = Math.abs(parseFloat(ex.score_y) - refY) < 0.12;
          if(samePage && closeY) { nb.push(ex); return; }
        }

        // Unlocated exercises (no page, no spot_id)
        if(!hasLocation && !ex.spot_id) { ul.push(ex); }
      });

      setNearby(nb);
      setUnlocated(ul);
    } catch { setNearby([]); setUnlocated([]); }
    setLoading(false);
  };

  const [attachError, setAttachError] = useState(null);

  const attachToSpot = async (ex) => {
    setAttaching(ex.id);
    setAttachError(null);
    try {
      const payload = {
        piece_id: piece?.id||null,
        score_page: selectedSpot?.score_page ?? tapPos?.page ?? null,
        score_y: selectedSpot?.score_y ?? tapPos?.y ?? null,
        spot_id: selectedSpot?.id || null,
      };
      console.log('ATTACH payload:', payload, 'for id:', ex.id);
      const res = await sbPatch(`/rest/v1/exercises?id=eq.${ex.id}`, payload);
      const body = await res.text();
      console.log('ATTACH response:', res.status, res.statusText, body);
      if(!res.ok) {
        setAttachError(`Error ${res.status}: ${body || res.statusText}`);
        setAttaching(null);
        return;
      }
      // Confirmed success — move from unlocated → nearby
      const updated = {...ex, ...payload};
      setUnlocated(prev => prev.filter(e => e.id !== ex.id));
      setNearby(prev => [updated, ...prev]);
    } catch(e) {
      setAttachError('Network error: ' + e.message);
      console.error('Attach error', e);
    }
    setAttaching(null);
  };

  const deleteExercise = async (id) => {
    setDeleting(true);
    try {
      await sbDelete(`/rest/v1/exercises?id=eq.${id}`);
      setNearby(prev => prev.filter(e => e.id !== id));
      setUnlocated(prev => prev.filter(e => e.id !== id));
    } catch(e) { console.error('Delete failed', e); }
    setConfirmDelete(null);
    setDeleting(false);
  };

  const cardBase = {
    display:'flex', flexDirection:'column', gap:8,
    padding:'18px 20px', cursor:'pointer', textAlign:'left', width:'100%',
    WebkitTapHighlightColor:'transparent',
    transition:'background 0.12s',
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:400,
        background:'rgba(0,0,0,0.25)',
      }}/>

      {/* Panel — bottom sheet style */}
      <div style={{
        position:'fixed', left:0, right:0, bottom:0, zIndex:401,
        background:'#fff', borderTop:`3px solid ${C.accent}`,
        borderRadius:'12px 12px 0 0',
        maxHeight:'70vh', overflowY:'auto',
        WebkitOverflowScrolling:'touch',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.6)',
      }}>
        {/* Handle */}
        <div style={{display:'flex',justifyContent:'center',padding:'10px 0 0'}}>
          <div style={{width:40,height:4,borderRadius:2,background:C.bord2}}/>
        </div>

        {panel === 'strategies' && (
          <div style={{padding:'8px 16px 32px',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
              letterSpacing:'0.18em',color:C.muted,padding:'4px 4px 10px',
              borderBottom:`1px solid ${C.bord}`}}>
              CHOOSE A PRACTICE STRATEGY
            </div>

            {/* Unguided card */}
            <button style={{...cardBase,border:`2px solid #888`,background:'transparent'}}
              onClick={onUnguided}
              onMouseEnter={e=>e.currentTarget.style.background=C.panel}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.6rem',
                letterSpacing:'0.12em',color:'#888'}}>UNGUIDED</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                fontSize:'1.05rem',color:C.cream,lineHeight:1.5}}>
                Practice your way. Tap done when finished to log the session.
              </div>
            </button>

            {/* ICU card */}
            <button style={{...cardBase,border:`2px solid ${C.accent}`,background:'transparent'}}
              onClick={onICU}
              onMouseEnter={e=>e.currentTarget.style.background=C.panel}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.6rem',
                letterSpacing:'0.12em',color:C.accent}}>INTERLEAVED CLICK-UP — APP GUIDED</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                fontSize:'1.05rem',color:C.cream,lineHeight:1.5}}>
                Build speed gradually — add one unit at a time, cycling through tempo increments.
              </div>
            </button>

            {/* RV card */}
            <button style={{...cardBase,border:`2px solid ${C.gold}`,background:'transparent'}}
              onClick={openRV}
              onMouseEnter={e=>e.currentTarget.style.background=C.panel}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.6rem',
                letterSpacing:'0.12em',color:C.gold}}>RHYTHMIC VARIATION — APP GUIDED</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                fontSize:'1.05rem',color:C.cream,lineHeight:1.5}}>
                Practice your passage in every rhythm pattern — a complete systematic workout.
              </div>
            </button>

            {/* SCU card */}
            <button style={{...cardBase,border:`2px solid #3db06a`,background:'transparent'}}
              onClick={onSCU}
              onMouseEnter={e=>e.currentTarget.style.background=C.panel}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.6rem',
                letterSpacing:'0.12em',color:'#3db06a'}}>SLOW CLICK-UP — APP GUIDED</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                fontSize:'1.05rem',color:C.cream,lineHeight:1.5}}>
                Nail 10 clean reps before advancing tempo. Track your progress over time.
              </div>
            </button>

            {/* Practice Journal link */}
            <button style={{...cardBase,border:`1px solid ${C.bord2}`,background:'transparent'}}
              onClick={onViewLog}
              onMouseEnter={e=>e.currentTarget.style.background=C.panel}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',
                letterSpacing:'0.12em',color:C.muted}}>📋 PRACTICE JOURNAL FOR THIS SPOT</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                fontSize:'0.95rem',color:C.muted,lineHeight:1.5}}>
                View your practice history and tempo progress here.
              </div>
            </button>
          </div>
        )}

        {panel === 'rv' && (
          <div style={{padding:'8px 16px 32px',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:10,
              padding:'4px 4px 10px',borderBottom:`1px solid ${C.bord}`}}>
              <button onClick={()=>setPanel('strategies')} style={{
                background:'none',border:'none',color:C.muted,cursor:'pointer',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
                letterSpacing:'0.1em',padding:'2px 0',
              }}>← BACK</button>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
                letterSpacing:'0.18em',color:C.muted,flex:1}}>RHYTHMIC VARIATION</div>
            </div>

            {/* Create new */}
            <button style={{...cardBase,border:`2px solid ${C.gold}`,background:'transparent'}}
              onClick={()=>onRV(null)}
              onMouseEnter={e=>e.currentTarget.style.background=C.panel}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.3rem',
                letterSpacing:'0.12em',color:C.gold}}>+ CREATE NEW EXERCISE</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                fontSize:'1rem',color:C.muted}}>Enter notes and generate a new set of patterns</div>
            </button>

            {/* Nearby saved exercises */}
            {loading && (
              <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.9rem',
                color:C.muted,padding:'12px 4px'}}>Loading saved exercises…</div>
            )}
            {!loading && nearby.length > 0 && (
              <>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
                  letterSpacing:'0.18em',color:C.muted,padding:'4px 4px 0'}}>
                  SAVED EXERCISES NEAR THIS SPOT
                </div>
                {nearby.map(ex=>(
                  <ExerciseCard key={ex.id} ex={ex}
                    confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
                    deleting={deleting} onDelete={deleteExercise} onOpen={(ex)=>{
                      // Adopt: link exercise to this spot if not already linked
                      if(selectedSpot?.id && ex.spot_id !== selectedSpot.id) {
                        sbPatch(`/rest/v1/exercises?id=eq.${ex.id}`, {spot_id: selectedSpot.id}).catch(()=>{});
                        ex = {...ex, spot_id: selectedSpot.id};
                      }
                      onRV(ex);
                    }}/>
                ))}
              </>
            )}
            {!loading && nearby.length === 0 && (
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                fontSize:'1rem',color:C.muted,padding:'4px 4px'}}>
                No saved exercises near this spot yet.
              </div>
            )}

          </div>
        )}
      </div>
    </>
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
   MUR SCREEN
═══════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════
   SCROLLABLE SCORE PANEL — auto-scrolls to tap Y position on arrival
═══════════════════════════════════════════════════════════════════════ */
function ZoomableScore({ src, tapPos, currentPage, totalPages, onPageChange, flex }) {
  const containerRef = useRef();
  const imgRef       = useRef();

  const scrollToTap = () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if(!img || !container || !tapPos || tapPos.page !== currentPage) return;
    // Wait for image to have real dimensions
    const imgH = img.naturalHeight && img.offsetHeight ? img.offsetHeight : 0;
    if(!imgH) return;
    const targetY = tapPos.y * imgH;
    container.scrollTop = Math.max(0, targetY - container.clientHeight * 0.3);
  };

  // Reset scroll when page changes
  useEffect(() => {
    if(containerRef.current) containerRef.current.scrollTop = 0;
  }, [currentPage]);

  return (
    <div ref={containerRef}
      style={{ position:'relative', background:'#e8e5e0',
        overflowY:'scroll', overflowX:'hidden',
        flex, minHeight:0, height:0,
        WebkitOverflowScrolling:'touch',
        touchAction:'pan-y',
      }}>

      <img ref={imgRef} src={src}
        onLoad={scrollToTap}
        style={{ width:'100%', height:'auto', display:'block',
          userSelect:'none', WebkitUserSelect:'none', WebkitTouchCallout:'none' }}
        onContextMenu={e=>e.preventDefault()}
        draggable={false} />

      {/* Page nav */}
      {totalPages > 1 && (
        <div style={{ position:'sticky', bottom:0, zIndex:10, display:'flex',
          alignItems:'center', justifyContent:'center', gap:12,
          padding:'8px 12px', background:'rgba(26,22,18,0.97)',
          borderTop:`1px solid ${C.bord}` }}>
          <button onClick={()=>onPageChange(p=>Math.max(0,p-1))}
            disabled={currentPage===0}
            style={{background:'none',border:'none',color:C.cream,
              fontSize:'1.2rem',cursor:'pointer',opacity:currentPage===0?0.3:1}}>←</button>
          <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.8rem',color:C.cream}}>
            p.{currentPage+1} / {totalPages}
          </span>
          <button onClick={()=>onPageChange(p=>Math.min(totalPages-1,p+1))}
            disabled={currentPage===totalPages-1}
            style={{background:'none',border:'none',color:C.cream,
              fontSize:'1.2rem',cursor:'pointer',opacity:currentPage===totalPages-1?0.3:1}}>→</button>
        </div>
      )}
    </div>
  );
}


/* ── Note display helper ────────────────────────────────────────────── */
function dn(n){return n.replace('##','\u{1D12A}').replace('bb','\u{1D12B}').replace('#','\u266F').replace('n','\u266E').replace(/([A-G])b/g,'$1\u266D');}

/* ── Concert to written pitch ───────────────────────────────────────── */
function transposePitch(noteName, semitones, preferFlats) {
  if (!semitones) return noteName;
  const SPC=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FPC=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const midi=murMidi(noteName)+semitones;
  const pc=((midi%12)+12)%12;
  const oct=Math.floor(midi/12)-1;
  return (preferFlats?FPC:SPC)[pc]+oct;
}

/* ── Enharmonic map ──────────────────────────────────────────────────── */
const ENARMAP={
  'C':['C','B#','Dbb'],'B#':['B#','C'],'Dbb':['Dbb','C'],
  'C#':['C#','Db'],'Db':['Db','C#'],
  'D':['D','C##','Ebb'],'C##':['C##','D'],'Ebb':['Ebb','D'],
  'D#':['D#','Eb'],'Eb':['Eb','D#'],
  'E':['E','Fb'],'Fb':['Fb','E'],
  'F':['F','E#'],'E#':['E#','F'],
  'F#':['F#','Gb'],'Gb':['Gb','F#'],
  'G':['G','F##','Abb'],'F##':['F##','G'],'Abb':['Abb','G'],
  'G#':['G#','Ab'],'Ab':['Ab','G#'],
  'A':['A','G##','Bbb'],'G##':['G##','A'],'Bbb':['Bbb','A'],
  'A#':['A#','Bb'],'Bb':['Bb','A#'],
  'B':['B','Cb','A##'],'Cb':['Cb','B'],'A##':['A##','B'],
};
function getEnharmonics(note){
  const m=note?.match(/^([A-G])(##|bb|#|b|n)?(\d)$/);
  if(!m)return[note];
  const letter=m[1],rawAcc=m[2]||'',oct=m[3];
  const baseAcc=rawAcc==='n'?'':rawAcc;
  return(ENARMAP[letter+baseAcc]||[letter+baseAcc]).map(s=>s+oct);
}

/* ── Respell popup ───────────────────────────────────────────────────── */
function RespellPopup({note,anchorY,onClose,onDelete,onUpdate}){
  const m=note?.match(/^([A-G])(##|bb|#|b|n)?(\d)$/);
  if(!m)return null;
  const letter=m[1],rawAcc=m[2]||'',oct=m[3];
  const baseAcc=rawAcc==='n'?'':rawAcc;
  const enh=getEnharmonics(note);
  const[custom,setCustom]=useState('');
  const okCustom=()=>{
    const v=custom.trim().replace(/\s/g,'');
    const m2=v.match(/^([A-G])(##|bb|#|b|n)?(\d)$/i);
    if(m2){onUpdate(m2[1].toUpperCase()+(m2[2]||'')+m2[3]);setCustom('');}
  };
  const FACCS=[
    {label:'\u25cb',acc:'',title:'no accidental'},
    {label:'\u266e',acc:'n',title:'natural'},
    {label:'\u266f',acc:'#',title:'sharp'},
    {label:'\u266d',acc:'b',title:'flat'},
    {label:'\u{1D12A}',acc:'##',title:'double sharp'},
    {label:'\u{1D12B}',acc:'bb',title:'double flat'},
  ];
  const popH=270,top=anchorY>popH+80?anchorY-popH-10:anchorY+34;
  return(
    <>
      <div onClick={e=>{e.stopPropagation();onClose();}}
        style={{position:'fixed',inset:0,zIndex:299}}/>
      <div onClick={e=>e.stopPropagation()} style={{
        position:'fixed',left:'50%',top,transform:'translateX(-50%)',
        zIndex:300,background:'#111009',border:`1px solid ${C.bord}`,
        width:300,boxShadow:'0 8px 40px rgba(0,0,0,0.85)',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          padding:'8px 14px',borderBottom:`1px solid ${C.bord}`,background:'#0d0b09'}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.8rem',
            letterSpacing:'0.22em',color:C.rule}}>RESPELL</span>
          <button onClick={onClose} style={{background:'none',border:'none',
            color:C.muted,cursor:'pointer',fontSize:'1.1rem',padding:'0 2px'}}>&times;</button>
        </div>
        <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.bord}`}}>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {enh.map(opt=>{
              const cur=opt===letter+baseAcc+oct;
              return<button key={opt} onClick={()=>onUpdate(opt)} style={{
                padding:'7px 14px',cursor:'pointer',WebkitTapHighlightColor:'transparent',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',letterSpacing:'0.06em',
                background:cur?C.accent:'#f0f0f0',border:`1px solid ${cur?C.accent:C.bord}`,
                color:cur?'white':C.cream,
              }}>{dn(opt)}</button>;
            })}
          </div>
        </div>
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.bord}`}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.58rem',
            letterSpacing:'0.2em',color:C.rule,marginBottom:5}}>TYPE ANY SPELLING</div>
          <div style={{display:'flex',gap:6}}>
            <input type="text" value={custom} onChange={e=>setCustom(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&okCustom()}
              placeholder="e.g. B#4, Fb3, Dbb4"
              style={{flex:1,background:'#0d0b09',border:`1px solid ${C.bord}`,
                color:C.cream,padding:'6px 8px',fontFamily:"'Inconsolata',monospace",
                fontSize:'0.78rem',outline:'none'}}/>
            <button onClick={okCustom} style={{background:C.accent,border:'none',color:'white',
              padding:'6px 14px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.8rem',
              letterSpacing:'0.1em',cursor:'pointer'}}>OK</button>
          </div>
        </div>
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.bord}`}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.58rem',
            letterSpacing:'0.2em',color:C.rule,marginBottom:5}}>FORCE ACCIDENTAL</div>
          <div style={{display:'flex',gap:4}}>
            {FACCS.map(opt=>{
              const act=rawAcc===opt.acc;
              return<button key={opt.acc} onClick={()=>onUpdate(letter+opt.acc+oct)} title={opt.title}
                style={{flex:1,padding:'7px 4px',cursor:'pointer',WebkitTapHighlightColor:'transparent',
                  fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',
                  background:act?C.accent:'#f0f0f0',border:`1px solid ${act?C.accent:C.bord}`,
                  color:act?'white':C.cream}}>{opt.label}</button>;
            })}
          </div>
        </div>
        <div style={{padding:'10px 14px'}}>
          <button onClick={onDelete} style={{width:'100%',padding:'8px',background:'none',
            border:'1px solid #444',color:'#e57373',fontFamily:"'Bebas Neue',sans-serif",
            fontSize:'0.78rem',letterSpacing:'0.12em',cursor:'pointer',
            WebkitTapHighlightColor:'transparent'}}>DELETE THIS NOTE</button>
        </div>
      </div>
    </>
  );
}

// Transpose semitones by instrument name (mirrors the data-t values in the select)
const INSTR_TRANSPOSE = {
  'Flute':0,'Oboe':0,'BbClar':-2,'AClar':-3,'Bassoon':0,
  'EbAlto':3,'TenorSax':-2,'EbBari':-7,'HornF':-5,
  'BbTrump':-2,'Trombone':0,'Violin':0,'Viola':0,'Cello':0,
  'Piano':0,'Other':0,
};

function MURScreen({ piece, pageImages, profile, savedExercise, tapPos, onBack, onDone }) {
  const land = useOrientation();
  const isLarge = useIsLarge();
  const [murSpotId, setMurSpotId] = useState(null);

  // Find or create a spot for this tap position
  useEffect(()=>{
    (async ()=>{
      const prof = profile || JSON.parse(localStorage.getItem('murProfile')||'{}');
      if(prof.email && piece?.id && tapPos) {
        const sid = await findOrCreateSpot(prof.email, piece.id, tapPos);
        setMurSpotId(sid);
      }
    })();
  },[]);

  // ── State ──────────────────────────────────────────────────────────
  const isLoadedExercise = !!savedExercise && !piece;
  const initGroup = savedExercise ? s2g(savedExercise.grouping) : null;
  const [activeGroup,setActiveGroup] = useState(initGroup);
  const [selNotes,setSelNotes]       = useState(savedExercise ? savedExercise.notes.split(',').filter(Boolean) : []);
  const [clef,setClef]               = useState(savedExercise?.clef||'treble');
  const [key,setKey]                 = useState(savedExercise?.key||'C');
  const [instrTranspose,setInstrTranspose] = useState(()=>INSTR_TRANSPOSE[savedExercise?.instrument||'']??0);
  const [accMode,setAccMode]         = useState('sharp');
  const [inputTab,setInputTab]       = useState('keys');
  const [exercises,setExercises]     = useState([]);
  const [exIdx,setExIdx]             = useState(0);
  const [generated,setGenerated]     = useState(false);
  const [docName,setDocName]         = useState(savedExercise?.doc_name||'');
  const [exerciseId,setExerciseId]   = useState(savedExercise?.id||null);
  const [origGroup]                  = useState(initGroup); // track original grouping for edit detection
  const [saving,setSaving]           = useState(false);
  const [playingIdx,setPlayingIdx]   = useState(-1);
  const playTimerRef = useRef(null);
  const [saveMsg,setSaveMsg]         = useState('');
  const [currentPage,setCurrentPage] = useState(tapPos?.page||0);
  const [insertAt,setInsertAt]       = useState(-1);
  const [editChip,setEditChip]       = useState(null);
  const [instrSelected,setInstrSelected] = useState(!!savedExercise);
  const [instrName,setInstrName]         = useState(savedExercise?.instrument||'');
  const [respellChip,setRespellChip]     = useState(null);
  const [showAttach,setShowAttach]   = useState(false);
  const [attachPieces,setAttachPieces] = useState([]);
  const [attachLoading,setAttachLoading] = useState(false);

  // Auto-generate when loading a saved exercise
  useEffect(()=>{
    if(isLoadedExercise && initGroup && savedExercise.notes) {
      const notes = savedExercise.notes.split(',').filter(Boolean);
      const sec = g2s(initGroup);
      const pats = MUR_DB.filter(p=>p.section===sec);
      setExercises(pats.map(p=>({pat:p,abc:null})));
      setExIdx(0);
      setGenerated(true);
    } else if(savedExercise && piece && savedExercise.notes) {
      // Loaded from RV overlay with a saved exercise — auto-generate
      const grp = s2g(savedExercise.grouping);
      const sec = g2s(grp);
      const pats = MUR_DB.filter(p=>p.section===sec);
      setExercises(pats.map(p=>({pat:p,abc:null})));
      setExIdx(0);
      setGenerated(true);
    }
  },[]);

  const loadAttachPieces = async () => {
    setAttachLoading(true);
    try {
      const r = await sbGet('/rest/v1/pieces?user_email=eq.'+encodeURIComponent(profile.email)+'&order=created_at.desc');
      setAttachPieces(await r.json()||[]);
    } catch { setAttachPieces([]); }
    setAttachLoading(false);
  };

  // ── Refs ───────────────────────────────────────────────────────────
  const acRef      = useRef(null);
  const pianoRef       = useRef(null);
  const [pianoMounted,setPianoMounted] = useState(0);
  const exDivRef       = useRef(null);
  const liveStaffRef   = useRef(null);
  const micRef     = useRef({active:false,stream:null,ctx:null,analyser:null,timer:null});
  const pianoScrollRef = useRef(null);

  // ── Audio ──────────────────────────────────────────────────────────
  function getAC() {
    if(!acRef.current) acRef.current = new (window.AudioContext||window.webkitAudioContext)();
    if(acRef.current.state==='suspended') acRef.current.resume();
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

  // ── Piano ──────────────────────────────────────────────────────────
  const PN = useRef(null);
  if(!PN.current) {
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

  const addNote = useCallback((raw) => {
    const spelled = accMode==='flat'&&{'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'}[raw.slice(0,-1)]
      ? ({'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'}[raw.slice(0,-1)]+raw.slice(-1))
      : raw;
    setSelNotes(prev=>{
      if(insertAt>=0){
        const next=[...prev];next.splice(insertAt,0,spelled);return next;
      }
      return [...prev,spelled];
    });
    if(insertAt>=0) setInsertAt(i=>i+1);
  },[accMode,insertAt]);

  // Stable ref callback — only fires on actual mount/unmount, not every render
  const pianoRefCb = useCallback(el=>{
    pianoRef.current=el;
    if(el) setPianoMounted(c=>c+1);
  },[]);

  const addNoteRef=useRef(null);
  useEffect(()=>{addNoteRef.current=addNote;},[addNote]);

  useEffect(()=>{
    const svg=pianoRef.current;
    if(!svg) return;
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
      const r=mkS('rect',{x:i*ww+0.5,y:0.5,width:ww-1,height:VH-1,rx:2,fill:'#fdfaf5',stroke:'#ccc','stroke-width':0.7,'data-note':note.name});
      svg.appendChild(r);
      if(note.name.charAt(0)==='C'&&note.name.indexOf('#')===-1){
        if(note.name==='C4'){
          svg.appendChild(mkS('circle',{cx:i*ww+ww/2,cy:VH-16,r:3,fill:'#8b3a1a','pointer-events':'none'}));
        }
        const t=mkS('text',{x:i*ww+ww/2,y:VH-5,'text-anchor':'middle','font-size':note.name==='C4'?8:6,fill:note.name==='C4'?'#8b3a1a':'#bbb','font-family':'Inconsolata,monospace','pointer-events':'none'});
        t.textContent=note.name;svg.appendChild(t);
      }
    });
    let wi=0;
    pn.forEach(note=>{
      if(note.white){wi++;return;}
      const bx=(wi-1)*ww+ww-bw/2+ww*0.07;
      svg.appendChild(mkS('rect',{x:bx,y:0,width:bw,height:bh,rx:2,fill:'#1a1612',stroke:'#111','stroke-width':0.5,'data-note':note.name}));
      const FMAP={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};
      const base=note.name.slice(0,-1);
      const spelled=accMode==='flat'?(FMAP[base]||base):base;
      const lbl=mkS('text',{x:bx+bw/2,y:bh*0.62,'text-anchor':'middle','dominant-baseline':'middle',
        'font-size':5.8,'font-weight':'bold',fill:'#c8b89a','font-family':'Inconsolata,monospace','pointer-events':'none'});
      lbl.textContent=spelled.replace('#','\u266F').replace(/([A-G])b/,'$1\u266D');
      svg.appendChild(lbl);
    });

    let alive=true;
    const handlePress = e => {
      if(!alive)return;
      e.preventDefault();
      const pt=e.changedTouches?{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY}:{x:e.clientX,y:e.clientY};
      let k=document.elementFromPoint(pt.x,pt.y);
      while(k&&k!==svg){if(k.getAttribute&&k.getAttribute('data-note'))break;k=k.parentNode;}
      if(!k||!k.getAttribute||!k.getAttribute('data-note')) return;
      const raw=k.getAttribute('data-note');const isBlack=raw.indexOf('#')!==-1;
      k.setAttribute('fill','#c8601a');
      setTimeout(()=>k.setAttribute('fill',isBlack?'#1a1612':'#fdfaf5'),160);
      // Always play sound, only add note if group is selected
      playNote(raw);
      if(!activeGroup) return;
      addNote(raw);
    };

    svg.addEventListener('click',handlePress);
    let _tx=0,_ty=0,_tswiped=false,_ttimer=null;
    svg.addEventListener('touchstart',e=>{
      _tx=e.touches[0].clientX;_ty=e.touches[0].clientY;
      _tswiped=false;
      _ttimer=setTimeout(()=>{if(!_tswiped)handlePress(e);_ttimer=null;},150);
      e.preventDefault();
    },{passive:false});
    svg.addEventListener('touchmove',e=>{
      const dx=e.touches[0].clientX-_tx;
      const dy=e.touches[0].clientY-_ty;
      if(!_tswiped&&(Math.abs(dx)>8||Math.abs(dy)>8)){
        _tswiped=true;
        if(_ttimer){clearTimeout(_ttimer);_ttimer=null;}
      }
      if(_tswiped&&pianoScrollRef.current){
        pianoScrollRef.current.scrollLeft-=dx;
        _tx=e.touches[0].clientX;
        _ty=e.touches[0].clientY;
      }
    },{passive:true});
    svg.addEventListener('touchend',e=>{if(_ttimer){clearTimeout(_ttimer);_ttimer=null;if(!_tswiped)handlePress(e);}},{passive:true});
    return()=>{alive=false;};
  },[activeGroup,addNote,pianoMounted,accMode]);

  // Scroll piano to centre on C4 every time it mounts
  useEffect(()=>{
    if(!pianoMounted||!pianoScrollRef.current) return;
    // 45 white keys total (A1,B1 + 6 octaves×7 + C8); C4 is index 16
    const C4_INDEX=16, TOTAL_WHITES=45;
    const pxPerKey=2200/TOTAL_WHITES;
    const c4px=C4_INDEX*pxPerKey;
    const container=pianoScrollRef.current;
    const scrollTo=c4px-container.clientWidth/2+pxPerKey/2;
    container.scrollLeft=Math.max(0,scrollTo);
  },[pianoMounted]);

  // ── Live staff preview — renders current notes as simple scale ─────
  useEffect(()=>{
    const ABCJS = window.ABCJS;
    const div = liveStaffRef.current;
    if(!ABCJS || !div) return;
    const abcClef = clef==='bass'?' clef=bass':clef==='alto'?' clef=alto':clef==='tenor'?' clef=tenor':'';
    const w = Math.max((div.offsetWidth||400)-16, 200);
    if(!selNotes.length) {
      // Show empty staff with just the clef — no time sig
      const abc=`X:1\nM:none\nL:1/32\nK:C${abcClef}\n|z32|`;
      try {
        ABCJS.renderAbc(div, abc, {
          scale:1.0, staffwidth:w,
          paddingright:8,paddingleft:8,paddingbottom:5,paddingtop:5,
          add_classes:true,
        });
        div.querySelectorAll('svg path,svg rect,svg ellipse,svg line,svg text').forEach(el=>{
          el.style.fill='#1a1208'; el.style.stroke='#1a1208';
        });
      } catch(e){}
      return;
    }
    const abcNotes = selNotes.map(n=>{
      const m=n.match(/^([A-G])(##|bb|#|b|n)?(\d)$/); if(!m) return 'C8';
      const pc=m[1],acc=m[2]||'',oct=parseInt(m[3]);
      const prefix=acc==='##'?'^^':acc==='bb'?'__':acc==='#'?'^':acc==='b'?'_':acc==='n'?'=':'';
      const letter=oct<=4?pc:pc.toLowerCase();
      const octMod=oct===3?',':(oct===2?',,':(oct===1?',,,':(oct===6?"'":(oct===7?"''":''))));
      return prefix+letter+octMod+'8';
    }).join(' ');
    const abc=`X:1\nM:none\nL:1/32\nK:C${abcClef}\n|${abcNotes}|`;
    try {
      ABCJS.renderAbc(div, abc, {
        scale:1.0, staffwidth:w,
        paddingright:8,paddingleft:8,paddingbottom:5,paddingtop:5,
        add_classes:true,
      });
      div.querySelectorAll('svg path,svg rect,svg ellipse,svg line,svg text').forEach(el=>{
        el.style.fill='#1a1208'; el.style.stroke='#1a1208';
      });
    } catch(e){}
  },[selNotes,clef,generated]);

  // ── ABCJS exercise rendering ───────────────────────────────────────
  useEffect(()=>{
    if(!generated||!exercises.length) return;
    const ABCJS=window.ABCJS;
    if(!ABCJS) return;
    const ex=exercises[exIdx];
    if(!ex) return;
    const div=exDivRef.current;
    if(!div) return;
    div.innerHTML='';
    const abc=buildAbcString(ex.pat,selNotes,clef,key);
    try {
      ABCJS.renderAbc(div,abc,{
        scale:1.1,staffwidth:Math.min(div.offsetWidth-20,860),
        paddingright:20,paddingleft:10,paddingbottom:10,paddingtop:10,
        add_classes:true,
        wrap:{minSpacing:1.2,maxSpacing:2.8,preferredMeasuresPerLine:land?4:2}
      });
      // Force dark ink
      div.querySelectorAll('svg path,svg rect,svg ellipse,svg line,svg text').forEach(el=>{
        el.style.fill='#1a1208';el.style.stroke='#1a1208';
      });
    } catch(e){}
  },[generated,exIdx,exercises,clef,key,selNotes,land]);

  // ── Generate ───────────────────────────────────────────────────────
  const generate = async () => {
    if(!activeGroup||!selNotes.length||!docName.trim()) return;
    const sec=g2s(activeGroup);
    const pats=MUR_DB.filter(p=>p.section===sec);
    setExercises(pats.map(p=>({pat:p,abc:null})));
    setExIdx(0);
    setGenerated(true);
    // Auto-save; surface any failure so the user knows
    const saved = await saveExercise();
    if(saved === false) {
      setSaveMsg('⚠ Exercise could not be saved — check your connection and try again.');
    }
    // Log practice session (best-effort, never blocks)
    try {
      const prof = JSON.parse(localStorage.getItem('murProfile')||'{}');
      if(prof.email) {
        await sbPost('/rest/v1/practice_logs', {
          user_email: prof.email,
          spot_id: murSpotId,
          piece_id: piece?.id||null,
          strategy: 'mur',
          notes: `grouping: ${sec}, ${selNotes.length} notes`,
          session_date: localDate(),
        });
      }
    } catch(e){}
  };

  // ── Save ───────────────────────────────────────────────────────────
  const [dupWarning, setDupWarning] = useState(false);

  const saveExercise = async (force=false) => {
    if(!selNotes.length||!activeGroup) return false;
    if(!docName.trim()) { setSaveMsg('Please add a title first.'); return false; }
    setSaving(true); setSaveMsg(''); setDupWarning(false);
    try {
      const payload = {
        user_email:profile.email,doc_name:docName.trim(),
        grouping:g2s(activeGroup),clef,key,notes:selNotes.join(','),
        instrument:instrName||profile.instrument||'',
        piece_id:piece?.id||null,
        score_page:tapPos?.page??null,
        score_y:tapPos?.y??null,
        spot_id:murSpotId||null,
      };

      // If editing an existing exercise with same grouping, update it
      if(exerciseId && !force && activeGroup === origGroup) {
        const res = await sbPatch(`/rest/v1/exercises?id=eq.${exerciseId}`, payload);
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        setSaveMsg('Updated!'); setTimeout(()=>setSaveMsg(''),2500);
        setSaving(false);
        return true;
      }

      // Creating new — duplicate check
      if(!force) {
        const r = await sbGet(
          `/rest/v1/exercises?user_email=eq.${encodeURIComponent(profile.email)}&notes=eq.${encodeURIComponent(selNotes.join(','))}&grouping=eq.${encodeURIComponent(g2s(activeGroup))}&limit=1`
        );
        const existing = await r.json();
        if(existing?.length > 0 && existing[0].id !== exerciseId) {
          setSaveMsg('');
          setDupWarning(true);
          setSaving(false);
          return true;
        }
      }
      const res = await sbPost('/rest/v1/exercises', payload);
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      if(rows?.[0]?.id) setExerciseId(rows[0].id);
      setSaveMsg('Saved!'); setTimeout(()=>setSaveMsg(''),2500);
      setSaving(false);
      return true;
    } catch(e) {
      setSaveMsg('Save failed.');
      setSaving(false);
      return false;
    }
  };

  // ── Playback ───────────────────────────────────────────────────────
  const [passagePlaying,setPassagePlaying] = useState(false);
  const passageTimersRef = useRef([]);

  const playPassage = () => {
    if(passagePlaying){
      passageTimersRef.current.forEach(clearTimeout);
      passageTimersRef.current=[];
      setPassagePlaying(false);
      return;
    }
    if(!selNotes.length) return;
    setPassagePlaying(true);
    const timers = selNotes.map((n,i)=>setTimeout(()=>playNote(n),i*520));
    const done = setTimeout(()=>setPassagePlaying(false), selNotes.length*520+200);
    passageTimersRef.current=[...timers,done];
  };

  const activeOscRef = useRef([]);

  const stopPlayback = () => {
    if(playTimerRef.current){clearTimeout(playTimerRef.current);playTimerRef.current=null;}
    activeOscRef.current.forEach(o=>{try{o.stop();}catch(e){}}); 
    activeOscRef.current=[];
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
    let pi=0,t=0;const ac=getAC();
    const scheduled=[];
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
    activeOscRef.current=[];
    scheduled.forEach(({time,note})=>{
      const st=ac.currentTime+time;
      const f=440*Math.pow(2,(murMidi(note)+instrTranspose-69)/12);
      const o=ac.createOscillator(),g=ac.createGain();
      o.connect(g);g.connect(ac.destination);o.type='triangle';
      o.frequency.setValueAtTime(f,st);
      g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.3,st+0.01);
      g.gain.exponentialRampToValueAtTime(0.001,st+0.45);
      o.start(st);o.stop(st+0.5);
      activeOscRef.current.push(o);
    });
    playTimerRef.current=setTimeout(()=>{setPlayingIdx(-1);activeOscRef.current=[];},(t+0.2)*1000);
  };

  // Keep playExercise for single-exercise mode
  const playExercise = () => playExerciseAt(exIdx);

  // ── Mic pitch detection ────────────────────────────────────────────
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
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

  const [micStatus,setMicStatus] = useState('');
  const [micActive,setMicActive] = useState(false);

  const toggleMic = async () => {
    const mic=micRef.current;
    if(mic.active){
      mic.active=false;
      if(mic.timer)clearTimeout(mic.timer);
      if(mic.stream)mic.stream.getTracks().forEach(t=>t.stop());
      if(mic.ctx)mic.ctx.close();
      mic.stream=mic.ctx=mic.analyser=null;
      setMicActive(false);setMicStatus('');
      return;
    }
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
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
        if(lastSound>0&&now-lastSound>3000){
          mic.active=false;
          if(mic.timer)clearTimeout(mic.timer);
          if(mic.stream)mic.stream.getTracks().forEach(t=>t.stop());
          if(mic.ctx)mic.ctx.close();
          mic.stream=mic.ctx=mic.analyser=null;
          setMicActive(false);setMicStatus('');
          return;
        }
        if(now<lockout){mic.timer=setTimeout(detect,25);return;}
        const note=freq>0?freqToNote(freq):null;
        if(rms<0.008){noteActive=false;stableCount=0;lastFreq=0;}
        else if(note){
          if(!noteActive){noteActive=true;stableCount=1;lastFreq=freq;}
          else {
            const prev=lastFreq>0?freqToNote(lastFreq):null;
            if(note===prev||Math.abs(freq-lastFreq)/lastFreq<0.10){
              lastFreq=(lastFreq+freq)/2;stableCount++;
              setMicStatus(note+' '+stableCount+'/2');
              if(stableCount>=2){
                const written=accMode==='flat'&&({'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'}[note.slice(0,-1)])?({'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'}[note.slice(0,-1)]+note.slice(-1)):note;
                const writtenT=transposePitch(written,-instrTranspose,accMode==='flat');
                noteActive=false;stableCount=0;lastFreq=0;
                lockout=now+800;
                addNoteRef.current(writtenT);
                setMicStatus(writtenT);
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
    if(mic.active){mic.active=false;if(mic.timer)clearTimeout(mic.timer);if(mic.stream)mic.stream.getTracks().forEach(t=>t.stop());if(mic.ctx)mic.ctx.close();}
  },[]);

  // ── Chip helpers ───────────────────────────────────────────────────
  const removeNote = i => { setSelNotes(prev=>prev.filter((_,j)=>j!==i)); };
  const flipNote   = i => { setSelNotes(prev=>{const n=[...prev];n[i]=((n2,idx)=>{const m=n2.match(/^([A-G])(##|bb|#|b)?(\d)$/);if(!m)return n2;const pc=m[1]+(m[2]||''),oct=parseInt(m[3]),next={'C':'B#','B#':'C##','C##':'Db','Db':'C#','C#':'Dbb','Dbb':'C','D':'D##','D##':'Ebb','Ebb':'D#','D#':'Eb','Eb':'D','E':'Fb','Fb':'Ebb','E#':'F','F':'E#','F#':'Gb','Gb':'F##','F##':'G','G':'Gbb','Gbb':'F#','G#':'Ab','Ab':'G##','G##':'A','A':'Abb','Abb':'G#','A#':'Bb','Bb':'A##','A##':'B','B':'Cbb','Cbb':'A#','B#':'C','Cb':'B'}[pc];if(!next)return n2;return next+((pc==='B#')?oct+1:(pc==='Cb')?oct-1:oct);})(n[i],i);return n;}); };
  function dn(n){return n.replace('##','\uD834\uDD2A').replace('bb','\uD834\uDD2B').replace('#','\u266F').replace(/([A-G])b/g,'$1\u266D');}

  const canGenerate = activeGroup && selNotes.length>0;

  const InsBtn = ({idx}) => (
    <button onClick={()=>setInsertAt(insertAt===idx?-1:idx)} style={{
      width:20,height:20,borderRadius:'50%',flexShrink:0,
      border:`1px solid ${insertAt===idx?C.accent:C.bord}`,
      background:insertAt===idx?C.accent:'none',
      color:insertAt===idx?'white':C.rule,
      cursor:'pointer',padding:0,fontSize:'0.75rem',lineHeight:1,
      WebkitTapHighlightColor:'transparent',
    }}>+</button>
  );

  // ── Group buttons ──────────────────────────────────────────────────
  const GRP_SVGS = {
    3: <svg viewBox="0 0 52 36" width="42" height="28"><line x1="11" y1="7" x2="39" y2="7" stroke="#333333" strokeWidth="2.5"/><line x1="11" y1="7" x2="11" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="6" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,6,30)"/><line x1="25" y1="7" x2="25" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="20" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,20,30)"/><line x1="39" y1="7" x2="39" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="34" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,34,30)"/></svg>,
    4: <svg viewBox="0 0 54 36" width="42" height="28"><line x1="10" y1="7" x2="49" y2="7" stroke="#333333" strokeWidth="2.5"/><line x1="10" y1="12" x2="49" y2="12" stroke="#333333" strokeWidth="2.5"/><line x1="10" y1="7" x2="10" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="5" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,5,30)"/><line x1="23" y1="7" x2="23" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="18" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,18,30)"/><line x1="36" y1="7" x2="36" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="31" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,31,30)"/><line x1="49" y1="7" x2="49" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="44" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,44,30)"/></svg>,
    5: <svg viewBox="0 0 68 44" width="50" height="34"><text x="35" y="6" textAnchor="middle" fontSize="8" fill="#333333" fontFamily="serif" fontWeight="bold">5</text><line x1="4" y1="9" x2="4" y2="13" stroke="#333333" strokeWidth="1.5"/><line x1="4" y1="11" x2="66" y2="11" stroke="#333333" strokeWidth="1.5"/><line x1="66" y1="9" x2="66" y2="13" stroke="#333333" strokeWidth="1.5"/><line x1="10" y1="17" x2="62" y2="17" stroke="#333333" strokeWidth="2.5"/><line x1="10" y1="17" x2="10" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="5" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,5,37)"/><line x1="23" y1="17" x2="23" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="18" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,18,37)"/><line x1="36" y1="17" x2="36" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="31" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,31,37)"/><line x1="49" y1="17" x2="49" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="44" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,44,37)"/><line x1="62" y1="17" x2="62" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="57" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,57,37)"/></svg>,
    6: <svg viewBox="0 0 74 36" width="56" height="28"><line x1="10" y1="7" x2="34" y2="7" stroke="#333333" strokeWidth="2.5"/><line x1="46" y1="7" x2="70" y2="7" stroke="#333333" strokeWidth="2.5"/><line x1="10" y1="7" x2="10" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="5" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,5,30)"/><line x1="22" y1="7" x2="22" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="17" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,17,30)"/><line x1="34" y1="7" x2="34" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="29" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,29,30)"/><line x1="46" y1="7" x2="46" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="41" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,41,30)"/><line x1="58" y1="7" x2="58" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="53" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,53,30)"/><line x1="70" y1="7" x2="70" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="65" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,65,30)"/></svg>,
    7: <svg viewBox="0 0 80 44" width="60" height="34"><text x="40" y="6" textAnchor="middle" fontSize="8" fill="#333333" fontFamily="serif" fontWeight="bold">7</text><line x1="3" y1="9" x2="3" y2="13" stroke="#333333" strokeWidth="1.5"/><line x1="3" y1="11" x2="77" y2="11" stroke="#333333" strokeWidth="1.5"/><line x1="77" y1="9" x2="77" y2="13" stroke="#333333" strokeWidth="1.5"/><line x1="9" y1="17" x2="75" y2="17" stroke="#333333" strokeWidth="2.5"/><line x1="9" y1="22" x2="75" y2="22" stroke="#333333" strokeWidth="2.5"/><line x1="9" y1="17" x2="9" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="4" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,4,37)"/><line x1="20" y1="17" x2="20" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="15" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,15,37)"/><line x1="31" y1="17" x2="31" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="26" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,26,37)"/><line x1="42" y1="17" x2="42" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="37" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,37,37)"/><line x1="53" y1="17" x2="53" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="48" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,48,37)"/><line x1="64" y1="17" x2="64" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="59" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,59,37)"/><line x1="75" y1="17" x2="75" y2="35" stroke="#333333" strokeWidth="1.8"/><ellipse cx="70" cy="37" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,70,37)"/></svg>,
    8: <svg viewBox="0 0 90 36" width="68" height="28"><line x1="9" y1="7" x2="86" y2="7" stroke="#333333" strokeWidth="2.5"/><line x1="9" y1="12" x2="86" y2="12" stroke="#333333" strokeWidth="2.5"/><line x1="9" y1="7" x2="9" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="4" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,4,30)"/><line x1="20" y1="7" x2="20" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="15" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,15,30)"/><line x1="31" y1="7" x2="31" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="26" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,26,30)"/><line x1="42" y1="7" x2="42" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="37" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,37,30)"/><line x1="53" y1="7" x2="53" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="48" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,48,30)"/><line x1="64" y1="7" x2="64" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="59" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,59,30)"/><line x1="75" y1="7" x2="75" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="70" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,70,30)"/><line x1="86" y1="7" x2="86" y2="28" stroke="#333333" strokeWidth="1.8"/><ellipse cx="81" cy="30" rx="5.5" ry="3.5" fill="#333333" transform="rotate(-20,81,30)"/></svg>,
  };

  // ── Score panel ────────────────────────────────────────────────────
  const AttachPanel = (
    <div style={{background:'#fff',border:`1px dashed ${C.bord2}`,padding:'16px',
      display:'flex',flexDirection:'column',gap:10,flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:'0.95rem',color:C.muted}}>
          No score attached &mdash; optional
        </div>
        <button onClick={()=>{setShowAttach(s=>!s);if(!showAttach)loadAttachPieces();}}
          style={{background:'none',border:`1px solid ${C.bord2}`,color:C.cream,
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.72rem',
            letterSpacing:'0.1em',padding:'4px 12px',cursor:'pointer',flexShrink:0}}>
          {showAttach?'CANCEL':'ATTACH SCORE'}
        </button>
      </div>
      {showAttach && (
        <div style={{maxHeight:180,overflowY:'auto'}}>
          {attachLoading && <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',color:C.muted,padding:8}}>Loading...</div>}
          {attachPieces.map(p=>(
            <div key={p.id} onClick={()=>{/* would need to trigger PDF load in parent — for now just note */setShowAttach(false);setSaveMsg('Score attached — reload to see it');}}
              style={{padding:'10px 12px',borderBottom:`1px solid ${C.bord}`,cursor:'pointer',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
                letterSpacing:'0.08em',color:C.cream}}
              onMouseEnter={e=>e.currentTarget.style.background=C.ink}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {p.title||'Untitled'}
              <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.65rem',color:C.muted,marginLeft:8}}>{p.file_type?.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const ScorePanel = pageImages.length>0 ? (
    <ZoomableScore
      src={pageImages[currentPage]}
      tapPos={tapPos}
      currentPage={currentPage}
      totalPages={pageImages.length}
      onPageChange={setCurrentPage}
      flex={land?'1 1 0':'0 0 42%'}
    />
  ) : null;

  // ── Exercise display ───────────────────────────────────────────────
  // Large screen: all exercises rendered at once, each with its own play button
  // Small screen: one at a time with nav arrows
  const handleRVDone = () => {
    try {
      const prof = profile || JSON.parse(localStorage.getItem('murProfile')||'{}');
      if(prof.email) {
        sbPost('/rest/v1/practice_logs', {
          user_email: prof.email,
          spot_id: murSpotId,
          piece_id: piece?.id||null,
          session_date: localDate(),
          strategy: 'mur',
          notes: `grouping: ${g2s(activeGroup)}, ${selNotes.length} notes, ${docName||'untitled'}`,
        }).catch(()=>{});
      }
    } catch(e){}
    // Go back to score if we came from one, otherwise just close exercises
    if(piece && pageImages.length>0) { (onDone||onBack)(); } else { setGenerated(false); }
  };

  const [exporting, setExporting] = useState(false);

  const exportPdf = async () => {
    setExporting(true);
    try {
      // Load jsPDF dynamically
      if(!window.jspdf) {
        await new Promise((res,rej)=>{
          const s=document.createElement('script');
          s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
          s.onload=res; s.onerror=rej;
          document.head.appendChild(s);
        });
      }
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({orientation:'portrait', unit:'pt', format:'letter'});
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 36;
      const usableW = pageW - margin*2;
      let curY = margin;

      // Title
      pdf.setFont('helvetica','bold');
      pdf.setFontSize(16);
      pdf.text(docName || 'Rhythm Exercises', margin, curY + 14);
      curY += 30;
      pdf.setFont('helvetica','normal');
      pdf.setFontSize(9);
      pdf.text(`${selNotes.length} notes · ${g2s(activeGroup)} · Key: ${murKey} · ${new Date().toLocaleDateString()}`, margin, curY);
      curY += 20;

      // Render each exercise SVG to canvas then to PDF
      for(let i=0; i<exercises.length; i++) {
        try {
          // Use the already-rendered on-screen SVG if available, otherwise render fresh
          let svg = document.querySelector('#mur-ex-'+i+' svg');
          let tmpDiv = null;

          if(!svg) {
            tmpDiv = document.createElement('div');
            tmpDiv.style.cssText='position:fixed;left:0;top:0;width:700px;background:white;opacity:0;pointer-events:none;z-index:-1;';
            document.body.appendChild(tmpDiv);
            const abc = buildAbcString(exercises[i].pat, selNotes, clef, murKey);
            window.ABCJS.renderAbc(tmpDiv, abc, {
              scale:1.3, staffwidth: Math.round(usableW * 1.25),
              paddingright:10,paddingleft:10,paddingbottom:4,paddingtop:4,
              add_classes:true,
              wrap:{minSpacing:1.5, maxSpacing:2.6, preferredMeasuresPerLine:4},
            });
            svg = tmpDiv.querySelector('svg');
          }

          if(!svg) { if(tmpDiv) document.body.removeChild(tmpDiv); continue; }

          // Clone the SVG so we don't modify the on-screen version
          const clone = svg.cloneNode(true);
          clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
          clone.querySelectorAll('path,rect,ellipse,line,polygon,polyline').forEach(el=>{
            const fill = el.getAttribute('fill');
            const stroke = el.getAttribute('stroke');
            if(fill && fill !== 'none' && fill !== 'white' && fill !== '#ffffff') el.setAttribute('fill','#000');
            if(stroke && stroke !== 'none' && stroke !== 'white') el.setAttribute('stroke','#000');
          });
          clone.querySelectorAll('text').forEach(el=>{ el.setAttribute('fill','#000'); });

          const svgW = parseFloat(svg.getAttribute('width')) || svg.clientWidth || 600;
          const svgH = parseFloat(svg.getAttribute('height')) || svg.clientHeight || 80;
          clone.setAttribute('width', svgW);
          clone.setAttribute('height', svgH);

          const svgStr = new XMLSerializer().serializeToString(clone);
          
          // Try multiple approaches for Safari compatibility
          const canvas = document.createElement('canvas');
          const scale = 2;
          canvas.width = svgW * scale;
          canvas.height = svgH * scale;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'white';
          ctx.fillRect(0,0,canvas.width,canvas.height);

          const img = new Image();
          img.width = svgW * scale;
          img.height = svgH * scale;

          // Use blob URL (works better on Safari than data URL for SVGs)
          const svgBlob = new Blob([svgStr], {type:'image/svg+xml;charset=utf-8'});
          const blobUrl = URL.createObjectURL(svgBlob);

          let loaded = false;
          try {
            await new Promise((res, rej)=>{
              img.onload = ()=>{ loaded=true; res(); };
              img.onerror = rej;
              img.src = blobUrl;
            });
          } catch(imgErr) {
            // Fallback: try data URL
            console.warn('Blob URL failed for exercise', i, ', trying data URL');
            try {
              const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
              await new Promise((res, rej)=>{
                img.onload = ()=>{ loaded=true; res(); };
                img.onerror = rej;
                img.src = dataUrl;
              });
            } catch(e2) {
              console.error('Both SVG load methods failed for exercise', i);
            }
          }

          URL.revokeObjectURL(blobUrl);
          if(tmpDiv) document.body.removeChild(tmpDiv);

          if(!loaded) continue;

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          let imgData;
          try { imgData = canvas.toDataURL('image/png'); }
          catch(taintErr) { console.error('Canvas tainted for exercise', i); continue; }

          const drawW = usableW;
          const drawH = (svgH / svgW) * drawW;

        // Check if we need a new page
        if(curY + drawH + 20 > pageH - margin) {
          pdf.addPage();
          curY = margin;
        }

        // Exercise label
        pdf.setFont('helvetica','normal');
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`${i+1}. ${exercises[i].pat.timeSig}  ·  ${exercises[i].pat.section.replace(' Rhythm Patterns','')}`, margin, curY + 8);
        pdf.setTextColor(0);
        curY += 12;

        pdf.addImage(imgData, 'PNG', margin, curY, drawW, drawH);
        curY += drawH + 8;
        } catch(exErr) { console.error('Failed to export exercise', i, exErr); }
      }

      // Download
      const filename = `${(docName||'rhythm-exercises').replace(/[^a-z0-9]/gi,'_')}.pdf`;
      pdf.save(filename);
    } catch(e) {
      console.error('PDF export failed', e);
      const msg = e instanceof Error ? e.message : (typeof e === 'string' ? e : JSON.stringify(e));
      alert('PDF export failed: ' + (msg||'Unknown error') + '\n\nCheck console for details.');
    }
    setExporting(false);
  };

  const ExercisePanelLarge = generated && exercises.length>0 && (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <div style={{display:'flex',alignItems:'center',gap:8,
        padding:'6px 14px',flexShrink:0,background:'#fff',borderBottom:`1px solid ${C.bord}`}}>
        <Btn onClick={()=>setGenerated(false)} style={{fontSize:'0.85rem',padding:'7px 14px',flexShrink:0}}>
          ← EDIT
        </Btn>
        {docName && (
          <span style={{flex:1,fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',
            letterSpacing:'0.1em',color:C.cream,overflow:'hidden',textOverflow:'ellipsis',
            whiteSpace:'nowrap'}}>{docName}</span>
        )}
        <button onClick={exportPdf} disabled={exporting} style={{
          background:'#4a78ff',border:'1px solid #4a78ff',
          color:'white',padding:'7px 14px',cursor: exporting?'wait':'pointer',
          fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
          letterSpacing:'0.1em',flexShrink:0,WebkitTapHighlightColor:'transparent',
          opacity:exporting?0.6:1,
        }}>{exporting?'EXPORTING...':'📄 EXPORT PDF'}</button>
        <button onClick={handleRVDone} style={{
          background:C.accent,border:`1px solid ${C.accent}`,
          color:'white',padding:'7px 14px',cursor:'pointer',
          fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
          letterSpacing:'0.1em',flexShrink:0,WebkitTapHighlightColor:'transparent',
        }}>DONE ✓</button>
      </div>
      {showAttach && (
        <div style={{flexShrink:0,background:'#fff',borderBottom:`1px solid ${C.bord}`,padding:'8px 14px'}}>
          {attachLoading && <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',color:C.muted}}>Loading...</span>}
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {attachPieces.map(p=>(
              <button key={p.id} onClick={()=>setShowAttach(false)}
                style={{background:'#fff',border:`1px solid ${C.bord2}`,color:C.cream,
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.8rem',
                  letterSpacing:'0.08em',padding:'5px 12px',cursor:'pointer'}}>
                {p.title||'Untitled'}
              </button>
            ))}
          </div>
        </div>
      )}
      <AllExercisesView exercises={exercises} selNotes={selNotes} clef={clef} murKey={key} playingIdx={playingIdx} onPlay={playExerciseAt} land={land} />
    </div>
  );

  const ExercisePanelSmall = generated && exercises.length>0 && (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'6px 10px',flexShrink:0,background:'#fff',borderTop:`1px solid ${C.bord}`}}>
        <button onClick={()=>setGenerated(false)}
          style={{background:'none',border:`1px solid ${C.bord}`,color:C.cream,
            padding:'5px 10px',cursor:'pointer',fontFamily:"'Bebas Neue',sans-serif",
            fontSize:'0.8rem',letterSpacing:'0.1em',flexShrink:0,WebkitTapHighlightColor:'transparent'}}>
          ← EDIT
        </button>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>setExIdx(i=>Math.max(0,i-1))} disabled={exIdx===0}
            style={{background:'none',border:`1px solid ${C.bord}`,color:C.cream,
              width:36,height:36,cursor:'pointer',fontSize:'1rem',opacity:exIdx===0?0.35:1}}>&#8592;</button>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',color:C.muted}}>
              {exIdx+1} / {exercises.length}
            </span>
            <button onClick={()=>playExerciseAt(exIdx)}
              style={{background:playingIdx===exIdx?C.accent:'none',border:`1px solid ${playingIdx===exIdx?C.accent:C.bord}`,
                color:'white',width:32,height:32,borderRadius:'50%',cursor:'pointer',fontSize:'0.85rem',
                display:'flex',alignItems:'center',justifyContent:'center'}}>
              {playingIdx===exIdx?'\u25A0':'\u25B6'}
            </button>
          </div>
          <button onClick={()=>setExIdx(i=>Math.min(exercises.length-1,i+1))} disabled={exIdx===exercises.length-1}
            style={{background:'none',border:`1px solid ${C.bord}`,color:C.cream,
              width:36,height:36,cursor:'pointer',fontSize:'1rem',opacity:exIdx===exercises.length-1?0.35:1}}>&#8594;</button>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={exportPdf} disabled={exporting} style={{
            background:'#4a78ff',border:'1px solid #4a78ff',
            color:'white',padding:'5px 10px',cursor: exporting?'wait':'pointer',
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
            letterSpacing:'0.08em',flexShrink:0,WebkitTapHighlightColor:'transparent',
            opacity:exporting?0.6:1,
          }}>{exporting?'...':'📄 PDF'}</button>
          <button onClick={handleRVDone} style={{
            background:C.accent,border:`1px solid ${C.accent}`,
            color:'white',padding:'5px 12px',cursor:'pointer',
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
            letterSpacing:'0.1em',flexShrink:0,WebkitTapHighlightColor:'transparent',
          }}>DONE ✓</button>
        </div>
      </div>
      <div ref={exDivRef} style={{background:'white',flex:'1 1 0',overflowY:'auto',padding:'8px 12px'}} />
    </div>
  );

  const ExercisePanel = isLarge ? ExercisePanelLarge : ExercisePanelSmall;

  // ── Input panel ────────────────────────────────────────────────────
  const InputPanel = (
    <div style={{display:'flex',flexDirection:'column',flex:pageImages.length>0?'1 1 0':'1 1 0',
      minHeight:0,overflowY:'auto',background:'#fff'}}>

      {/* Step 1: grouping */}
      <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.bord}`,flexShrink:0}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',letterSpacing:'0.2em',
          color:C.cream,marginBottom:10}}>NOTE GROUPING OF PASSAGE</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {[3,4,5,6,7,8].map(n=>(
            <button key={n} onClick={()=>setActiveGroup(n)} style={{
              minWidth:52,height:68,border:`2px solid ${activeGroup===n?C.accent:'#f0f0f0'}`,
              background:activeGroup===n?C.accent:'transparent',
              cursor:'pointer',display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'flex-end',padding:'4px 4px 6px',gap:2,
              WebkitTapHighlightColor:'transparent',
            }}>
              {GRP_SVGS[n]}
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,
                color:activeGroup===n?'white':C.accent,letterSpacing:'0.05em'}}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Instrument Setup — reveals after grouping selected */}
      {activeGroup && (
      <div style={{padding:'10px 20px',borderBottom:`1px solid ${C.bord}`,
        background:'#f5f5f5',flexShrink:0}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
          letterSpacing:'0.2em',color:C.cream,marginBottom:10}}>INSTRUMENT SETUP</div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.78rem',
              letterSpacing:'0.18em',color:C.muted}}>CLEF</div>
            <div style={{position:'relative'}}>
              <select value={clef} onChange={e=>setClef(e.target.value)}
                style={{minWidth:90,appearance:'none',WebkitAppearance:'none',
                  background:'#fff',border:`1px solid ${C.bord}`,color:C.cream,
                  padding:'7px 26px 7px 10px',fontFamily:"'Cormorant Garamond',serif",
                  fontSize:'0.9rem',cursor:'pointer'}}>
                <option value="treble">Treble</option><option value="bass">Bass</option>
                <option value="alto">Alto</option><option value="tenor">Tenor</option>
              </select>
              <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                color:C.muted,pointerEvents:'none',fontSize:'0.65rem'}}>&#9662;</span>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.78rem',
              letterSpacing:'0.18em',color:C.muted}}>KEY</div>
            <div style={{position:'relative'}}>
              <select value={key} onChange={e=>{
                setKey(e.target.value);
                const flatKeys=['F','Bb','Eb','Ab','Db','Gb'];
                setAccMode(flatKeys.includes(e.target.value)?'flat':'sharp');
              }}
                style={{minWidth:80,appearance:'none',WebkitAppearance:'none',
                  background:'#fff',border:`1px solid ${C.bord}`,color:C.cream,
                  padding:'7px 26px 7px 10px',fontFamily:"'Cormorant Garamond',serif",
                  fontSize:'0.9rem',cursor:'pointer'}}>
                <option value="C">C major</option>
                <option value="G">G major</option>
                <option value="D">D major</option>
                <option value="A">A major</option>
                <option value="E">E major</option>
                <option value="B">B major</option>
                <option value="Fs">F♯ major</option>
                <option value="F">F major</option>
                <option value="Bb">B♭ major</option>
                <option value="Eb">E♭ major</option>
                <option value="Ab">A♭ major</option>
                <option value="Db">D♭ major</option>
                <option value="Gb">G♭ major</option>
              </select>
              <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                color:C.muted,pointerEvents:'none',fontSize:'0.65rem'}}>&#9662;</span>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:160,maxWidth:260}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.78rem',
              letterSpacing:'0.18em',color:C.muted}}>INSTRUMENT</div>
            <div style={{position:'relative'}}>
              <select value={instrName}
                onChange={e=>{
                  const opt=e.target.options[e.target.selectedIndex];
                  setInstrName(e.target.value);
                  setInstrTranspose(parseInt(opt.getAttribute('data-t')||'0'));
                  setInstrSelected(true);
                }}
                style={{width:'100%',appearance:'none',WebkitAppearance:'none',
                  background:'#fff',border:`1px solid ${C.bord}`,color:C.cream,
                  padding:'7px 26px 7px 10px',fontFamily:"'Cormorant Garamond',serif",
                  fontSize:'0.9rem',cursor:'pointer'}}>
                <option value="">Select instrument...</option>
                <option value="Flute"     data-t="0">Flute</option>
                <option value="Oboe"      data-t="0">Oboe</option>
                <option value="BbClar"    data-t="-2">B&#9837; Clarinet</option>
                <option value="AClar"     data-t="-3">A Clarinet</option>
                <option value="Bassoon"   data-t="0">Bassoon</option>
                <option value="EbAlto"    data-t="3">E&#9837; Alto Sax</option>
                <option value="TenorSax"  data-t="-2">Tenor Sax</option>
                <option value="EbBari"    data-t="-7">E&#9837; Bari Sax</option>
                <option value="HornF"     data-t="-5">Horn in F</option>
                <option value="BbTrump"   data-t="-2">B&#9837; Trumpet</option>
                <option value="Trombone"  data-t="0">Trombone</option>
                <option value="Violin"    data-t="0">Violin</option>
                <option value="Viola"     data-t="0">Viola</option>
                <option value="Cello"     data-t="0">Cello</option>
                <option value="Piano"     data-t="0">Piano</option>
                <option value="Other"     data-t="0">Other (Concert Pitch)</option>
              </select>
              <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                color:C.muted,pointerEvents:'none',fontSize:'0.65rem'}}>&#9662;</span>
            </div>
          </div>
          {/* Name + Generate + Play — always visible once instrument selected, active once notes entered */}
          {activeGroup && instrSelected && (
            <div style={{flex:1,minWidth:200,display:'flex',flexDirection:'column',gap:6}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.78rem',
                letterSpacing:'0.18em',color:C.muted}}>EXERCISE NAME</div>
              <input type="text" value={docName} onChange={e=>setDocName(e.target.value)}
                placeholder="Required to generate"
                disabled={selNotes.length===0}
                style={{fontSize:'0.85rem',padding:'7px 10px',background:'#fff',
                  border:`1px solid ${docName.trim()?C.accent:C.bord}`,
                  color:selNotes.length>0?C.cream:'#444',
                  fontFamily:"'Inconsolata',monospace",outline:'none',
                  width:'100%',boxSizing:'border-box',
                  opacity:selNotes.length===0?0.4:1}} />
              <div style={{display:'flex',gap:6}}>
                <button onClick={generate} disabled={!canGenerate||!docName.trim()} style={{
                  flex:2,padding:'8px 4px',
                  background:(canGenerate&&docName.trim())?C.accent:'#f0f0f0',
                  border:`1px solid ${(canGenerate&&docName.trim())?C.accent:C.bord}`,
                  color:(canGenerate&&docName.trim())?'white':C.dim,
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
                  letterSpacing:'0.08em',cursor:(canGenerate&&docName.trim())?'pointer':'not-allowed',
                  WebkitTapHighlightColor:'transparent',
                  opacity:selNotes.length===0?0.35:1,
                }}>GENERATE</button>
                <button onClick={playPassage} disabled={!selNotes.length} style={{
                  flex:1,padding:'8px 4px',
                  background:passagePlaying?'#fde8e8':'#f0f0f0',
                  border:`1px solid ${passagePlaying?'#e53535':C.bord}`,
                  color:passagePlaying?'#e53535':selNotes.length?C.cream:'#444',
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
                  cursor:selNotes.length?'pointer':'not-allowed',
                  WebkitTapHighlightColor:'transparent',transition:'all 0.12s',
                  opacity:selNotes.length===0?0.35:1,
                }}>{passagePlaying?'\u25A0 STOP':'\u25B6 PLAY'}</button>
              </div>
              {saveMsg && <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',
                color:saveMsg.includes('title')||saveMsg.includes('failed')?'#e57373':C.gold}}>{saveMsg}</div>}
              {dupWarning && (
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',color:'#e5a835'}}>Duplicate found — save as new copy?</span>
                  <button onClick={()=>saveExercise(true)} style={{background:C.accent,border:'none',color:'white',
                    padding:'3px 10px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.78rem',cursor:'pointer'}}>YES</button>
                  <button onClick={()=>setDupWarning(false)} style={{background:'none',border:`1px solid ${C.bord}`,
                    color:C.muted,padding:'3px 8px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.78rem',cursor:'pointer'}}>NO</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Step 3: Enter Your Passage header — reveals after instrument selected */}
      {activeGroup && instrSelected && (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'10px 20px',borderBottom:`1px solid ${C.bord}`,flexShrink:0,
        background:'#f5f5f5',flexWrap:'wrap',gap:6}}>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
          letterSpacing:'0.2em',color:C.cream}}>ENTER YOUR PASSAGE</span>
        <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem',
            letterSpacing:'0.14em',color:C.muted}}>NOTE ENTRY METHOD</span>
          {['keys','mic'].map(t=>(
            <button key={t} onClick={()=>setInputTab(t)} style={{
              padding:'4px 11px',borderRadius:2,
              background:inputTab===t?C.accent:'none',
              border:`1px solid ${inputTab===t?C.accent:'rgba(0,0,0,0.15)'}`,
              color:inputTab===t?'white':'rgba(0,0,0,0.5)',
              fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
              letterSpacing:'0.08em',cursor:'pointer',WebkitTapHighlightColor:'transparent',
            }}>{t==='keys'?'♪ KEYBOARD':'● RECORD'}</button>
          ))}
          <button onClick={()=>setAccMode(m=>m==='sharp'?'flat':'sharp')} style={{
            padding:'4px 10px',borderRadius:2,background:'none',
            border:'1px solid rgba(0,0,0,0.15)',
            color:'rgba(0,0,0,0.5)',fontFamily:"'Bebas Neue',sans-serif",
            fontSize:'0.85rem',letterSpacing:'0.08em',cursor:'pointer',
            WebkitTapHighlightColor:'transparent',
          }}>{accMode==='sharp'?'USE FLATS':'USE SHARPS'}</button>
          <button onClick={()=>{setSelNotes([]);setInsertAt(-1);setRespellChip(null);setGenerated(false);}} style={{
            padding:'4px 10px',borderRadius:2,background:'none',
            border:'1px solid rgba(0,0,0,0.15)',
            color:'rgba(0,0,0,0.5)',fontFamily:"'Bebas Neue',sans-serif",
            fontSize:'0.68rem',letterSpacing:'0.1em',cursor:'pointer',
            WebkitTapHighlightColor:'transparent',
          }}>CLEAR</button>
        </div>
      </div>
      )}

      {/* Keyboard — gated, bigger, with drag bands */}
      {activeGroup && instrSelected && inputTab==='keys' && (
        <>
          <div ref={pianoScrollRef} style={{flexShrink:0,overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
            <svg ref={pianoRefCb} viewBox="0 0 1008 130" preserveAspectRatio="none"
              style={{width:2200,height:200,display:'block',cursor:'pointer',touchAction:'none'}} />
          </div>

        </>
      )}

      {/* Mic */}
      {activeGroup && instrSelected && inputTab==='mic' && (
        <div style={{padding:'20px 14px',textAlign:'center',flexShrink:0}}>
          <button onClick={toggleMic} style={{
            width:72,height:72,borderRadius:'50%',
            background:micActive?'rgba(229,53,53,0.2)':'rgba(139,58,26,0.15)',
            border:`3px solid ${micActive?'#e53535':C.accent}`,
            cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',
          }}>
            <div style={{width:28,height:28,background:micActive?'#e53535':C.accent,borderRadius:micActive?4:'50%',transition:'all 0.2s'}} />
          </button>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',letterSpacing:'0.15em',color:C.muted,marginTop:8}}>
            {micActive?'RECORDING — TAP TO STOP':'TAP TO RECORD'}
          </div>
          {micStatus && <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem',color:C.accent,marginTop:4}}>{micStatus}</div>}
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:'0.9rem',color:C.muted,marginTop:8,maxWidth:300,margin:'8px auto 0'}}>
            Play each note clearly with a brief silence between
          </div>
        </div>
      )}

      {/* Live staff preview — always visible once instrument selected */}
      {activeGroup && instrSelected && (
        <div ref={liveStaffRef}
          style={{background:'white',flexShrink:0,
            padding:'4px 8px',borderTop:`1px solid ${C.bord}`,
            minHeight:80,overflowX:'auto',width:'100%',boxSizing:'border-box'}} />
      )}

      {/* Chips — with respell popup and insert buttons */}
      {activeGroup && instrSelected && (
      <div style={{padding:'10px 20px 6px',flexShrink:0}} onClick={()=>setRespellChip(null)}>
        {respellChip!==null && (
          <RespellPopup
            note={selNotes[respellChip.idx]}
            anchorY={respellChip.y}
            onClose={()=>setRespellChip(null)}
            onDelete={()=>{removeNote(respellChip.idx);setRespellChip(null);}}
            onUpdate={newNote=>{
              setSelNotes(prev=>{const n=[...prev];n[respellChip.idx]=newNote;return n;});
              setRespellChip(p=>({...p}));
            }}
          />
        )}
        {selNotes.length===0 ? (
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.05rem',
            letterSpacing:'0.1em',color:'#888'}}>No notes entered</span>
        ) : (
          <div style={{display:'flex',flexWrap:'wrap',gap:4,alignItems:'center'}}>
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
                    fontSize:'1rem',padding:'5px 11px',display:'inline-flex',
                    alignItems:'center',cursor:'pointer',userSelect:'none',
                    WebkitTapHighlightColor:'transparent',
                  }}>
                  {dn(n)}
                </span>
                <InsBtn idx={i+1} />
              </React.Fragment>
            ))}
          </div>
        )}
        {insertAt>=0 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            marginTop:6,padding:'4px 0',borderTop:`1px solid ${C.bord}`}}>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
              fontSize:'0.85rem',color:C.cream}}>Tap a key to insert at marked position</span>
            <button onClick={()=>setInsertAt(-1)} style={{
              background:'none',border:'1px solid rgba(255,255,255,0.3)',
              color:'rgba(255,255,255,0.8)',padding:'2px 10px',
              fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.65rem',
              letterSpacing:'0.1em',cursor:'pointer'}}>CANCEL</button>
          </div>
        )}
        {selNotes.length>0 && (
          <div style={{marginTop:6}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',
              letterSpacing:'0.1em',color:'#aaa'}}>
              <strong style={{color:'#1a1a1a'}}>{selNotes.length}</strong> PITCHES &nbsp;&#183;&nbsp;
              <strong style={{color:'#1a1a1a'}}>{MUR_DB.filter(p=>p.section===g2s(activeGroup)).length||'—'}</strong> PATTERNS
            </span>
          </div>
        )}
      </div>
      )}

    </div>
  );

  // ── Layout ─────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <TopBar
        left={<BackBtn onClick={onBack} />}
        center={piece?.title||(savedExercise?.doc_name?savedExercise.doc_name:'RHYTHMIC VARIATION')}
        right={null}
      />

      {/* Main area */}
      {land ? (
        // Landscape: score left, input right
        <div style={{flex:'1 1 0',minHeight:0,display:'flex',flexDirection:'row'}}>
          {pageImages.length>0 ? (
            <div style={{flex:'1 1 0',minWidth:0,borderRight:`1px solid ${C.bord}`}}>
              {ScorePanel}
            </div>
          ) : isLoadedExercise && (
            <div style={{width:220,flexShrink:0,borderRight:`1px solid ${C.bord}`,padding:12,overflowY:'auto'}}>
              {AttachPanel}
            </div>
          )}
          <div style={{flex:'1 1 0',minWidth:0,display:'flex',flexDirection:'column',overflowY:'auto'}}>
            {generated ? ExercisePanel : InputPanel}
  
          </div>
        </div>
      ) : (
        // Portrait: score top, input/exercises below
        <div style={{flex:'1 1 0',minHeight:0,display:'flex',flexDirection:'column'}}>
          {!generated && (pageImages.length>0 ? ScorePanel : (isLoadedExercise && AttachPanel))}
          {generated ? (
            <>
              {ExercisePanel}
              <div style={{padding:'8px 14px',flexShrink:0,borderTop:`1px solid ${C.bord}`}}>
                <Btn onClick={()=>setGenerated(false)} full>&#8592; EDIT PASSAGE</Btn>
              </div>
            </>
          ) : InputPanel}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MUR — ALL EXERCISES VIEW (large screen)
═══════════════════════════════════════════════════════════════════════ */
function AllExercisesView({ exercises, selNotes, clef, murKey, playingIdx, onPlay, land }) {
  const containerRef = useRef();

  useEffect(()=>{
    const ABCJS = window.ABCJS;
    if(!ABCJS||!exercises.length||!containerRef.current) return;
    const container = containerRef.current;
    exercises.forEach((ex,i)=>{
      const div = container.querySelector('#mur-ex-'+i);
      if(!div) return;
      const abc = buildAbcString(ex.pat, selNotes, clef, murKey);
      try {
        ABCJS.renderAbc(div, abc, {
          scale:1.1,
          staffwidth: Math.min((container.offsetWidth||700) - 60, 820),
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
                fontSize:'0.65rem',flexShrink:0,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
              {playingIdx===i?'\u25A0':'\u25B6'}
            </button>
            <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.65rem',color:'#9a8e82'}}>
              {ex.pat.timeSig} &nbsp;&middot;&nbsp; {ex.pat.section.replace(' Rhythm Patterns','')}
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
/* ═══════════════════════════════════════════════════════════════════════
   SLOW CLICK-UP SESSION
═══════════════════════════════════════════════════════════════════════ */
function SlowClickUpScreen({ profile, piece, pageImages, tapPos, scuSpot, onBack, onDone }) {
  const [bpm, setBpm]               = useState(60);
  const [perfTempo, setPerfTempo]   = useState(120);
  const [streak, setStreak]         = useState(0);
  const [metroOn, setMetroOn]       = useState(false);
  const [phase, setPhase]           = useState('setup'); // 'setup' | 'practice'
  const [maxTempo, setMaxTempo]     = useState(60);
  const [totalReps, setTotalReps]   = useState(0);
  const [cleanReps, setCleanReps]   = useState(0);
  const [sessionStart]              = useState(Date.now);
  const [incSize, setIncSize]       = useState(5);
  const [targetReps, setTargetReps] = useState(10);
  const [showComplete, setShowComplete] = useState(false);
  const [spotId, setSpotId]         = useState(null);
  const [startBpm, setStartBpm]     = useState(60);
  const [spotLabel, setSpotLabel]   = useState(tapPos?.label || '');
  const [showTempos, setShowTempos] = useState(false);
  const [allSpots, setAllSpots]     = useState([]); // all spots for this piece
  const metro = useRef(new Metro());
  const [scuSubdiv, setScuSubdiv] = useState(1);
  const land = useOrientation();
  const [currentPage, setCurrentPage] = useState(tapPos?.page||0);

  useEffect(()=>()=>metro.current.stop(),[]);
  useEffect(()=>{if(metroOn)metro.current.start(bpm);else metro.current.stop();},[metroOn]);
  useEffect(()=>{metro.current.setBpm(bpm);},[bpm]);

  // Load or create spot on mount
  useEffect(()=>{
    (async ()=>{
      if(!profile?.email || !scuSpot) return;
      try {
        // Look for existing spot near this tap
        const r = await sbGet(`/rest/v1/practice_spots?user_email=eq.${encodeURIComponent(profile.email)}&piece_id=eq.${scuSpot.piece_id}&score_page=eq.${scuSpot.page}&order=created_at.desc`);
        const spots = await r.json()||[];
        const match = spots.find(s=> Math.abs(s.score_y - scuSpot.y) < 0.06 && (s.score_x == null || Math.abs(s.score_x - scuSpot.x) < 0.06));
        if(match) {
          setSpotId(match.id);
          if(match.label) setSpotLabel(match.label);
          if(match.perf_tempo) setPerfTempo(match.perf_tempo);
          // Check for last SCU session to resume at last max tempo
          const logR = await sbGet(`/rest/v1/practice_logs?spot_id=eq.${match.id}&strategy=eq.scu&order=created_at.desc&limit=1`);
          const lastLog = (await logR.json()||[])[0];
          if(lastLog?.max_tempo) {
            setBpm(lastLog.max_tempo);
            setMaxTempo(lastLog.max_tempo);
          } else if(match.start_tempo) {
            setBpm(match.start_tempo);
            setMaxTempo(match.start_tempo);
          }
        }
        // Fetch ALL spots for this piece (for tempo overlays)
        const ar = await sbGet(`/rest/v1/practice_spots?user_email=eq.${encodeURIComponent(profile.email)}&piece_id=eq.${scuSpot.piece_id}`);
        const all = await ar.json()||[];
        // For each spot, fetch best tempo from logs
        const lr = await sbGet(`/rest/v1/practice_logs?user_email=eq.${encodeURIComponent(profile.email)}&piece_id=eq.${scuSpot.piece_id}&order=session_date.desc`);
        const logs = await lr.json()||[];
        setAllSpots(all.map(s=>{
          const best = logs.filter(l=>l.spot_id===s.id).reduce((mx,l)=>Math.max(mx,l.max_tempo||0),0);
          return {...s, best_tempo: best||s.start_tempo||0};
        }));
      } catch(e){ console.error('spot lookup failed', e); }
    })();
  },[]);

  const startSession = async () => {
    setPhase('practice');
    setMaxTempo(bpm);
    setStartBpm(bpm);
    // Create or update spot
    if(!spotId && profile?.email) {
      try {
        const r = await sbPost('/rest/v1/practice_spots', {
          user_email: profile.email,
          piece_id: scuSpot?.piece_id||null,
          score_page: scuSpot?.page??0,
          score_x: scuSpot?.x??0.5,
          score_y: scuSpot?.y??0.5,
          start_tempo: bpm,
          perf_tempo: perfTempo,
          label: spotLabel.trim()||null,
        });
        const rows = await r.json();
        if(rows?.[0]?.id) setSpotId(rows[0].id);
      } catch(e){ console.error('spot create failed', e); }
    } else if(spotId) {
      sbPatch(`/rest/v1/practice_spots?id=eq.${spotId}`, {
        start_tempo: bpm, perf_tempo: perfTempo,
        label: spotLabel.trim()||null,
      }).catch(()=>{});
    }
  };

  const handleRep = (clean) => {
    setTotalReps(t=>t+1);
    if(clean) {
      setCleanReps(c=>c+1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if(newStreak >= targetReps) {
        // Completed! Show increment picker
        if(bpm > maxTempo) setMaxTempo(bpm);
        setShowComplete(true);
        setMetroOn(false);
      }
    } else {
      setStreak(0);
    }
  };

  const advanceTempo = (inc) => {
    const newBpm = bpm + inc;
    setBpm(newBpm);
    if(newBpm > maxTempo) setMaxTempo(newBpm);
    setStreak(0);
    setShowComplete(false);
  };

  const exitWithoutSaving = () => {
    metro.current.stop();
    onDone();
  };

  const saveAndExit = async () => {
    metro.current.stop();
    if(profile?.email) {
      try {
        await sbPost('/rest/v1/practice_logs', {
          user_email: profile.email,
          spot_id: spotId||null,
          piece_id: scuSpot?.piece_id||null,
          strategy: 'scu',
          session_date: localDate(),
          start_tempo: startBpm,
          max_tempo: maxTempo,
          perf_tempo: perfTempo,
          reps_total: totalReps,
          reps_clean: cleanReps,
          duration_sec: Math.round((Date.now() - sessionStart) / 1000),
        });
      } catch(e){ console.error('log save failed', e); }
    }
    onDone();
  };

  const pct = perfTempo ? Math.min(100, Math.round((maxTempo / perfTempo) * 100)) : null;

  const adjustBpm = delta => setBpm(b=>Math.max(20,Math.min(300,b+delta)));
  const adjustPerf = delta => setPerfTempo(b=>Math.max(20,Math.min(400,b+delta)));

  const bpmBtn = (size) => ({
    background:'#f0f0f0',border:`1px solid ${C.bord2}`,color:C.cream,
    width: size==='big' ? 44 : 34, height: size==='big' ? 44 : 34,
    cursor:'pointer',userSelect:'none',flexShrink:0,
    fontFamily:"'Bebas Neue',sans-serif",fontSize: size==='big' ? '1.2rem' : '0.85rem',
    display:'flex',alignItems:'center',justifyContent:'center',
    WebkitTapHighlightColor:'transparent',borderRadius:6,
  });

  if(phase === 'setup') {
    return (
      <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
        <TopBar left={<BackBtn onClick={onBack}/>} center="SLOW CLICK-UP" right={null}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',
          gap:28,padding:'24px 24px',maxWidth:400,margin:'0 auto',width:'100%'}}>

          <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
            fontSize:'1.1rem',color:C.cream,lineHeight:1.6,textAlign:'center'}}>
            Set your starting tempo and performance goal, then nail 10 clean reps to advance.
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
                letterSpacing:'0.2em',color:'#3db06a',marginBottom:8}}>STARTING TEMPO</div>
              <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>
                <button style={bpmBtn('small')} onClick={()=>adjustBpm(-10)}>−10</button>
                <button style={bpmBtn('big')} onClick={()=>adjustBpm(-1)}>−</button>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'2.2rem',
                  color:C.cream,minWidth:90,textAlign:'center'}}>♩ = {bpm}</div>
                <button style={bpmBtn('big')} onClick={()=>adjustBpm(1)}>+</button>
                <button style={bpmBtn('small')} onClick={()=>adjustBpm(10)}>+10</button>
              </div>
            </div>

            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
                letterSpacing:'0.2em',color:C.accent,marginBottom:8}}>PERFORMANCE TEMPO</div>
              <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>
                <button style={bpmBtn('small')} onClick={()=>adjustPerf(-10)}>−10</button>
                <button style={bpmBtn('big')} onClick={()=>adjustPerf(-1)}>−</button>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'2.2rem',
                  color:C.cream,minWidth:90,textAlign:'center'}}>♩ = {perfTempo}</div>
                <button style={bpmBtn('big')} onClick={()=>adjustPerf(1)}>+</button>
                <button style={bpmBtn('small')} onClick={()=>adjustPerf(10)}>+10</button>
              </div>
            </div>

            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
                letterSpacing:'0.2em',color:C.muted,marginBottom:8}}>CLEAN REPS TO ADVANCE</div>
              <div style={{display:'flex',gap:8}}>
                {[5,10,15,20].map(n=>(
                  <button key={n} onClick={()=>setTargetReps(n)} style={{
                    flex:1,padding:'10px 0',
                    background:targetReps===n?'#3db06a':'#f0f0f0',
                    border:`1px solid ${targetReps===n?'#3db06a':C.bord2}`,
                    color:targetReps===n?'white':C.cream,
                    fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
                    letterSpacing:'0.1em',cursor:'pointer',
                    WebkitTapHighlightColor:'transparent',
                  }}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={startSession} style={{
            padding:'14px 0',background:'#3db06a',border:'none',color:'white',
            fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',
            letterSpacing:'0.12em',cursor:'pointer',
            WebkitTapHighlightColor:'transparent',
          }}>START PRACTICING →</button>
        </div>
      </div>
    );
  }

  // Practice phase
  const totalPages = pageImages.length;
  const showTwo = land && totalPages > 1;

  const dotSize = targetReps > 10 ? 10 : 14;
  const streakDots = range(0,targetReps).map(i=>(
    <div key={i} style={{
      width:dotSize,height:dotSize,borderRadius:'50%',
      background:i<streak?'#3db06a':'#f0f0f0',
      border:`2px solid ${i<streak?'#3db06a':'#444'}`,
      transition:'background 0.15s,border-color 0.15s',
    }}/>
  ));

  const progressPct = perfTempo > 0 ? Math.min(100, Math.round((maxTempo / perfTempo) * 100)) : 0;

  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      {/* Top bar — compact, like ICU */}
      <div style={{flexShrink:0,borderBottom:`1px solid #d4d4d4`,background:'#fff'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px'}}>
          <button onClick={exitWithoutSaving} style={{background:'none',border:`1px solid ${C.bord2}`,color:C.cream,padding:'6px 10px',cursor:'pointer',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',letterSpacing:'0.1em',flexShrink:0}}>← EXIT</button>

          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {/* Tempo display */}
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(1.4rem,4vw,2rem)',color:C.cream,lineHeight:1}}>
              ♩ = {bpm}
            </div>
            <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.7rem',color:C.muted}}>/ {perfTempo}</span>

            {/* Metronome */}
            <button onClick={()=>setMetroOn(m=>!m)} style={{
              background:metroOn?'#3db06a':'#f0f0f0',border:`2px solid ${metroOn?'#3db06a':'#ccc'}`,
              color:metroOn?'white':'#333',width:36,height:36,cursor:'pointer',fontSize:'1rem',
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
              WebkitTapHighlightColor:'transparent',
            }}>{metroOn?'⏸':'▶'}</button>
            <SubdivBtns subdiv={scuSubdiv} setSubdiv={setScuSubdiv} metro={metro} metroOn={metroOn} bpm={bpm} compact />
          </div>

          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
            letterSpacing:'0.1em',color:C.muted,flexShrink:0,textAlign:'right'}}>
            {totalReps} reps<br/>{cleanReps} clean
          </div>
        </div>

        {/* Streak dots + buttons row */}
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 10px 6px',
          justifyContent:'center'}}>
          <div style={{display:'flex',gap:4}}>{streakDots}</div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.75rem',
            letterSpacing:'0.1em',color:'#3db06a',minWidth:40,textAlign:'center'}}>
            {streak}/{targetReps}
          </span>
          {!showComplete && (
            <>
              <button onClick={()=>handleRep(true)} style={{
                padding:'6px 18px',background:'#3db06a',border:'none',color:'white',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
                letterSpacing:'0.08em',cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>✓ CLEAN</button>
              <button onClick={()=>handleRep(false)} style={{
                padding:'6px 18px',background:'#e53535',border:'none',color:'white',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',
                letterSpacing:'0.08em',cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>✗ MISS</button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{height:3,background:C.bord,flexShrink:0}}>
        <div style={{height:'100%',background:'#3db06a',width:`${progressPct}%`,transition:'width 0.3s'}}/>
      </div>

      {/* Score display — fills remaining space */}
      <div style={{flex:'1 1 0',minHeight:0,background:'#e8e5e0',display:'flex',position:'relative'}}>
        {/* Page arrows — always show when multi-page */}
        {totalPages>1 && currentPage>0 && (
          <button onClick={()=>setCurrentPage(p=>p-1)} style={{
            position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',zIndex:10,
            background:'rgba(255,255,255,0.85)',border:'none',color:C.cream,fontSize:'1.8rem',
            padding:'16px 10px',cursor:'pointer',borderRadius:'0 4px 4px 0',
            WebkitTapHighlightColor:'transparent',
          }}>‹</button>
        )}
        {totalPages>1 && currentPage<totalPages-1 && !(showTwo && currentPage+2>=totalPages) && (
          <button onClick={()=>setCurrentPage(p=>p+1)} style={{
            position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',zIndex:10,
            background:'rgba(255,255,255,0.85)',border:'none',color:C.cream,fontSize:'1.8rem',
            padding:'16px 10px',cursor:'pointer',borderRadius:'4px 0 0 4px',
            WebkitTapHighlightColor:'transparent',
          }}>›</button>
        )}

        {/* Show tempos toggle — removed */}

        <div style={{position:'relative',flex:1,minWidth:0,overflow:'hidden'}}
          onTouchStart={e=>{
            const t=e.touches[0];
            e.currentTarget._swipe={x:t.clientX,time:Date.now()};
          }}
          onTouchEnd={e=>{
            const sw=e.currentTarget._swipe;
            if(!sw) return;
            const dx=e.changedTouches[0].clientX-sw.x;
            if(Math.abs(dx)>60 && Date.now()-sw.time<400){
              if(dx<0 && currentPage<totalPages-1) setCurrentPage(p=>showTwo?p+2:p+1);
              if(dx>0 && currentPage>0) setCurrentPage(p=>showTwo?Math.max(0,p-2):p-1);
            }
          }}>
          <img src={pageImages[currentPage]}
            style={{width:'100%',height:'100%',objectFit:'contain',display:'block',userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none'}}
            onContextMenu={e=>e.preventDefault()}
            draggable={false} />
        </div>
        {showTwo && currentPage+1<totalPages && (
          <div style={{position:'relative',flex:1,minWidth:0,borderLeft:`1px solid ${C.bord}`,overflow:'hidden'}}>
            <img src={pageImages[currentPage+1]}
              style={{width:'100%',height:'100%',objectFit:'contain',display:'block',userSelect:'none'}}
              draggable={false} />
          </div>
        )}

        {/* Page indicator */}
        {totalPages>1 && !showTwo && (
          <div style={{position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',
            fontFamily:"'Inconsolata',monospace",fontSize:'0.75rem',color:C.muted,
            background:'rgba(255,255,255,0.9)',padding:'3px 10px',borderRadius:3}}>
            {currentPage+1} / {totalPages}
          </div>
        )}
      </div>

      {/* Completed 10 overlay */}
      {showComplete && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.3)'}}/>
          <div style={{position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
            zIndex:501,background:'#fff',border:`2px solid #3db06a`,
            padding:'24px',width:'min(340px,88vw)',
            display:'flex',flexDirection:'column',gap:14,textAlign:'center',
            boxShadow:'0 8px 40px rgba(0,0,0,0.15)'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',
              letterSpacing:'0.12em',color:'#3db06a'}}>
              {targetReps} CLEAN REPS! 🎉
            </div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
              fontSize:'1rem',color:C.cream}}>
              Advance tempo or stay here?
            </div>
            <div style={{display:'flex',gap:8}}>
              {[2,5,10].map(n=>(
                <button key={n} onClick={()=>advanceTempo(n)} style={{
                  flex:1,padding:'12px 0',
                  background:n===incSize?'#3db06a':'#f0f0f0',
                  border:`1px solid ${n===incSize?'#3db06a':C.bord2}`,
                  color:n===incSize?'white':C.cream,
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',
                  letterSpacing:'0.1em',cursor:'pointer',
                  WebkitTapHighlightColor:'transparent',
                }}>+{n}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setStreak(0);setShowComplete(false);}} style={{
                flex:1,padding:'10px 0',background:'transparent',
                border:`1px solid ${C.bord2}`,color:C.muted,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
                letterSpacing:'0.1em',cursor:'pointer',
              }}>STAY AT {bpm}</button>
              <button onClick={saveAndExit} style={{
                flex:1,padding:'10px 0',background:C.accent,border:'none',color:'white',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
                letterSpacing:'0.1em',cursor:'pointer',
              }}>DONE FOR TODAY</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SPOT LOG — practice history for a specific spot
═══════════════════════════════════════════════════════════════════════ */
function SpotLogScreen({ profile, piece, tapPos, spotFilter, onBack, onPracticeAgain }) {
  const [logs, setLogs] = useState([]);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState(null);
  const [deletingLog, setDeletingLog] = useState(null);

  useEffect(()=>{
    (async ()=>{
      if(!profile?.email) return;
      try {
        let logUrl = `/rest/v1/practice_logs?user_email=eq.${encodeURIComponent(profile.email)}&piece_id=eq.${piece?.id||''}&order=session_date.desc,created_at.desc&limit=100`;
        if(spotFilter?.id) logUrl += `&spot_id=eq.${spotFilter.id}`;
        const [lr, sr] = await Promise.all([
          sbGet(logUrl),
          sbGet(`/rest/v1/practice_spots?user_email=eq.${encodeURIComponent(profile.email)}&piece_id=eq.${piece?.id||''}`),
        ]);
        setLogs(await lr.json()||[]);
        setSpots(await sr.json()||[]);
      } catch { setLogs([]); setSpots([]); }
      setLoading(false);
    })();
  },[]);

  const now = Date.now();
  const relDate = (d) => {
    if(!d) return '';
    const diff = Math.floor((now - new Date(d+'T12:00:00').getTime()) / 86400000);
    if(diff===0) return 'today';
    if(diff===1) return 'yesterday';
    if(diff<7) return `${diff} days ago`;
    if(diff<30) return `${Math.floor(diff/7)} week${Math.floor(diff/7)>1?'s':''} ago`;
    return `${Math.floor(diff/30)} month${Math.floor(diff/30)>1?'s':''} ago`;
  };
  const stratColor = s => s==='icu'?C.accent:s==='mur'?C.gold:s==='scu'?'#2eaa57':s==='recording'?'#dc3232':'#999';

  const byDate = {};
  logs.forEach(l => {
    const d = l.session_date || 'Unknown';
    if(!byDate[d]) byDate[d]=[];
    byDate[d].push(l);
  });

  const renderLog = (l, sp) => {
    const pct = (l.perf_tempo && l.max_tempo)
      ? Math.min(100, Math.round((l.max_tempo / l.perf_tempo) * 100))
      : null;
    const isEditing = editingLog?.id === l.id;
    return (
      <div key={l.id} style={{padding:'6px 12px',borderBottom:`1px solid #f0f0f0`,
        display:'flex',alignItems:'flex-start',gap:10}}>
        <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,
          background:stratColor(l.strategy),marginTop:5}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.95rem',
            color:'#999',letterSpacing:'0.02em'}}>
            {stratName(l.strategy)}
            {l.start_tempo && l.max_tempo ? ` · ♩ ${l.start_tempo} → ${l.max_tempo}` : ''}
            {l.perf_tempo ? ` (goal: ${l.perf_tempo})` : ''}
            {l.reps_clean ? ` · ${l.reps_clean} clean` : ''}
          </div>
          {isEditing ? (
            <div style={{marginTop:4}}>
              <textarea value={editingLog.notes} onChange={e=>setEditingLog({...editingLog, notes:e.target.value})}
                rows={2} style={{
                  width:'100%',padding:'8px 10px',borderRadius:8,
                  border:'1.5px solid #ddd',fontFamily:"'Cormorant Garamond',serif",
                  fontSize:'1.05rem',color:'#333',outline:'none',boxSizing:'border-box',
                  resize:'vertical',lineHeight:1.4,
                }}
                onFocus={e=>{e.target.style.borderColor=C.accent}}
                onBlur={e=>{e.target.style.borderColor='#ddd'}}
              />
              <div style={{display:'flex',gap:6,marginTop:4}}>
                <button onClick={async ()=>{
                  try {
                    await sbPatch(`/rest/v1/practice_logs?id=eq.${l.id}`, {notes: editingLog.notes||null});
                    setLogs(prev=>prev.map(lg=>lg.id===l.id?{...lg,notes:editingLog.notes}:lg));
                  } catch(e){}
                  setEditingLog(null);
                }} style={{
                  padding:'4px 12px',borderRadius:6,background:C.accent,border:'none',
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem',
                  letterSpacing:'0.06em',color:'#fff',cursor:'pointer',
                }}>SAVE</button>
                <button onClick={()=>setEditingLog(null)} style={{
                  padding:'4px 12px',borderRadius:6,background:'#f0f0f0',border:'none',
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.7rem',
                  letterSpacing:'0.06em',color:'#666',cursor:'pointer',
                }}>CANCEL</button>
              </div>
            </div>
          ) : (<>
            {l.notes && stripAudioTag(l.notes) && (
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                fontSize:'1.05rem',color:'#555',marginTop:3,lineHeight:1.4}}>
                {stripAudioTag(l.notes)}
              </div>
            )}
            {parseAudioKey(l.notes) && (
              <AudioPlayBtn audioKey={parseAudioKey(l.notes)} />
            )}
          </>)}
        </div>
        {pct !== null && l.strategy === 'scu' && (
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',
            color:'#2eaa57',flexShrink:0}}>{pct}%</div>
        )}
        {!isEditing && (
          <div style={{display:'flex',gap:2,flexShrink:0,marginTop:2}}>
            <button onClick={()=>setEditingLog({id:l.id, notes:l.notes||''})} style={{
              background:'none',border:'none',color:'#bbb',cursor:'pointer',
              fontSize:'1.3rem',padding:'4px 8px',WebkitTapHighlightColor:'transparent',
            }}>✎</button>
            <button onClick={()=>setDeletingLog(l.id)} style={{
              background:'none',border:'none',color:'#dbb',cursor:'pointer',
              fontSize:'1.3rem',padding:'4px 8px',WebkitTapHighlightColor:'transparent',
            }}>✕</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0}}>
      <TopBar left={<BackBtn onClick={onBack}/>} center={
        spotFilter?.label
          ? `JOURNAL — ${spotFilter.label}`
          : piece?.title ? `JOURNAL — ${piece.title}` : 'PRACTICE JOURNAL'
      } right={null}/>
      <div style={{flex:'1 1 0',overflowY:'auto',padding:16,WebkitOverflowScrolling:'touch'}}>

        {/* Delete confirmation */}
        {deletingLog && (
          <>
            <div onClick={()=>setDeletingLog(null)} style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.25)'}}/>
            <div style={{position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
              zIndex:501,background:'#fff',borderRadius:14,padding:'20px 24px',
              width:'min(320px,85vw)',boxShadow:'0 8px 32px rgba(0,0,0,0.15)',
              textAlign:'center'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',
                letterSpacing:'0.1em',color:'#1a1a1a',marginBottom:8}}>DELETE THIS ENTRY?</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
                fontSize:'1rem',color:'#888',marginBottom:16}}>This cannot be undone.</div>
              <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                <button onClick={()=>setDeletingLog(null)} style={{
                  padding:'10px 20px',borderRadius:10,background:'#f0f0f0',border:'none',
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',color:'#666',cursor:'pointer',
                }}>CANCEL</button>
                <button onClick={async ()=>{
                  try {
                    await sbDelete(`/rest/v1/practice_logs?id=eq.${deletingLog}`);
                    setLogs(prev=>prev.filter(l=>l.id!==deletingLog));
                  } catch(e){}
                  setDeletingLog(null);
                }} style={{
                  padding:'10px 20px',borderRadius:10,background:'#e57373',border:'none',
                  fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',color:'#fff',cursor:'pointer',
                }}>DELETE</button>
              </div>
            </div>
          </>
        )}

        {loading && <div style={{fontFamily:"'Inconsolata',monospace",fontSize:'1rem',color:C.muted,textAlign:'center',padding:40}}>Loading...</div>}
        {!loading && logs.length===0 && (
          <div style={{textAlign:'center',padding:60,color:C.muted,fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:'1.2rem'}}>
            No practice sessions{spotFilter?.label ? ` for "${spotFilter.label}"` : ' for this piece'} yet.
          </div>
        )}
        {!loading && Object.entries(byDate).map(([date, dayLogs]) => {
          const bySpot = {};
          dayLogs.forEach(l => {
            const sid = l.spot_id || 'none';
            if(!bySpot[sid]) bySpot[sid]=[];
            bySpot[sid].push(l);
          });

          return (
            <div key={date} style={{marginBottom:20}}>
              {/* Date header */}
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',
                letterSpacing:'0.18em',color:'#1a1a1a',padding:'14px 4px 6px',
                borderBottom:`2px solid ${C.bord}`,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span>{new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</span>
                <span style={{fontFamily:"'Inconsolata',monospace",fontSize:'0.95rem',
                  letterSpacing:0,color:C.muted}}>{relDate(date)}</span>
              </div>

              {Object.entries(bySpot).map(([sid, spotLogs]) => {
                const sp = spots.find(s=>s.id===sid);
                return (
                  <div key={sid} style={{marginLeft:8,borderLeft:`3px solid ${C.bord}`,marginTop:8}}>
                    {sp?.label && (
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",
                        fontSize:'1.05rem',letterSpacing:'0.06em',color:'#555',
                        padding:'6px 12px 2px'}}>
                        {sp.label}
                      </div>
                    )}
                    {spotLogs.map(l => renderLog(l, sp))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
    const w=img.clientWidth, h=img.clientHeight;
    if(!w||!h) return;
    canvas.width=w; canvas.height=h;
    canvas.style.width=w+'px'; canvas.style.height=h+'px';
    const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,w,h);
    markers.filter(m=>m.page===pageIdx).forEach(m=>{
      drawArrow(ctx, m.x*w, m.y*h, C.accent);
    });
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
    const x=(e.clientX-rect.left)/rect.width;
    const y=(e.clientY-rect.top)/rect.height;
    if(x<0||x>1||y<0||y>1) return;
    const hitX=44/img.clientWidth, hitY=44/img.clientHeight;
    const near=markers.findIndex(m=>m.page===currentPage&&Math.abs(m.x-x)<hitX&&Math.abs(m.y-y)<hitY);
    if(near>=0) setMarkers(prev=>prev.filter((_,i)=>i!==near));
    else setMarkers(prev=>[...prev,{page:currentPage,x,y}]);
  };

  const handleTap2 = e => {
    if(rightPage===null) return;
    const img=imgRef2.current; if(!img) return;
    const rect=img.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width;
    const y=(e.clientY-rect.top)/rect.height;
    if(x<0||x>1||y<0||y>1) return;
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
        center={
          <div style={{textAlign:'center',lineHeight:1.25}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',letterSpacing:'0.12em',color:C.cream}}>{piece?.title||'MARK UNITS'}</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:'0.82rem',color:C.muted,marginTop:1}}>Practice by the beat? By the measure?</div>
          </div>
        }
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

      <div style={{flex:'1 1 0',minHeight:0,background:'#e8e5e0',display:'flex',flexDirection:'row',position:'relative'}}>
        {/* Floating page arrows */}
        {totalPages>1 && currentPage>0 && (
          <button onClick={()=>setCurrentPage(p=>Math.max(0,showTwoPages?p-2:p-1))} style={{
            position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',zIndex:10,
            background:'rgba(255,255,255,0.85)',border:'none',color:C.cream,fontSize:'1.8rem',
            padding:'16px 10px',cursor:'pointer',borderRadius:'0 4px 4px 0',
            WebkitTapHighlightColor:'transparent',
          }}>‹</button>
        )}
        {totalPages>1 && currentPage<totalPages-1 && !(showTwoPages && currentPage+2>=totalPages) && (
          <button onClick={()=>setCurrentPage(p=>Math.min(totalPages-1,showTwoPages?p+2:p+1))} style={{
            position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',zIndex:10,
            background:'rgba(255,255,255,0.85)',border:'none',color:C.cream,fontSize:'1.8rem',
            padding:'16px 10px',cursor:'pointer',borderRadius:'4px 0 0 4px',
            WebkitTapHighlightColor:'transparent',
          }}>›</button>
        )}
        <div style={{position:'relative',flex:1,minWidth:0,overflow:'hidden'}}
          onTouchStart={e=>{e.currentTarget._sw={x:e.touches[0].clientX,t:Date.now()};}}
          onTouchEnd={e=>{const s=e.currentTarget._sw;if(!s)return;const dx=e.changedTouches[0].clientX-s.x;if(Math.abs(dx)>60&&Date.now()-s.t<400){if(dx<0&&currentPage<totalPages-1)setCurrentPage(p=>showTwoPages?p+2:p+1);if(dx>0&&currentPage>0)setCurrentPage(p=>showTwoPages?Math.max(0,p-2):p-1);}}}>
          <img ref={imgRef} src={pageImages[currentPage]}
            onLoad={()=>{setLoaded(true);requestAnimationFrame(()=>draw());}}
            onClick={handleTap}
            style={{width:'100%',height:'95%',objectFit:'contain',display:'block',
              userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none',WebkitTouchCallout:'none'}}
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
                userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none',WebkitTouchCallout:'none'}}
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
          <div style={{padding:'10px 14px',background:'#fff',border:`1px solid ${C.bord2}`,
            fontFamily:"'Inconsolata',monospace",fontSize:'0.95rem',color:C.cream,lineHeight:1.7}}>
            {Math.floor((goalTempo-startTempo)/increment)+1} steps per phase &nbsp;&middot;&nbsp; {N} phases
          </div>
        )}
        <Btn onClick={onStart} disabled={!valid} big full
          style={{background:valid?C.accent:'transparent',color:valid?'white':C.dim,borderColor:valid?C.accent:C.bord,fontSize:'1.3rem',padding:'18px 24px',letterSpacing:'0.15em',marginTop:8}}>
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
  const [icuSubdiv, setIcuSubdiv] = useState(1);
  const imgRef  = useRef();
  const canvasRef = useRef();
  const imgRef2S   = useRef();
  const canvasRef2S = useRef();
  const [imgLoaded,setImgLoaded]   = useState(false);
  const [imgLoaded2,setImgLoaded2] = useState(false);
  const land = useOrientation();

  const safeIdx  = Math.min(idx,steps.length-1);
  const step     = steps[safeIdx];

  // ICU spot - only created on save
  const [icuSpotId, setIcuSpotId] = useState(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  const handleDone = () => {
    setShowSavePrompt(true);
  };

  const saveAndExit = async () => {
    try {
      const prof = profile || JSON.parse(localStorage.getItem('murProfile')||'{}');
      if(prof.email) {
        const sid = await findOrCreateSpot(prof.email, piece?.id, tapPos);
        await sbPost('/rest/v1/practice_logs', {
          user_email: prof.email,
          spot_id: sid,
          piece_id: piece?.id||null,
          strategy: 'icu',
          session_date: localDate(),
          start_tempo: startTempo,
          max_tempo: step.tempo,
          perf_tempo: goalTempo,
          notes: `${N} units, completed`,
        });
      }
    } catch(e){}
    setShowSavePrompt(false);
    if(onDone) onDone();
  };

  const exitWithoutSaving = async () => {
    try {
      const prof = profile || JSON.parse(localStorage.getItem('murProfile')||'{}');
      if(prof.email) {
        await sbPost('/rest/v1/practice_logs', {
          user_email: prof.email,
          spot_id: null,
          piece_id: piece?.id||null,
          strategy: 'icu',
          session_date: localDate(),
          start_tempo: startTempo,
          max_tempo: step.tempo,
          perf_tempo: goalTempo,
          notes: `${N} units, not saved to score`,
        });
      }
    } catch(e){}
    setShowSavePrompt(false);
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
  // Resume AudioContext when app returns to foreground (iOS suspends it on background)
  useEffect(()=>{
    const onVisible = () => {
      if(document.visibilityState==='visible' && metroOn) {
        metro.current._ensureCtx();
        // Brief restart to resync timing
        metro.current.start(metro.current.bpm);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return ()=>document.removeEventListener('visibilitychange', onVisible);
  },[metroOn]);

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
    <div style={{flex:'1 1 0',minHeight:0,background:'#e8e5e0',display:'flex',position:'relative'}}>
      {/* Floating page arrows */}
      {pageImages.length>1 && currentPage>0 && (
        <button onClick={()=>setCurrentPage(p=>showTwo?Math.max(0,p-2):p-1)} style={{
          position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',zIndex:10,
          background:'rgba(255,255,255,0.85)',border:'none',color:C.cream,fontSize:'1.8rem',
          padding:'16px 10px',cursor:'pointer',borderRadius:'0 4px 4px 0',
          WebkitTapHighlightColor:'transparent',
        }}>‹</button>
      )}
      {pageImages.length>1 && currentPage<pageImages.length-1 && !(showTwo && currentPage+2>=pageImages.length) && (
        <button onClick={()=>setCurrentPage(p=>showTwo?Math.min(pageImages.length-1,p+2):p+1)} style={{
          position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',zIndex:10,
          background:'rgba(255,255,255,0.85)',border:'none',color:C.cream,fontSize:'1.8rem',
          padding:'16px 10px',cursor:'pointer',borderRadius:'4px 0 0 4px',
          WebkitTapHighlightColor:'transparent',
        }}>›</button>
      )}
      <div style={{position:'relative',flex:1,minWidth:0,overflow:'hidden'}}
        onTouchStart={e=>{e.currentTarget._sw={x:e.touches[0].clientX,t:Date.now()};}}
        onTouchEnd={e=>{const s=e.currentTarget._sw;if(!s)return;const dx=e.changedTouches[0].clientX-s.x;if(Math.abs(dx)>60&&Date.now()-s.t<400){if(dx<0&&currentPage<pageImages.length-1)setCurrentPage(p=>showTwo?p+2:p+1);if(dx>0&&currentPage>0)setCurrentPage(p=>showTwo?Math.max(0,p-2):p-1);}}}>
        <img ref={imgRef} src={pageImages[currentPage]}
          onLoad={()=>{setImgLoaded(true);requestAnimationFrame(()=>drawOverlay());}}
          style={{width:'100%',height:'95%',objectFit:'contain',display:'block',userSelect:'none'}}
          draggable={false} />
        <canvas ref={canvasRef} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}} />
      </div>
      {showTwo&&rightPageS!==null&&(
        <div style={{position:'relative',flex:1,minWidth:0,borderLeft:`1px solid ${C.bord}`,overflow:'hidden'}}>
          <img ref={imgRef2S} src={pageImages[rightPageS]}
            onLoad={()=>{setImgLoaded2(true);requestAnimationFrame(()=>drawOverlay());}}
            style={{width:'100%',height:'95%',objectFit:'contain',display:'block',userSelect:'none'}}
            draggable={false} />
          <canvas ref={canvasRef2S} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}} />
        </div>
      )}
    </div>
  );

  const topBarContent = (compact) => (
    <div style={{flexShrink:0,borderBottom:`1px solid ${C.bord}`,background:'#fff'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,padding:compact?'3px 8px':'5px 8px'}}>
        <button onClick={onBack} style={{background:'none',border:`1px solid ${C.bord2}`,color:C.cream,padding:'6px 10px',cursor:'pointer',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',letterSpacing:'0.1em',flexShrink:0}}>← EXIT</button>

        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {/* Tempo display */}
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:compact?'clamp(1.4rem,4vw,2rem)':'clamp(1.8rem,7vw,2.6rem)',color:atGoal?C.accent:C.cream,lineHeight:1}}>
            ♩ = {step.tempo}
            {pastGoal&&<span style={{fontSize:'0.4em',color:C.muted,marginLeft:8,verticalAlign:'middle'}}>PAST GOAL</span>}
          </div>

          {/* Metronome */}
          <button onClick={()=>setMetroOn(m=>!m)} style={{background:metroOn?C.accent:'#f0f0f0',border:`2px solid ${metroOn?C.accent:'#ccc'}`,color:metroOn?'white':'#333',width:compact?36:44,height:compact?36:44,cursor:'pointer',fontSize:compact?'1rem':'1.2rem',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            {metroOn?'⏸':'▶'}
          </button>

          <SubdivBtns subdiv={icuSubdiv} setSubdiv={setIcuSubdiv} metro={metro} metroOn={metroOn} bpm={step.tempo} compact={compact} />

          {/* Single NEXT button */}
          <button onClick={()=>{
            // At or past goal tempo → jump to next phase
            if(step.tempo >= goalTempo && hasNextPhase) {
              setIdx(nextPhaseIdx);
              return;
            }
            const nextIdx = idx + 1;
            if(nextIdx >= steps.length) { handleDone(); return; }
            // Crossing phase boundary naturally
            if(steps[nextIdx].phase !== step.phase && hasNextPhase) {
              setIdx(nextPhaseIdx);
            } else {
              setIdx(nextIdx);
            }
          }} disabled={idx>=steps.length-1 && !hasNextPhase} style={{
            background: idx<steps.length-1||hasNextPhase ? C.accent : 'transparent',
            border:`1px solid ${idx<steps.length-1||hasNextPhase ? C.accent : '#333'}`,
            color: idx<steps.length-1||hasNextPhase ? 'white' : '#444',
            padding:compact?'5px 12px':'6px 14px',
            fontFamily:"'Bebas Neue',sans-serif",fontSize:compact?'0.8rem':'0.9rem',
            letterSpacing:'0.08em',cursor:idx<steps.length-1||hasNextPhase?'pointer':'default',
            flexShrink:0,WebkitTapHighlightColor:'transparent',borderRadius:4,
          }}>NEXT →</button>
        </div>

        <button onClick={handleDone} style={{
          background:C.accent,border:`1px solid ${C.accent}`,
          color:'white',padding:'6px 10px',cursor:'pointer',
          fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',
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

  return (
    <div style={{display:'flex',flexDirection:'column',flex:'1 1 0',minHeight:0,background:'#fff'}}>
      {topBarContent(land)}
      {progressBar}
      {photoBlock}
      {/* Save prompt */}
      {showSavePrompt && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.3)'}}/>
          <div style={{position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
            zIndex:501,background:'#fff',border:`1px solid ${C.bord}`,
            borderRadius:12,padding:'24px',width:'min(340px,88vw)',
            display:'flex',flexDirection:'column',gap:14,textAlign:'center',
            boxShadow:'0 8px 40px rgba(0,0,0,0.15)'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',
              letterSpacing:'0.12em',color:C.accent}}>
              SESSION COMPLETE
            </div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',
              fontSize:'1.05rem',color:'#333',lineHeight:1.5}}>
              You reached ♩ = {step.tempo}. Save these settings for this passage?
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={saveAndExit} style={{
                flex:1,padding:'12px 0',background:C.accent,border:'none',color:'white',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',
                letterSpacing:'0.1em',cursor:'pointer',borderRadius:8,
                WebkitTapHighlightColor:'transparent',
              }}>SAVE</button>
              <button onClick={exitWithoutSaving} style={{
                flex:1,padding:'12px 0',background:'#f0f0f0',border:`1px solid ${C.bord}`,
                color:'#666',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',
                letterSpacing:'0.1em',cursor:'pointer',borderRadius:8,
                WebkitTapHighlightColor:'transparent',
              }}>DON'T SAVE</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
