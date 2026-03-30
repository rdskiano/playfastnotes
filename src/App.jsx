import React from "react";
import { useState, useRef, useEffect, useCallback } from "react";

/* ─── Supabase (shared with MUR) ─────────────────────────────────────── */
const SB_URL = 'https://twjdatheptwcskqhinie.supabase.co';
const SB_KEY = 'sb_publishable_BwKwqYjD_TTeL2BTu7jpTw_YQfdqvQ7';
const SB_H   = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
const sbGet  = p => fetch(SB_URL + p, { headers: SB_H });
const sbPost = (p, b) => fetch(SB_URL + p, { method: 'POST', headers: { ...SB_H, 'Prefer': 'return=representation' }, body: JSON.stringify(b) });

/* ─── Palette ────────────────────────────────────────────────────────── */
const C = {
  ink: '#1a1612', surf: '#110f0c', panel: '#1e1a15',
  bord: '#2a231d', bord2: '#3a2e24',
  accent: '#8b3a1a', accentH: '#a04520', gold: '#9a7010',
  rule: '#c8b89a', cream: '#f5f0e8', mid: '#5a4e42',
  muted: 'rgba(245,240,232,0.55)', dim: 'rgba(245,240,232,0.25)',
  dark: 'rgba(0,0,0,0.65)',
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Bebas+Neue&family=Inconsolata:wght@400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { font-family: 'Cormorant Garamond', Georgia, serif; background: ${C.ink}; }
  input[type=number], input[type=text], input[type=email] {
    background: ${C.panel}; color: ${C.cream};
    border: 1px solid ${C.bord}; padding: 9px 12px;
    font-family: 'Inconsolata', monospace; font-size: 1rem; width: 100%;
  }
  input:focus { outline: 1px solid ${C.accent}; }
  input[type=number] { width: 78px; text-align: center; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  input[type=number] { -moz-appearance: textfield; }
  select {
    appearance: none; -webkit-appearance: none;
    background: ${C.panel}; color: ${C.cream};
    border: 1px solid ${C.bord}; padding: 9px 12px;
    font-family: 'Inconsolata', monospace; font-size: 0.9rem; width: 100%;
    cursor: pointer;
  }
  select:focus { outline: 1px solid ${C.accent}; }
  button:focus { outline: none; }
`;

/* ─── Utilities ──────────────────────────────────────────────────────── */
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

function getProfile() {
  try { return JSON.parse(localStorage.getItem('murProfile') || '{}'); } catch { return {}; }
}
function setProfile(p) { localStorage.setItem('murProfile', JSON.stringify(p)); }

/* ─── ICU Step Generator ─────────────────────────────────────────────── */
function generateSteps(N, start, goal, inc) {
  const extGoal = goal + Math.max(N * 2, 20) * inc;
  const tempos = [];
  for (let t = start; t <= extGoal + 0.001; t += inc) tempos.push(Math.round(t));
  const steps = [];
  tempos.forEach(tempo => steps.push({ units: [0], tempo, phase: 1 }));
  for (let k = 2; k <= N; k++) {
    const cs = [0, ...Array.from({ length: k - 2 }, (_, i) => k - 2 - i)];
    tempos.forEach((tempo, i) => {
      const units = (i % 2 === 0)
        ? range(cs[Math.floor(i / 2) % cs.length], k)
        : [k - 1];
      steps.push({ units, tempo, phase: k });
    });
  }
  return steps;
}

/* ─── Metronome ──────────────────────────────────────────────────────── */
class Metro {
  constructor() { this.ctx = null; this.id = null; this.bpm = 80; this.next = 0; }
  _click(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.connect(g); g.connect(this.ctx.destination);
    o.frequency.value = 1100;
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    o.start(t); o.stop(t + 0.04);
  }
  _sched() {
    while (this.next < this.ctx.currentTime + 0.12) {
      this._click(this.next);
      this.next += 60 / this.bpm;
    }
    this.id = setTimeout(() => this._sched(), 40);
  }
  start(bpm) {
    this.stop(); this.bpm = bpm;
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.next = this.ctx.currentTime + 0.05;
    this._sched();
  }
  setBpm(bpm) { this.bpm = bpm; }
  stop() { if (this.id) { clearTimeout(this.id); this.id = null; } }
}

/* ─── Orientation hook ───────────────────────────────────────────────── */
function useOrientation() {
  const [land, setLand] = useState(() => window.innerWidth > window.innerHeight);
  useEffect(() => {
    const update = () => setLand(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', () => setTimeout(update, 100));
    return () => window.removeEventListener('resize', update);
  }, []);
  return land;
}

/* ─── Shared components ──────────────────────────────────────────────── */
const Btn = ({ children, onClick, active, disabled, big, full, style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em',
    fontSize: big ? '1.05rem' : '0.88rem',
    padding: big ? '12px 20px' : '9px 16px',
    width: full ? '100%' : undefined,
    background: active ? C.accent : disabled ? 'transparent' : '#2a231d',
    color: active ? 'white' : disabled ? C.dim : C.cream,
    border: `1px solid ${active ? C.accent : disabled ? C.bord : '#555'}`,
    borderRadius: 0, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.12s, color 0.12s, border-color 0.12s',
    userSelect: 'none', WebkitTapHighlightColor: 'transparent',
    ...style,
  }}>{children}</button>
);

const BackBtn = ({ onClick, label = '← BACK' }) => (
  <button onClick={onClick} style={{
    background: 'none', border: 'none', color: C.cream, padding: 0,
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem',
    letterSpacing: '0.1em', cursor: 'pointer',
  }}>{label}</button>
);

const HelpBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    background: 'none', border: `1px solid ${C.bord2}`, color: C.cream,
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.8rem',
    letterSpacing: '0.1em', padding: '5px 12px', cursor: 'pointer',
  }}>? HELP</button>
);

function HelpOverlay({ onClose }) {
  const S = {
    head: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem',
      letterSpacing: '0.15em', color: C.accent, marginBottom: 6 },
    body: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem',
      color: C.cream, lineHeight: 1.6 },
    sec:  { marginBottom: 22 },
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end',
      justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.ink, border: `1px solid ${C.bord2}`,
        width: '100%', maxWidth: 560, maxHeight: '85vh',
        overflowY: 'auto', padding: '28px 24px',
        borderRadius: '8px 8px 0 0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem',
            letterSpacing: '0.15em', color: C.cream }}>
            HOW IT WORKS
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            color: C.cream, fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={S.sec}>
          <div style={S.head}>WHAT IS THE INTERLEAVED CLICK-UP METHOD?</div>
          <div style={S.body}>
            A proven technique for building speed gradually and cleanly. You start slow
            and work up to your goal tempo one unit at a time, always connecting
            each new unit back to what came before.
          </div>
        </div>

        <div style={S.sec}>
          <div style={S.head}>STEP 1 — ADD YOUR PIECE</div>
          <div style={S.body}>
            Upload a photo or PDF of the passage you want to practice.
            You can upload a screenshot, a photo of your part, or a full PDF.
            Once uploaded it stays in your library forever.
          </div>
        </div>

        <div style={S.sec}>
          <div style={S.head}>STEP 2 — MARK YOUR UNITS</div>
          <div style={S.body}>
            Tap the first note of each unit directly on the score.
            A unit is typically one or two beats — whatever feels natural
            as a building block for this passage.
            Tap a marker to remove it. You need at least 2 markers to continue.
          </div>
        </div>

        <div style={S.sec}>
          <div style={S.head}>STEP 3 — SET YOUR TEMPOS</div>
          <div style={S.body}>
            Set a start tempo (slow enough to be completely clean),
            a goal tempo (your target performance speed),
            and an increment (how many BPM to jump each step — 5 is typical).
          </div>
        </div>

        <div style={S.sec}>
          <div style={S.head}>STEP 4 — PRACTICE</div>
          <div style={S.body}>
            The app guides you step by step. Green arrows show exactly where
            to start and stop each time. Use <strong>NEXT STEP</strong> to move
            to the next tempo within a phase, and <strong>NEXT PHASE</strong>
            when you're ready to add a new unit. The metronome button turns
            on a click at the current tempo.
          </div>
        </div>

        <div style={S.sec}>
          <div style={S.head}>THE OVERLAP RULE</div>
          <div style={S.body}>
            Every unit ends on the first note of the next unit.
            This is intentional — it trains the connection between units,
            which is where mistakes usually happen.
          </div>
        </div>

        <button onClick={onClose} style={{
          width: '100%', background: C.accent, color: 'white', border: 'none',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem',
          letterSpacing: '0.12em', padding: '14px', cursor: 'pointer', marginTop: 8,
        }}>GOT IT</button>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.65rem',
      letterSpacing: '0.2em', color: C.accent }}>{label}</div>
    {children}
  </div>
);

const TopBar = ({ left, center, right }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', height: 52, flexShrink: 0,
    borderBottom: `2px solid ${C.accent}`, background: C.ink,
  }}>
    <div style={{ minWidth: 80 }}>{left}</div>
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem',
      letterSpacing: '0.15em', color: C.cream }}>{center}</div>
    <div style={{ minWidth: 80, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
  </div>
);


/* ════════════════════════════════════════════════════════════════════════
   HELP OVERLAY
════════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════════
   ROOT APP
════════════════════════════════════════════════════════════════════════ */
export default function ICUApp() {
  const [screen, setScreen]         = useState('signin');
  const [showHelp, setShowHelp]       = useState(false);
  const [profile, setProfileState]  = useState(getProfile);
  const [piece, setPiece]           = useState(null);   // selected piece object
  const [pageImages, setPageImages] = useState([]);     // rendered page image URLs
  const [currentPage, setCurrentPage] = useState(0);
  const [markers, setMarkers]       = useState([]);     // [{page, x, y}]
  const [startTempo, setStartTempo] = useState(60);
  const [goalTempo, setGoalTempo]   = useState(120);
  const [increment, setIncrement]   = useState(5);

  const saveProfile = p => { setProfile(p); setProfileState(p); };
  const N = [...new Set(markers.map(m => m.page))].length > 0
    ? markers.length
    : markers.length;

  useEffect(() => {
    if (profile?.email) setScreen('library');
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.ink, color: C.cream }}>
      <style>{FONTS}</style>
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
      {screen === 'signin' && (
        <SignInScreen onSignIn={p => { saveProfile(p); setScreen('library'); }} />
      )}
      {screen === 'library' && (
        <LibraryScreen
          profile={profile}
          onSelectPiece={(p, imgs) => {
            setPiece(p); setPageImages(imgs);
            setMarkers([]); setCurrentPage(0);
            setScreen('mark');
          }}
          onSignOut={() => { setProfile({}); setProfileState({}); setScreen('signin'); }}
        />
      )}
      {screen === 'mark' && (
        <MarkerScreen
          piece={piece}
          pageImages={pageImages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          markers={markers}
          setMarkers={setMarkers}
          onBack={() => setScreen('library')}
          onNext={() => setScreen('params')}
        />
      )}
      {screen === 'params' && (
        <ParamsScreen
          N={N}
          startTempo={startTempo} setStartTempo={setStartTempo}
          goalTempo={goalTempo}   setGoalTempo={setGoalTempo}
          increment={increment}   setIncrement={setIncrement}
          onBack={() => setScreen('mark')}
          onStart={() => setScreen('session')}
        />
      )}
      {screen === 'session' && (
        <SessionScreen
          pageImages={pageImages}
          markers={markers}
          N={N}
          startTempo={startTempo}
          goalTempo={goalTempo}
          increment={increment}
          onBack={() => setScreen('params')}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SIGN IN
════════════════════════════════════════════════════════════════════════ */
function SignInScreen({ onSignIn }) {
  const [email, setEmail]   = useState('');
  const [name, setName]     = useState('');
  const [inst, setInst]     = useState('');
  const [msg, setMsg]       = useState('');
  const [loading, setLoad]  = useState(false);

  const INSTRUMENTS = ['Flute','Oboe','Clarinet','Bassoon','Saxophone','Horn',
    'Trumpet','Trombone','Tuba','Violin','Viola','Cello','Double Bass',
    'Harp','Piano','Percussion','Voice','Other'];

  const submit = async () => {
    if (!email.trim()) { setMsg('Please enter your email.'); return; }
    setLoad(true); setMsg('');
    try {
      const r = await sbGet(`/rest/v1/profiles?email=eq.${encodeURIComponent(email.trim())}&limit=1`);
      const rows = await r.json();
      let p;
      if (rows?.length) {
        p = { email: rows[0].email, name: rows[0].name || '', instrument: rows[0].instrument || '' };
        setMsg('Welcome back, ' + (p.name || p.email) + '!');
      } else {
        if (!name.trim() || !inst) { setMsg('New account — please enter your name and instrument.'); setLoad(false); return; }
        await fetch(SB_URL + '/rest/v1/profiles', {
          method: 'POST',
          headers: { ...SB_H, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({ email: email.trim(), name: name.trim(), instrument: inst }),
        });
        p = { email: email.trim(), name: name.trim(), instrument: inst };
        setMsg('Account created!');
      }
      setTimeout(() => onSignIn(p), 800);
    } catch { setMsg('Connection error — check your network.'); setLoad(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: '32px 24px', gap: 36 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(2rem, 8vw, 3rem)', letterSpacing: '0.2em',
          color: C.accent, lineHeight: 1 }}>
          INTERLEAVED<br />CLICK-UP METHOD
        </div>
        <div style={{ fontFamily: "'Inconsolata', monospace", fontSize: '0.7rem',
          letterSpacing: '0.14em', color: C.muted, marginTop: 10 }}>
          A GUIDED PRACTICE TOOL
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 380, display: 'flex',
        flexDirection: 'column', gap: 16 }}>
        <Field label="Email">
          <input type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" />
        </Field>
        <Field label="Name (new accounts)">
          <input type="text" value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name" />
        </Field>
        <Field label="Instrument (new accounts)">
          <div style={{ position: 'relative' }}>
            <select value={inst} onChange={e => setInst(e.target.value)}>
              <option value="">Select instrument...</option>
              {INSTRUMENTS.map(i => <option key={i}>{i}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%',
              transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }}>
              &#9662;
            </span>
          </div>
        </Field>

        {msg && <div style={{ fontFamily: "'Inconsolata', monospace", fontSize: '0.8rem',
          color: msg.includes('error') || msg.includes('Please') ? '#e57373' : C.gold }}>
          {msg}
        </div>}

        <Btn onClick={submit} disabled={loading} big full>
          {loading ? 'CHECKING...' : 'SIGN IN →'}
        </Btn>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PIECE LIBRARY
════════════════════════════════════════════════════════════════════════ */
function LibraryScreen({ profile, onSelectPiece, onSignOut }) {
  const [pieces, setPieces]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle]     = useState('');
  const [composer, setComposer] = useState('');
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef();

  const INSTRUMENTS = ['Flute','Oboe','Clarinet','Bassoon','Saxophone','Horn',
    'Trumpet','Trombone','Tuba','Violin','Viola','Cello','Double Bass',
    'Harp','Piano','Percussion','Voice','Other'];
  const [inst, setInst] = useState(profile.instrument || '');

  useEffect(() => { loadPieces(); }, []);

  const loadPieces = async () => {
    setLoading(true);
    try {
      const r = await sbGet(`/rest/v1/pieces?user_email=eq.${encodeURIComponent(profile.email)}&order=created_at.desc`);
      const data = await r.json();
      setPieces(data || []);
    } catch { setPieces([]); }
    setLoading(false);
  };

  const uploadFile = async (file) => {
    if (!title.trim()) { setUploadMsg('Please enter a title.'); return; }
    if (!file) { setUploadMsg('Please select a file.'); return; }
    setUploading(true); setUploadMsg('Uploading...');
    try {
      const ext  = file.name.split('.').pop().toLowerCase();
      const type = ext === 'pdf' ? 'pdf' : 'image';
      const path = `${profile.email.replace('@','_')}/${Date.now()}.${ext}`;

      const uploadR = await fetch(
        `${SB_URL}/storage/v1/object/pieces/${path}`,
        { method: 'POST',
          headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': file.type, 'x-upsert': 'true' },
          body: file }
      );
      if (!uploadR.ok) throw new Error('Upload failed');

      const fileUrl = `${SB_URL}/storage/v1/object/public/pieces/${path}`;
      await sbPost('/rest/v1/pieces', {
        user_email: profile.email, title: title.trim(),
        composer: composer.trim(), instrument: inst,
        file_url: fileUrl, file_type: type,
      });

      setUploadMsg('Saved!');
      setTitle(''); setComposer('');
      setTimeout(() => { setShowUpload(false); setUploadMsg(''); loadPieces(); }, 800);
    } catch (e) { setUploadMsg('Upload failed. ' + e.message); }
    setUploading(false);
  };

  const openPiece = async (piece) => {
    if (piece.file_type === 'image') {
      onSelectPiece(piece, [piece.file_url]);
    } else {
      // PDF — render pages via PDF.js
      try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        if (!pdfjsLib) throw new Error('PDF.js not loaded');
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument(piece.file_url).promise;
        const imgs = [];
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const vp   = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width  = vp.width;
          canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
          imgs.push(canvas.toDataURL('image/png'));
        }
        onSelectPiece(piece, imgs);
      } catch { onSelectPiece(piece, [piece.file_url]); }
    }
  };

  return (
    <>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        <TopBar
          left={<span style={{ fontFamily: "'Inconsolata', monospace", fontSize: '0.7rem',
            color: C.muted }}>{profile.name || profile.email}</span>}
          center="INTERLEAVED CLICK-UP"
          right={<div style={{display:'flex',gap:8}}><BackBtn onClick={() => {}} label="?"/><BackBtn onClick={onSignOut} label="SIGN OUT" /></div>}
        />

        <div style={{ flex: '1 1 0', overflowY: 'auto', padding: '16px' }}>
          {/* Add piece button */}
          <button
            onClick={() => setShowUpload(s => !s)}
            style={{ width: '100%', border: `2px dashed ${C.bord2}`,
              background: 'none', color: C.cream, padding: '18px',
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem',
              letterSpacing: '0.12em', cursor: 'pointer', marginBottom: 16 }}>
            + ADD A PIECE
          </button>

          {/* Upload form */}
          {showUpload && (
            <div style={{ background: C.panel, border: `1px solid ${C.bord}`,
              padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Title">
                <input type="text" value={title}
                  onChange={e => setTitle(e.target.value)} placeholder="e.g. Brahms Sonata mvt 1" />
              </Field>
              <Field label="Composer">
                <input type="text" value={composer}
                  onChange={e => setComposer(e.target.value)} placeholder="e.g. Brahms" />
              </Field>
              <Field label="Instrument">
                <div style={{ position: 'relative' }}>
                  <select value={inst} onChange={e => setInst(e.target.value)}>
                    <option value="">Select...</option>
                    {INSTRUMENTS.map(i => <option key={i}>{i}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }}>&#9662;</span>
                </div>
              </Field>
              <Field label="File (PDF or image)">
                <input ref={fileRef} type="file" accept=".pdf,image/*"
                  style={{ padding: '8px 0', border: 'none', background: 'none',
                    color: C.cream, fontFamily: "'Inconsolata', monospace", fontSize: '0.85rem' }}
                  onChange={e => e.target.files[0] && uploadFile(e.target.files[0])} />
              </Field>
              {uploadMsg && (
                <div style={{ fontFamily: "'Inconsolata', monospace", fontSize: '0.8rem',
                  color: uploadMsg.includes('failed') || uploadMsg.includes('Please') ? '#e57373' : C.gold }}>
                  {uploadMsg}
                </div>
              )}
              {uploading && (
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.8rem',
                  color: C.muted, letterSpacing: '0.1em' }}>UPLOADING...</div>
              )}
            </div>
          )}

          {/* Piece list */}
          {loading && (
            <div style={{ fontFamily: "'Inconsolata', monospace", fontSize: '0.85rem',
              color: C.muted, textAlign: 'center', padding: 40 }}>Loading...</div>
          )}
          {!loading && pieces.length === 0 && !showUpload && (
            <div style={{ textAlign: 'center', padding: 60, color: C.muted,
              fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.1rem' }}>
              No pieces yet — add one above
            </div>
          )}
          {pieces.map(p => (
            <div key={p.id}
              onClick={() => openPiece(p)}
              style={{ padding: '16px 14px', borderBottom: `1px solid ${C.bord}`,
                cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.panel}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem',
                letterSpacing: '0.08em', color: C.cream }}>{p.title || 'Untitled'}</div>
              <div style={{ fontFamily: "'Inconsolata', monospace", fontSize: '0.7rem',
                color: C.muted, marginTop: 3 }}>
                {[p.composer, p.instrument, p.file_type?.toUpperCase()].filter(Boolean).join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MARKER SCREEN
════════════════════════════════════════════════════════════════════════ */
function MarkerScreen({ piece, pageImages, currentPage, setCurrentPage, markers, setMarkers, onBack, onNext }) {
  const imgRef    = useRef();
  const canvasRef = useRef();
  const [loaded, setLoaded]   = useState(false);
  const land = useOrientation();
  const totalPages = pageImages.length;

  const drawArrow = (ctx, px, py, color) => {
    const stemH = 22, headW = 7, headH = 7;
    const tipY = py - 3, stemY = tipY - stemH;
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, stemY); ctx.lineTo(px, tipY - headH); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px - headW, tipY - headH);
    ctx.lineTo(px + headW, tipY - headH);
    ctx.lineTo(px, tipY);
    ctx.closePath(); ctx.fill();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current, img = imgRef.current;
    if (!canvas || !img) return;
    const w = img.clientWidth, h = img.clientHeight;
    if (!w || !h) return;
    canvas.width = w; canvas.height = h;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    markers
      .filter(m => m.page === currentPage)
      .forEach(m => drawArrow(ctx, m.x * w, m.y * h, C.accent));
  }, [markers, currentPage]);

  useEffect(() => {
    if (loaded) {
      draw();
      // Re-draw after layout settles (fixes first-page blank canvas)
      const t = setTimeout(() => draw(), 80);
      return () => clearTimeout(t);
    }
  }, [loaded, draw]);
  useEffect(() => { setLoaded(false); }, [currentPage]);
  useEffect(() => {
    const ro = new ResizeObserver(() => { if (loaded) draw(); });
    if (imgRef.current) ro.observe(imgRef.current);
    return () => ro.disconnect();
  }, [loaded, draw]);

  const handleTap = e => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    const hitX = 36 / img.clientWidth, hitY = 36 / img.clientHeight;
    const near = markers.findIndex(m =>
      m.page === currentPage && Math.abs(m.x - x) < hitX && Math.abs(m.y - y) < hitY
    );
    if (near >= 0) {
      setMarkers(prev => prev.filter((_, i) => i !== near));
    } else {
      setMarkers(prev => [...prev, { page: currentPage, x, y }]);
    }
  };

  const pageMarkers = markers.filter(m => m.page === currentPage).length;
  const totalMarkers = markers.length;

  const pageNav = totalPages > 1 && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <Btn onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
        disabled={currentPage === 0} style={{ padding: '6px 14px' }}>←</Btn>
      <span style={{ fontFamily: "'Inconsolata', monospace", fontSize: '0.8rem',
        color: C.cream, minWidth: 60, textAlign: 'center' }}>
        p.{currentPage + 1} / {totalPages}
      </span>
      <Btn onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
        disabled={currentPage === totalPages - 1} style={{ padding: '6px 14px' }}>→</Btn>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <TopBar
        left={<BackBtn onClick={onBack} />}
        center="MARK UNITS"
        right={<Btn onClick={onNext} disabled={totalMarkers < 2}>NEXT →</Btn>}
      />

      {/* Instruction + page nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', flexShrink: 0, borderBottom: `1px solid ${C.bord}`,
        gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: C.cream }}>
          Tap the <em>first note</em> of each unit in order &mdash; at least 2 markers needed.
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16,
          letterSpacing: '0.08em', color: C.accent }}>
          {totalMarkers} marker{totalMarkers !== 1 ? 's' : ''} placed
          {pageMarkers > 0 && totalPages > 1 ? ` (${pageMarkers} this page)` : ''}
        </div>
        {pageNav}
      </div>

      {/* Score */}
      <div style={{ position: 'relative', flex: '1 1 0', minHeight: 0,
        background: '#0a0805', overflowY: 'auto' }}>
        <img ref={imgRef} src={pageImages[currentPage]}
          onLoad={() => setLoaded(true)}
          onClick={handleTap}
          style={{ width: '100%', display: 'block', cursor: 'crosshair', userSelect: 'none' }}
          draggable={false} />
        <canvas ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PARAMS SCREEN
════════════════════════════════════════════════════════════════════════ */
function ParamsScreen({ N, startTempo, setStartTempo, goalTempo, setGoalTempo,
  increment, setIncrement, onBack, onStart }) {

  const valid = goalTempo > startTempo && increment > 0 && increment <= goalTempo - startTempo;


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <TopBar
        left={<BackBtn onClick={onBack} />}
        center="SESSION SETUP"
        right={null}
      />

      <div style={{ flex: '1 1 0', overflowY: 'auto', padding: '24px 20px',
        display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 480, margin: '0 auto', width: '100%' }}>

        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem',
          color: C.cream, letterSpacing: '0.1em' }}>
          {N} UNIT{N !== 1 ? 'S' : ''}
        </div>

        <Spinner label="START TEMPO" value={startTempo} set={setStartTempo} min={20} max={goalTempo - 1} />
        <Spinner label="GOAL TEMPO"  value={goalTempo}  set={setGoalTempo}  min={startTempo + 1} max={320} />
        <Spinner label="INCREMENT"   value={increment}  set={setIncrement}  min={1} max={40} />

        {valid && (
          <div style={{ padding: '12px 14px', background: C.panel,
            border: `1px solid ${C.bord2}`, fontFamily: "'Inconsolata', monospace",
            fontSize: '1rem', color: C.cream, lineHeight: 1.8 }}>
            {Math.floor((goalTempo - startTempo) / increment) + 1} steps per phase &nbsp;&middot;&nbsp; {N} phases
          </div>
        )}


      </div>

      <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.bord}`, flexShrink: 0 }}>
        <Btn onClick={onStart} disabled={!valid} big full
          style={{ background: C.accent, color: 'white', borderColor: C.accent,
            fontSize: '1.15rem', padding: '16px' }}>
          BEGIN SESSION →
        </Btn>
      </div>
    </div>
  );
}

function Spinner({ label, value, set, min, max }) {
  const S = { background: 'none', border: `1px solid ${C.bord}`, color: C.cream,
    width: 34, height: 34, cursor: 'pointer', fontSize: '1.1rem',
    fontFamily: 'monospace', flexShrink: 0 };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em',
        fontSize: '1.2rem', color: C.cream }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={S} onClick={() => set(v => Math.max(min, v - 1))}>-</button>
        <input type="number" value={value}
          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) set(Math.max(min, Math.min(max, v))); }} />
        <button style={S} onClick={() => set(v => Math.min(max, v + 1))}>+</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SESSION SCREEN
════════════════════════════════════════════════════════════════════════ */
function SessionScreen({ pageImages, markers, N, startTempo, goalTempo, increment, onBack }) {
  const steps      = useRef(generateSteps(N, startTempo, goalTempo, increment)).current;
  const [idx, setIdx]         = useState(0);
  const [metroOn, setMetroOn] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => markers[0]?.page || 0);
  const metro   = useRef(new Metro());
  const imgRef  = useRef();
  const canvasRef = useRef();
  const land    = useOrientation();
  const [imgLoaded, setImgLoaded] = useState(false);

  const safeIdx  = Math.min(idx, steps.length - 1);
  const step     = steps[safeIdx];
  const atGoal   = step.tempo >= goalTempo;
  const pastGoal = step.tempo > goalTempo;
  const nextPhaseIdx = steps.findIndex((s, i) => i > safeIdx && s.phase === step.phase + 1);
  const hasNextPhase = nextPhaseIdx >= 0;
  const progress = (safeIdx + 1) / steps.length;

  const unitLabel = step.units.length === 1
    ? `UNIT ${step.units[0] + 1}`
    : `UNITS ${step.units[0] + 1}\u2013${step.units[step.units.length - 1] + 1}`;

  // Auto-advance page to show active start marker
  useEffect(() => {
    const activeStart = step.units[0];
    if (markers[activeStart]) setCurrentPage(markers[activeStart].page);
  }, [step.units]);

  useEffect(() => { setImgLoaded(false); }, [currentPage]);

  useEffect(() => {
    if (metroOn) metro.current.start(step.tempo);
    else metro.current.stop();
  }, [metroOn]);
  useEffect(() => { metro.current.setBpm(step.tempo); }, [step.tempo]);
  useEffect(() => () => metro.current.stop(), []);

  const drawArrow = (ctx, px, py, color, big) => {
    const stemH = big ? 26 : 18, headW = big ? 7 : 5, headH = big ? 7 : 5;
    const tipY = py - 3, stemY = tipY - stemH;
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = big ? 2.5 : 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, stemY); ctx.lineTo(px, tipY - headH); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px - headW, tipY - headH);
    ctx.lineTo(px + headW, tipY - headH);
    ctx.lineTo(px, tipY);
    ctx.closePath(); ctx.fill();
  };

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current, img = imgRef.current;
    if (!canvas || !img) return;
    const w = img.clientWidth, h = img.clientHeight;
    if (!w || !h) return;
    canvas.width = w; canvas.height = h;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const activeStart = step.units[0];
    const activeEnd   = Math.min(step.units[step.units.length - 1] + 1, markers.length - 1);
    const GREEN = '#3db06a';

    markers
      .filter(m => m.page === currentPage)
      .forEach((m, localIdx) => {
        const globalIdx = markers.findIndex(gm => gm === m);
        const isStart = globalIdx === activeStart;
        const isEnd   = globalIdx === activeEnd;
        const isActive = globalIdx >= activeStart && globalIdx <= activeEnd;
        const color = (isStart || isEnd) ? GREEN : '#888';
        const big   = isStart || isEnd;
        ctx.globalAlpha = isActive ? 1 : 0.35;
        drawArrow(ctx, m.x * w, m.y * h, color, big);
        ctx.globalAlpha = 1;
      });
  }, [step.units, markers, currentPage]);

  useEffect(() => {
    if (imgLoaded) {
      drawOverlay();
      const t = setTimeout(() => drawOverlay(), 80);
      return () => clearTimeout(t);
    }
  }, [imgLoaded, drawOverlay]);
  useEffect(() => {
    const ro = new ResizeObserver(() => { if (imgLoaded) drawOverlay(); });
    if (imgRef.current) ro.observe(imgRef.current);
    return () => ro.disconnect();
  }, [imgLoaded, drawOverlay]);

  const totalPages = pageImages.length;

  const photoBlock = (
    <div style={{ position: 'relative', flex: '1 1 0', minHeight: 0,
      background: '#0a0805', overflowY: land ? 'hidden' : 'auto' }}>
      <img ref={imgRef} src={pageImages[currentPage]}
        onLoad={() => setImgLoaded(true)}
        style={{ width: '100%', height: land ? '100%' : 'auto',
          objectFit: land ? 'contain' : 'initial',
          display: 'block', userSelect: 'none' }}
        draggable={false} />
      <canvas ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      {/* Page indicators */}
      {totalPages > 1 && (
        <div style={{ position: 'absolute', bottom: 8, right: 10,
          fontFamily: "'Inconsolata', monospace", fontSize: '0.7rem',
          color: 'white', background: 'rgba(0,0,0,0.55)', padding: '2px 8px' }}>
          p.{currentPage + 1}/{totalPages}
        </div>
      )}
    </div>
  );

  const progressBar = (
    <div style={{ height: 3, background: C.bord, flexShrink: 0 }}>
      <div style={{ height: '100%', background: C.accent,
        width: `${progress * 100}%`, transition: 'width 0.25s' }} />
    </div>
  );

  const tempoBlock = (compact) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
      border: `1px solid ${atGoal ? C.accent : C.bord}`,
      padding: compact ? '2px 10px' : '8px 16px',
      minWidth: compact ? 80 : 'auto',
      background: C.panel }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif",
        fontSize: compact ? 22 : 'clamp(2rem,9vw,3.2rem)',
        color: atGoal ? C.accent : C.cream, lineHeight: 1 }}>
        {compact ? `♩=${step.tempo}` : `♩ = ${step.tempo}`}
        {!compact && pastGoal && <span style={{ fontSize: '0.4em', color: C.cream,
          marginLeft: 12, verticalAlign: 'middle' }}>PAST GOAL</span>}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif",
        fontSize: compact ? 11 : 15, color: C.cream,
        letterSpacing: compact ? '0.06em' : '0.1em', marginTop: compact ? 0 : 2 }}>
        {unitLabel}
      </div>
    </div>
  );

  if (land) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: C.ink }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 14px', flexShrink: 0, borderBottom: `2px solid ${C.accent}` }}>
          <BackBtn onClick={onBack} label="← SETUP" />
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14,
            letterSpacing: '0.12em', color: C.cream }}>
            PHASE {step.phase} · STEP {safeIdx + 1}/{steps.length}
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14,
            color: atGoal ? C.accent : C.cream }}>
            {atGoal ? '★ GOAL' : `GOAL ${goalTempo}`}
          </div>
        </div>
        {progressBar}
        {photoBlock}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 6,
          padding: '5px 10px', flexShrink: 0,
          borderTop: `1px solid ${C.bord}`, background: C.ink }}>
          {tempoBlock(true)}
          <Btn onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            style={{ flex: 1 }}>←</Btn>
          <Btn onClick={() => setMetroOn(m => !m)} active={metroOn} style={{ flex: 1 }}>
            {metroOn ? '⏸' : '▶'}
          </Btn>
          <Btn onClick={() => setIdx(nextPhaseIdx)} disabled={!hasNextPhase}
            style={{ flex: 2, borderColor: hasNextPhase ? C.accent : C.bord,
              background: hasNextPhase ? C.accent : 'transparent',
              color: hasNextPhase ? 'white' : C.dim }}>
            NEXT PHASE »
          </Btn>
          <Btn onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))}
            disabled={idx >= steps.length - 1}
            style={{ flex: 3, background: C.accent, color: 'white', borderColor: C.accent }}>
            NEXT STEP →
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh',
      background: C.ink, maxWidth: 768, margin: '0 auto' }}>

      {/* Slim top bar with all info + metro */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px', flexShrink: 0,
        borderBottom: `2px solid ${C.accent}`, background: C.ink }}>
        <BackBtn onClick={onBack} label="←" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center',
          gap: 10, minWidth: 0 }}>
          {tempoBlock(true)}
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13,
            color: C.cream, letterSpacing: '0.08em', minWidth: 0 }}>
            <div>PH {step.phase} · {safeIdx + 1}/{steps.length}</div>
            <div style={{ color: atGoal ? C.accent : C.cream, fontSize: 12 }}>
              {atGoal ? '★ GOAL' : `GOAL ${goalTempo}`}
            </div>
          </div>
        </div>
        <Btn onClick={() => setMetroOn(m => !m)} active={metroOn}
          style={{ padding: '6px 14px', fontSize: '1rem' }}>
          {metroOn ? '⏸' : '▶'}
        </Btn>
      </div>

      {progressBar}
      {photoBlock}

      {/* Compact bottom controls */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 10px',
        flexShrink: 0, borderTop: `1px solid ${C.bord}` }}>
        <Btn onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          style={{ flex: 1 }}>←</Btn>
        <Btn onClick={() => setIdx(nextPhaseIdx)} disabled={!hasNextPhase}
          style={{ flex: 2, borderColor: hasNextPhase ? C.accent : C.bord,
            background: hasNextPhase ? C.accent : 'transparent',
            color: hasNextPhase ? 'white' : C.dim }}>
          +PHASE
        </Btn>
        <Btn onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))}
          disabled={idx >= steps.length - 1}
          style={{ flex: 3, background: C.accent, color: 'white', borderColor: C.accent }}>
          NEXT STEP →
        </Btn>
      </div>
    </div>
  );
}
