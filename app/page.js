'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

const BASS_LABELS = ['No bass','Light','Balanced','Punchy','Heavy','Full bass']
const ENERGY_LABELS = ['Meditative','Very low','Low','Medium','High','Peak']
const VOX_LABELS = ['Instrumental','Some vocals','Full vocals']
const DARK_LABELS = ['Bright & euphoric','Mostly bright','Neutral','Somewhat dark','Dark & brooding','Pitch black']
const FAM_LABELS = ['Only known','Mostly familiar','Half & half','Mostly new','All discoveries','Uncharted']

const MOOD_PRESETS = {
  Focus:      { bass:40, energy:45, bpm:100, darkness:35, familiarity:40 },
  Chill:      { bass:35, energy:25, bpm:85,  darkness:30, familiarity:45 },
  Energize:   { bass:65, energy:80, bpm:128, darkness:25, familiarity:55 },
  Melancholy: { bass:30, energy:30, bpm:80,  darkness:70, familiarity:35 },
  Hype:       { bass:85, energy:95, bpm:140, darkness:20, familiarity:60 },
}
const MOOD_COLORS = {
  Focus:'#185FA5', Chill:'#0F6E56', Energize:'#993C1D', Melancholy:'#534AB7', Hype:'#A32D2D'
}
const MOOD_BG = {
  Focus:'#E6F1FB', Chill:'#E1F5EE', Energize:'#FAECE7', Melancholy:'#EEEDFE', Hype:'#FCEBEB'
}
const MOOD_DESC = {
  Focus:'Deep concentration', Chill:'Laid back & easy', Energize:'Push through it', Melancholy:'Feels & reflection', Hype:'Full send'
}

function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function fmtDur(ms){const s=Math.round(ms/1000);return`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}
function fmtMs(ms){const m=Math.round(ms/60000);return`${Math.floor(m/60)}h ${m%60}m`}

// ── GAUGE COMPONENT ───────────────────────────────────────────────
function Gauge({ label, value, onChange, color = '#1a1a1a', sublabels }) {
  const pct = value / 100
  const arcLen = (259 * pct).toFixed(1)
  const angle = -135 + pct * 270
  const rad = angle * Math.PI / 180
  const nx = (80 + 50 * Math.cos(rad)).toFixed(2)
  const ny = (80 + 50 * Math.sin(rad)).toFixed(2)
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (-225 + i * (270 / 11)) * Math.PI / 180
    const r1 = 62, r2 = i % 3 === 0 ? 67 : 65
    return { x1: (80+r1*Math.cos(a)).toFixed(2), y1: (80+r1*Math.sin(a)).toFixed(2), x2: (80+r2*Math.cos(a)).toFixed(2), y2: (80+r2*Math.sin(a)).toFixed(2), thick: i%3===0 }
  })
  const sub = sublabels
    ? sublabels[Math.min(Math.round(value / 20), 5)]
    : label === 'Bass' ? BASS_LABELS[Math.min(Math.round(value/20),5)]
    : ENERGY_LABELS[Math.min(Math.round(value/20),5)]

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 12px', background:'#f7f7f5', borderRadius:12 }}>
      <div style={{ fontSize:10, fontWeight:500, color:'#aaa', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:10, alignSelf:'flex-start' }}>{label}</div>
      <svg width="140" height="140" viewBox="0 0 160 160" style={{ overflow:'visible' }}>
        <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="0.5" strokeDasharray="3 7"/>
        <circle cx="80" cy="80" r="55" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
        <circle cx="80" cy="80" r="38" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="0.5" strokeDasharray="2 9"/>
        {ticks.map((t,i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(0,0,0,0.1)" strokeWidth={t.thick?1.5:0.7} strokeLinecap="round"/>)}
        <circle cx="80" cy="80" r="55" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="9" strokeLinecap="round" strokeDasharray="259 346" strokeDashoffset="-43.5"/>
        <circle cx="80" cy="80" r="55" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${arcLen} 346`} strokeDashoffset="-43.5" style={{ transition:'stroke-dasharray 0.3s' }}/>
        <line x1="80" y1="80" x2={nx} y2={ny} stroke={color} strokeWidth="1.5" strokeLinecap="round" style={{ transition:'all 0.3s' }}/>
        <circle cx={nx} cy={ny} r="4.5" fill={color} style={{ transition:'all 0.3s' }}/>
        <circle cx="80" cy="80" r="5.5" fill="white" stroke={color} strokeWidth="1.5"/>
        <text x="80" y="94" textAnchor="middle" fontSize="19" fontWeight="500" fill="#1a1a1a" fontFamily="-apple-system,sans-serif">{Math.round(value)}</text>
        <text x="80" y="107" textAnchor="middle" fontSize="9" fill="#aaa" fontFamily="-apple-system,sans-serif">{sub}</text>
      </svg>
      <input type="range" min="0" max="100" value={value} step="1" onChange={e => onChange(+e.target.value)} style={{ width:120, marginTop:8, accentColor:color }}/>
    </div>
  )
}

// ── SLIM SLIDER ───────────────────────────────────────────────────
function SlimSlider({ label, value, onChange, displayValue, color = '#1a1a1a' }) {
  return (
    <div style={{ background:'#f7f7f5', borderRadius:10, padding:'13px 14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:500, color:'#888' }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:500, color:'#1a1a1a' }}>{displayValue}</span>
      </div>
      <input type="range" min="0" max="100" value={value} step="1" onChange={e => onChange(+e.target.value)} style={{ width:'100%', accentColor:color }}/>
    </div>
  )
}

// ── TRACK CARD ────────────────────────────────────────────────────
function TrackCard({ track, index, libraryIds }) {
  const isAi = track._source === 'ai'
  const isNew = libraryIds && !libraryIds.has(track.id)
  const img = track.album?.images?.[0]?.url
  return (
    <div style={{ display:'grid', gridTemplateColumns:'26px 44px 1fr auto', gap:12, alignItems:'center', padding:'11px 16px', borderBottom:'0.5px solid rgba(0,0,0,0.05)', transition:'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background='#fafaf8'}
      onMouseLeave={e => e.currentTarget.style.background=''}>
      <div style={{ fontSize:11, color:'#ccc', textAlign:'center', fontFamily:'monospace' }}>{index+1}</div>
      <div style={{ width:44, height:44, borderRadius:6, background:'#f0f0ee', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {img ? <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> :
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity:0.2 }}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
          <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track.name}</div>
          {isAi && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:8, background:'#1a1a1a', color:'#fff', whiteSpace:'nowrap', flexShrink:0 }}>AI pick</span>}
          {!isAi && isNew && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:8, background:'#E1F5EE', color:'#085041', whiteSpace:'nowrap', flexShrink:0 }}>new</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ fontSize:11, color:'#999', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{(track.artists||[]).map(a=>a.name).join(', ')}</div>
          {track._reason && <span style={{ fontSize:10, color:'#bbb', flexShrink:0, whiteSpace:'nowrap' }}>· {track._reason}</span>}
        </div>
      </div>
      <div style={{ fontSize:11, color:'#ccc', fontFamily:'monospace', textAlign:'right' }}>{track.duration_ms ? fmtDur(track.duration_ms) : ''}</div>
    </div>
  )
}

function TrackRow({ track, index }) {
  const img = track.album?.images?.[0]?.url
  return (
    <div style={{ display:'grid', gridTemplateColumns:'26px 40px 1fr 44px', gap:12, alignItems:'center', padding:'10px 16px', borderBottom:'0.5px solid rgba(0,0,0,0.05)', transition:'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background='#fafaf8'}
      onMouseLeave={e => e.currentTarget.style.background=''}>
      <div style={{ fontSize:11, color:'#bbb', textAlign:'center', fontFamily:'monospace' }}>{index+1}</div>
      <div style={{ width:40, height:40, borderRadius:4, background:'#f0f0ee', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {img ? <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> :
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity:0.2 }}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track.name}</div>
        <div style={{ fontSize:11, color:'#999', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{(track.artists||[]).map(a=>a.name).join(', ')}</div>
      </div>
      <div style={{ fontSize:11, color:'#bbb', fontFamily:'monospace', textAlign:'right' }}>{track.duration_ms ? fmtDur(track.duration_ms) : ''}</div>
    </div>
  )
}

function TrackList({ tracks }) {
  if (!tracks?.length) return <div style={{ padding:28, textAlign:'center', fontSize:13, color:'#999' }}>No tracks found</div>
  return (
    <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, overflow:'hidden' }}>
      {tracks.map((t,i) => <TrackRow key={t.id+i} track={t} index={i}/>)}
    </div>
  )
}

function EnergyArc({ tracks }) {
  if (!tracks?.length) return null
  const W=560,H=90,pad=20,n=tracks.length
  const pts = tracks.map((_,i) => {
    const t=i/(n-1), e=t<0.6?t/0.6:1-(t-0.6)/0.4
    return [(pad+(i/(n-1))*(W-2*pad)).toFixed(1),(H-pad-(e*(H-2*pad))).toFixed(1)]
  })
  const pathD = 'M'+pts.map(p=>p.join(',')).join(' L')
  const areaD = pathD+` L${pts[n-1][0]},${H-pad} L${pts[0][0]},${H-pad} Z`
  return (
    <div style={{ background:'#f7f7f5', borderRadius:12, padding:'16px 20px', marginBottom:16 }}>
      <div style={{ fontSize:10, fontWeight:500, color:'#aaa', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:12 }}>Energy arc</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        <path d={areaD} fill="#1DB954" fillOpacity="0.07"/>
        <path d={pathD} fill="none" stroke="#1DB954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1={pad} y1={H-pad} x2={W-pad} y2={H-pad} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5"/>
      </svg>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:10 }}>
        {['Warmup','Build','Peak','Comedown'].map((l,i) => (
          <div key={i} style={{ fontSize:11, color:'#999', textAlign:'center' }}>
            <div style={{ fontWeight:500, color:'#666', marginBottom:2 }}>{l}</div>
            {['0–30%','30–60%','60–80%','80–100%'][i]}
          </div>
        ))}
      </div>
    </div>
  )
}

function Loader({ text='Loading...' }) {
  return (
    <div style={{ padding:32, textAlign:'center', color:'#999', fontSize:13 }}>
      <div style={{ width:20, height:20, border:'2px solid #e8e8e8', borderTopColor:'#888', borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto 10px' }}/>
      {text}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── MAIN APP ──────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('connect')
  const [playlists, setPlaylists] = useState([])
  const [likedTracks, setLikedTracks] = useState([])
  const [recentTracks, setRecentTracks] = useState([])
  const [topTracks, setTopTracks] = useState([])
  const [topRange, setTopRange] = useState('short_term')
  const [openPlaylist, setOpenPlaylist] = useState(null)
  const [openPlaylistTracks, setOpenPlaylistTracks] = useState([])
  const [weekendMix, setWeekendMix] = useState([])
  const [loading, setLoading] = useState({})
  const [toast, setToast] = useState('')

  // Gauge state
  const [mood, setMood] = useState('Focus')
  const [bass, setBass] = useState(40)
  const [energy, setEnergy] = useState(45)
  const [bpm, setBpm] = useState(100)
  const [vox, setVox] = useState(1)
  const [darkness, setDarkness] = useState(35)
  const [familiarity, setFamiliarity] = useState(40)

  // AI discovery state
  const [aiTracks, setAiTracks] = useState([])
  const [aiVibe, setAiVibe] = useState('')
  const [aiStatus, setAiStatus] = useState('')
  const [libraryIds, setLibraryIds] = useState(new Set())
  const [libraryReady, setLibraryReady] = useState(false)
  const resultsRef = useRef(null)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2800) }
  const moodColor = MOOD_COLORS[mood] || '#1a1a1a'
  const bpmLo = Math.max(60, bpm-24), bpmHi = Math.min(200, bpm+24)

  const spFetch = useCallback(async url => {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (r.status === 401) {
      if (refreshToken) {
        const res = await fetch('/api/refresh', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ refresh_token: refreshToken }) })
        const d = await res.json()
        if (d.access_token) { setToken(d.access_token); return spFetch(url) }
      }
      setToken(null); setPage('connect'); throw new Error('Unauthorized')
    }
    if (!r.ok) throw new Error(r.status)
    return r.json()
  }, [token, refreshToken])

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    if (hash) {
      const p = new URLSearchParams(hash)
      const at = p.get('access_token'), rt = p.get('refresh_token')
      if (at) { setToken(at); if (rt) setRefreshToken(rt); window.history.replaceState({}, '', '/') }
    }
  }, [])

  useEffect(() => {
    if (!token) return
    spFetch('https://api.spotify.com/v1/me').then(u => {
      setUser(u); setPage('discover')
      loadPlaylists(); loadLiked(); loadRecent(); loadTop('short_term')
    }).catch(() => {})
  }, [token])

  // Build library ID set when tracks load
  useEffect(() => {
    const ids = new Set([...topTracks, ...likedTracks].map(t => t.id))
    setLibraryIds(ids)
    if (topTracks.length > 0 || likedTracks.length > 0) setLibraryReady(true)
  }, [topTracks, likedTracks])

  async function loadPlaylists() {
    setLoading(l => ({...l, playlists:true}))
    try {
      let items=[], url='https://api.spotify.com/v1/me/playlists?limit=50'
      while (url && items.length < 100) { const d = await spFetch(url); items = items.concat(d.items||[]); url = d.next }
      setPlaylists(items)
    } finally { setLoading(l => ({...l, playlists:false})) }
  }

  async function loadLiked() {
    setLoading(l => ({...l, liked:true}))
    try {
      let items=[], url='https://api.spotify.com/v1/me/tracks?limit=50'
      while (url && items.length < 100) { const d = await spFetch(url); items = items.concat((d.items||[]).map(i=>i.track).filter(Boolean)); url = d.next }
      setLikedTracks(items)
    } finally { setLoading(l => ({...l, liked:false})) }
  }

  async function loadRecent() {
    setLoading(l => ({...l, recent:true}))
    try {
      const d = await spFetch('https://api.spotify.com/v1/me/player/recently-played?limit=50')
      setRecentTracks((d.items||[]).map(i=>i.track).filter(Boolean))
    } finally { setLoading(l => ({...l, recent:false})) }
  }

  async function loadTop(range) {
    setLoading(l => ({...l, top:true})); setTopRange(range)
    try {
      const d = await spFetch(`https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${range}`)
      setTopTracks(d.items||[])
    } finally { setLoading(l => ({...l, top:false})) }
  }

  async function loadPlaylistTracks(pl) {
    setOpenPlaylist(pl); setPage('pltracks'); setOpenPlaylistTracks([])
    setLoading(l => ({...l, pltracks:true}))
    try {
      let items=[], url=`https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=50`
      while (url && items.length < 100) { const d = await spFetch(url); items = items.concat((d.items||[]).filter(i=>i.track?.name).map(i=>i.track)); url = d.next }
      setOpenPlaylistTracks(items)
    } finally { setLoading(l => ({...l, pltracks:false})) }
  }

  function buildWeekend() {
    const pool = [...likedTracks, ...topTracks].filter(Boolean)
    if (!pool.length) { showToast('Still loading your library...'); return }
    const seen = new Set()
    setWeekendMix(shuffle(pool.filter(t => { if (!t||seen.has(t.id)) return false; seen.add(t.id); return true })).slice(0, 24))
    setPage('weekend')
  }

  async function discover() {
    if (!token || aiStatus) return
    setAiTracks([]); setAiVibe('')
    setAiStatus('Claude is reading your taste...')
    await new Promise(r => setTimeout(r, 40))
    try {
      setAiStatus('Finding your sound...')
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood, bass, energy, bpm, vox, darkness, familiarity,
          topTracks: topTracks.slice(0, 30),
          likedTracks: likedTracks.slice(0, 30),
          token,
        })
      })
      const data = await res.json()
      setAiTracks(data.tracks || [])
      setAiVibe(data.vibe || '')
      setAiStatus('')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 100)
    } catch {
      setAiStatus('')
      showToast('Something went wrong — try again')
    }
  }

  function applyMood(m) {
    setMood(m)
    const p = MOOD_PRESETS[m]
    setBass(p.bass); setEnergy(p.energy); setBpm(p.bpm)
    setDarkness(p.darkness); setFamiliarity(p.familiarity)
  }

  async function savePlaylist(type, tracks, name) {
    if (!user || !tracks?.length) { showToast('Nothing to save'); return }
    try {
      const pl = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, public: false, description: aiVibe || `wave. ${mood} mix` })
      }).then(r => r.json())
      await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: tracks.filter(t=>t?.uri).map(t=>t.uri) })
      })
      showToast('Saved to Spotify!')
      loadPlaylists()
    } catch { showToast('Save failed — try again') }
  }

  const ni = { width:15, height:15, flexShrink:0, opacity:0.5 }

  function NavItem({ id, label, icon, onClick }) {
    const active = page === id
    return (
      <div onClick={onClick || (() => setPage(id))}
        style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:8, cursor:'pointer', fontSize:13, color:active?'#1a1a1a':'#777', fontWeight:active?500:400, background:active?'#f5f5f3':'', marginBottom:1, whiteSpace:'nowrap', transition:'all 0.12s' }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background='#f9f9f7' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background='' }}>
        {icon}
        <span style={{ flex:1 }}>{label}</span>
        {id==='playlists' && playlists.length > 0 && <span style={{ fontSize:10, background:'#f0f0ee', color:'#aaa', padding:'1px 6px', borderRadius:8 }}>{playlists.length}</span>}
        {id==='liked' && likedTracks.length > 0 && <span style={{ fontSize:10, background:'#f0f0ee', color:'#aaa', padding:'1px 6px', borderRadius:8 }}>{likedTracks.length}</span>}
      </div>
    )
  }

  // ── MOOD + GAUGE PANEL (shared between discover + daily) ─────────
  function MoodPanel() {
    return (
      <>
        {/* MOOD SELECTOR */}
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'16px 18px', marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:500, color:'#bbb', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:12 }}>How are you feeling?</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
            {Object.keys(MOOD_PRESETS).map(m => (
              <button key={m} onClick={() => applyMood(m)}
                style={{ border:`1.5px solid ${mood===m ? MOOD_COLORS[m] : 'rgba(0,0,0,0.08)'}`, background: mood===m ? MOOD_BG[m] : '#fff', borderRadius:10, padding:'10px 6px', cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', textAlign:'center' }}>
                <div style={{ fontSize:12, fontWeight:500, color: mood===m ? MOOD_COLORS[m] : '#555', marginBottom:2 }}>{m}</div>
                <div style={{ fontSize:10, color: mood===m ? MOOD_COLORS[m] : '#bbb', opacity: mood===m ? 0.8 : 1 }}>{MOOD_DESC[m]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CORE GAUGES — bass + energy */}
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:500, color:'#bbb', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:10 }}>Sound shape</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <Gauge label="Bass" value={bass} onChange={setBass} color={moodColor}/>
            <Gauge label="Energy" value={energy} onChange={setEnergy} color="#1DB954"/>
          </div>

          {/* SECONDARY GAUGES — darkness + familiarity */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <Gauge label="Darkness" value={darkness} onChange={setDarkness} color="#534AB7" sublabels={DARK_LABELS}/>
            <Gauge label="Familiarity" value={familiarity} onChange={setFamiliarity} color="#BA7517" sublabels={FAM_LABELS}/>
          </div>

          {/* SLIDERS — BPM + vocals */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <SlimSlider label="BPM range" value={Math.round((bpm-60)/120*100)} onChange={v => setBpm(Math.round(60 + v/100*120))} displayValue={`${bpmLo}–${bpmHi}`} color={moodColor}/>
            <SlimSlider label="Vocals" value={Math.round(vox/2*100)} onChange={v => setVox(Math.round(v/100*2))} displayValue={VOX_LABELS[vox]} color={moodColor}/>
          </div>
        </div>

        {/* LIVE PROFILE TAGS */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:18 }}>
          {[
            mood,
            BASS_LABELS[Math.min(Math.round(bass/20),5)],
            `${bpmLo}–${bpmHi} bpm`,
            ENERGY_LABELS[Math.min(Math.round(energy/20),5)],
            DARK_LABELS[Math.min(Math.round(darkness/20),5)],
            FAM_LABELS[Math.min(Math.round(familiarity/20),5)],
            VOX_LABELS[vox],
          ].map(t => (
            <span key={t} style={{ fontSize:11, padding:'4px 10px', borderRadius:20, border:'0.5px solid rgba(0,0,0,0.1)', background:'#fff', color:'#777' }}>{t}</span>
          ))}
        </div>
      </>
    )
  }

  // ── CONNECT ───────────────────────────────────────────────────────
  if (page === 'connect') {
    return (
      <div style={{ fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', minHeight:'100vh', background:'#f5f5f3', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'0 24px' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#1DB954', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:22 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        </div>
        <div style={{ fontSize:28, fontWeight:500, letterSpacing:-0.8, marginBottom:10 }}>wave.</div>
        <div style={{ fontSize:15, color:'#888', lineHeight:1.7, marginBottom:8, maxWidth:320 }}>Music that matches how you feel today.</div>
        <div style={{ fontSize:13, color:'#bbb', marginBottom:32, maxWidth:300 }}>Connect Spotify, sculpt your sound with gauges, and AI finds the perfect tracks.</div>
        <a href="/api/auth/login" style={{ display:'inline-flex', alignItems:'center', gap:10, background:'#1DB954', color:'#fff', borderRadius:30, padding:'13px 32px', fontSize:14, fontWeight:500, textDecoration:'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
          Log in with Spotify
        </a>
      </div>
    )
  }

  // ── MAIN LAYOUT ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background:'#f5f5f3', minHeight:'100vh' }}>

      {/* TOPBAR */}
      <div style={{ background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,0.08)', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ fontSize:16, fontWeight:500, letterSpacing:-0.5 }}>wave<span style={{ color:'#1DB954' }}>.</span></div>
        {user && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {user.images?.[0]?.url && <img src={user.images[0].url} alt="" style={{ width:26, height:26, borderRadius:'50%', objectFit:'cover' }}/>}
            <div style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 12px', borderRadius:20, border:'0.5px solid rgba(0,0,0,0.1)', background:'#f5f5f3', fontSize:12, color:'#666' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#1DB954' }}/>
              <span>{user.display_name || user.id}</span>
              <span style={{ color:'#ddd', margin:'0 2px' }}>·</span>
              <span style={{ cursor:'pointer', color:'#bbb' }} onClick={() => { setToken(null); setUser(null); setPage('connect') }}>log out</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', minHeight:'calc(100vh - 49px)' }}>

        {/* SIDEBAR */}
        <div style={{ background:'#fff', borderRight:'0.5px solid rgba(0,0,0,0.07)', padding:'20px 12px', position:'sticky', top:49, height:'calc(100vh - 49px)', overflowY:'auto' }}>
          <div style={{ fontSize:10, fontWeight:500, color:'#bbb', letterSpacing:'0.8px', textTransform:'uppercase', padding:'0 8px', marginBottom:8 }}>Discover</div>
          <NavItem id="discover" label="Find my music" icon={<svg style={ni} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>}/>
          <div style={{ fontSize:10, fontWeight:500, color:'#bbb', letterSpacing:'0.8px', textTransform:'uppercase', padding:'0 8px', marginBottom:8, marginTop:18 }}>Library</div>
          <NavItem id="playlists" label="Playlists" icon={<svg style={ni} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}/>
          <NavItem id="liked" label="Liked songs" icon={<svg style={ni} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}/>
          <NavItem id="recent" label="Recently played" icon={<svg style={ni} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}/>
          <NavItem id="top" label="Top tracks" icon={<svg style={ni} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>}/>
          <div style={{ fontSize:10, fontWeight:500, color:'#bbb', letterSpacing:'0.8px', textTransform:'uppercase', padding:'0 8px', marginBottom:8, marginTop:18 }}>Mixes</div>
          <NavItem id="weekend" label="Weekend set" onClick={() => { if (page !== 'weekend') buildWeekend() }} icon={<svg style={ni} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}/>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ padding:'28px 32px', maxWidth:900 }}>

          {/* ── DISCOVER ── */}
          {page === 'discover' && (
            <div>
              <div style={{ fontSize:22, fontWeight:500, letterSpacing:-0.4, marginBottom:4 }}>Find my music</div>
              <div style={{ fontSize:12, color:'#999', marginBottom:24 }}>Sculpt your sound. AI finds the tracks.</div>

              <MoodPanel/>

              {/* GENERATE BUTTON */}
              <button onClick={discover} disabled={!!aiStatus || !libraryReady}
                style={{ width:'100%', padding:'15px', borderRadius:12, fontSize:14, fontWeight:500, fontFamily:'inherit', cursor: aiStatus?'wait':'pointer', border:'none', background: aiStatus||!libraryReady ? '#e0e0e0' : '#1a1a1a', color: aiStatus||!libraryReady ? '#999' : '#fff', marginBottom:8, transition:'all 0.2s', letterSpacing:-0.2 }}>
                {aiStatus ? (
                  <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                    <span style={{ width:14, height:14, border:'2px solid #ccc', borderTopColor:'#888', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }}/>
                    {aiStatus}
                  </span>
                ) : !libraryReady ? 'Loading your library...' : aiTracks.length > 0 ? 'Regenerate' : 'Find my music ✦'}
              </button>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

              {/* RESULTS */}
              {aiTracks.length > 0 && (
                <div ref={resultsRef} style={{ marginTop:28 }}>

                  {/* VIBE CARD */}
                  {aiVibe && (
                    <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'flex-start', gap:12 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background: MOOD_BG[mood], display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={moodColor} strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><circle cx="18" cy="5" r="3" fill={moodColor} stroke="none"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:10, color:'#bbb', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>AI vibe read</div>
                        <div style={{ fontSize:14, color:'#444', lineHeight:1.5, fontStyle:'italic' }}>"{aiVibe}"</div>
                      </div>
                    </div>
                  )}

                  {/* STATS */}
                  <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
                    <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:8, padding:'7px 12px', fontSize:12 }}>
                      <span style={{ color:'#bbb' }}>Total · </span><span style={{ fontWeight:500 }}>{aiTracks.length} songs</span>
                    </div>
                    <div style={{ background:'#1a1a1a', borderRadius:8, padding:'7px 12px', fontSize:12 }}>
                      <span style={{ color:'#777' }}>AI picks · </span><span style={{ fontWeight:500, color:'#fff' }}>{aiTracks.filter(t=>t._source==='ai').length}</span>
                    </div>
                    <div style={{ background:'#E1F5EE', borderRadius:8, padding:'7px 12px', fontSize:12 }}>
                      <span style={{ color:'#5DCAA5' }}>New · </span><span style={{ fontWeight:500, color:'#085041' }}>{aiTracks.filter(t=>!libraryIds.has(t.id)).length}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#bbb', marginLeft:'auto' }}>
                      <span style={{ fontSize:9, padding:'2px 6px', borderRadius:8, background:'#1a1a1a', color:'#fff', marginRight:4 }}>AI pick</span>Claude suggested
                      <span style={{ fontSize:9, padding:'2px 6px', borderRadius:8, background:'#E1F5EE', color:'#085041', margin:'0 4px' }}>new</span>Not in library
                    </div>
                  </div>

                  {/* TRACK LIST */}
                  <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, overflow:'hidden', marginBottom:14 }}>
                    {aiTracks.map((t,i) => <TrackCard key={t.id+i} track={t} index={i} libraryIds={libraryIds}/>)}
                  </div>

                  {/* ACTIONS */}
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => savePlaylist('ai', aiTracks, `wave. ${mood} · ${new Date().toLocaleDateString()}`)}
                      style={{ flex:1, padding:'12px', borderRadius:10, fontSize:13, fontWeight:500, fontFamily:'inherit', cursor:'pointer', border:'none', background:'#1DB954', color:'#fff' }}>
                      Save to Spotify
                    </button>
                    <button onClick={discover} disabled={!!aiStatus}
                      style={{ padding:'12px 20px', borderRadius:10, fontSize:13, fontFamily:'inherit', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.12)', background:'#fff', color:'#666' }}>
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PLAYLISTS ── */}
          {page === 'playlists' && (
            <div>
              <div style={{ fontSize:22, fontWeight:500, letterSpacing:-0.4, marginBottom:4 }}>Your playlists</div>
              <div style={{ fontSize:12, color:'#999', marginBottom:20 }}>{playlists.length} playlists</div>
              {loading.playlists ? <Loader/> : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12 }}>
                  {playlists.map(p => (
                    <div key={p.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, overflow:'hidden', cursor:'pointer', transition:'border-color 0.12s' }}
                      onClick={() => loadPlaylistTracks(p)}
                      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(0,0,0,0.18)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='rgba(0,0,0,0.08)'}>
                      <div style={{ width:'100%', aspectRatio:1, background:'#f0f0ee', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> :
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity:0.2 }}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
                      </div>
                      <div style={{ padding:'9px 10px 12px' }}>
                        <div style={{ fontSize:12, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{p.tracks?.total||0} tracks</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PLAYLIST TRACKS ── */}
          {page === 'pltracks' && openPlaylist && (
            <div>
              <div style={{ fontSize:12, color:'#aaa', cursor:'pointer', marginBottom:16 }} onClick={() => setPage('playlists')}>← playlists</div>
              <div style={{ fontSize:22, fontWeight:500, letterSpacing:-0.4, marginBottom:4 }}>{openPlaylist.name}</div>
              <div style={{ fontSize:12, color:'#999', marginBottom:20 }}>{openPlaylist.tracks?.total||0} tracks</div>
              {loading.pltracks ? <Loader/> : <TrackList tracks={openPlaylistTracks}/>}
            </div>
          )}

          {/* ── LIKED ── */}
          {page === 'liked' && (
            <div>
              <div style={{ fontSize:22, fontWeight:500, letterSpacing:-0.4, marginBottom:4 }}>Liked songs</div>
              <div style={{ fontSize:12, color:'#999', marginBottom:20 }}>{likedTracks.length} songs</div>
              {loading.liked ? <Loader/> : <TrackList tracks={likedTracks}/>}
              <div style={{ display:'flex', gap:8, marginTop:16 }}>
                <button onClick={() => savePlaylist('liked', likedTracks.slice(0,50), 'wave. Liked Export')}
                  style={{ padding:'8px 16px', borderRadius:8, fontSize:12, fontFamily:'inherit', cursor:'pointer', border:'none', background:'#1DB954', color:'#fff', fontWeight:500 }}>
                  Save as playlist
                </button>
              </div>
            </div>
          )}

          {/* ── RECENT ── */}
          {page === 'recent' && (
            <div>
              <div style={{ fontSize:22, fontWeight:500, letterSpacing:-0.4, marginBottom:4 }}>Recently played</div>
              <div style={{ fontSize:12, color:'#999', marginBottom:20 }}>Last 50 tracks</div>
              {loading.recent ? <Loader/> : <TrackList tracks={recentTracks}/>}
            </div>
          )}

          {/* ── TOP TRACKS ── */}
          {page === 'top' && (
            <div>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
                <div>
                  <div style={{ fontSize:22, fontWeight:500, letterSpacing:-0.4, marginBottom:4 }}>Top tracks</div>
                  <div style={{ fontSize:12, color:'#999', marginBottom:20 }}>{{ short_term:'Last 4 weeks', medium_term:'Last 6 months', long_term:'All time' }[topRange]}</div>
                </div>
                <div style={{ display:'flex', gap:6, paddingTop:4 }}>
                  {[['short_term','4 weeks'],['medium_term','6 months'],['long_term','All time']].map(([r,l]) => (
                    <button key={r} style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontFamily:'inherit', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.12)', background: topRange===r?'#1a1a1a':'#fff', color: topRange===r?'#fff':'#666', fontWeight: topRange===r?500:400 }} onClick={() => loadTop(r)}>{l}</button>
                  ))}
                </div>
              </div>
              {loading.top ? <Loader/> : <TrackList tracks={topTracks}/>}
            </div>
          )}

          {/* ── WEEKEND SET ── */}
          {page === 'weekend' && (
            <div>
              <div style={{ fontSize:22, fontWeight:500, letterSpacing:-0.4, marginBottom:4 }}>Weekend set</div>
              <div style={{ fontSize:12, color:'#999', marginBottom:20 }}>24-track mix · shaped for a full session</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                {[['Tracks',weekendMix.length||'—'],['Duration',weekendMix.length?fmtMs(weekendMix.reduce((s,t)=>s+(t.duration_ms||210000),0)):'—'],['Energy arc','Rise']].map(([l,v]) => (
                  <div key={l} style={{ background:'#f7f7f5', borderRadius:8, padding:'11px 13px' }}>
                    <div style={{ fontSize:11, color:'#aaa', marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:20, fontWeight:500 }}>{v}</div>
                  </div>
                ))}
              </div>
              <EnergyArc tracks={weekendMix}/>
              <TrackList tracks={weekendMix}/>
              <div style={{ display:'flex', gap:8, marginTop:14 }}>
                <button onClick={() => savePlaylist('weekend', weekendMix, `wave. Weekend Set · ${new Date().toLocaleDateString()}`)}
                  style={{ padding:'9px 18px', borderRadius:8, fontSize:12, fontFamily:'inherit', cursor:'pointer', border:'none', background:'#1DB954', color:'#fff', fontWeight:500 }}>
                  Save to Spotify
                </button>
                <button onClick={buildWeekend}
                  style={{ padding:'8px 14px', borderRadius:8, fontSize:12, fontFamily:'inherit', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.12)', background:'#fff', color:'#666' }}>
                  Rebuild set
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:22, left:'50%', transform:'translateX(-50%)', background:'#1a1a1a', color:'#fff', padding:'9px 20px', borderRadius:22, fontSize:13, zIndex:100, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
