import { NextResponse } from 'next/server'

export async function POST(request) {
  const { mood, bass, energy, bpm, vox, darkness, familiarity, topTracks, likedTracks, extraTracks, token } = await request.json()

  const bpmLo = Math.max(60, bpm - 24)
  const bpmHi = Math.min(200, bpm + 24)

  const allTracks = [...(topTracks||[]), ...(likedTracks||[]), ...(extraTracks||[])]
  const seen = new Set()
  const uniqueTracks = allTracks.filter(t => { if (!t?.id||seen.has(t.id)) return false; seen.add(t.id); return true }).slice(0, 50)

  const bassLabel = bass < 20 ? 'no bass' : bass < 40 ? 'light bass' : bass < 60 ? 'balanced bass' : bass < 75 ? 'punchy bass' : bass < 90 ? 'heavy bass' : 'full sub-bass'
  const energyLabel = energy < 20 ? 'meditative' : energy < 35 ? 'very low energy' : energy < 50 ? 'relaxed' : energy < 65 ? 'medium energy' : energy < 80 ? 'high energy' : 'peak intensity'
  const voxLabel = vox===0 ? 'no vocals' : vox===1 ? 'minimal vocals' : 'full vocals'
  const darknessLabel = darkness < 30 ? 'bright and euphoric' : darkness < 55 ? 'neutral tone' : darkness < 75 ? 'dark and moody' : 'very dark and brooding'
  const familiarityLabel = familiarity < 25 ? 'only known artists' : familiarity < 50 ? 'mostly familiar' : familiarity < 75 ? 'mix of familiar and new' : 'mostly new discoveries'

  const tasteProfile = uniqueTracks.map(t => `"${t.name}" by ${(t.artists||[]).map(a=>a.name).join(', ')}`).join('\n')
  const knownArtists = [...new Set(uniqueTracks.flatMap(t=>(t.artists||[]).map(a=>a.name)))].slice(0,25)

  let claudeSuggestions=[], seedTrackIds=uniqueTracks.slice(0,5).map(t=>t.id), vibe=''

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: `You are wave., an AI music curator.

USER TASTE:
${tasteProfile}

KNOWN ARTISTS: ${knownArtists.join(', ')}

SETTINGS: Mood=${mood}, Bass=${bassLabel}(${bass}/100), Energy=${energyLabel}(${energy}/100), BPM=${bpmLo}-${bpmHi}, Vocals=${voxLabel}, Tone=${darknessLabel}(${darkness}/100), Familiarity=${familiarityLabel}(${familiarity}/100)

TASKS:
1. Vibe sentence (max 12 words, poetic)
2. 10 real Spotify songs matching ALL settings. ${familiarity<40?'Stay close to known artists.':familiarity>65?'Introduce new artists.':'Balance known and new.'} Each gets a sound reason tag (max 5 words).
3. Pick 5 track IDs from user library as seeds.

FORMAT:
VIBE: [sentence]
SONG: "[name]" by [artist] | REASON: [max 5 words]
SONG: "[name]" by [artist] | REASON: [max 5 words]
SONG: "[name]" by [artist] | REASON: [max 5 words]
SONG: "[name]" by [artist] | REASON: [max 5 words]
SONG: "[name]" by [artist] | REASON: [max 5 words]
SONG: "[name]" by [artist] | REASON: [max 5 words]
SONG: "[name]" by [artist] | REASON: [max 5 words]
SONG: "[name]" by [artist] | REASON: [max 5 words]
SONG: "[name]" by [artist] | REASON: [max 5 words]
SONG: "[name]" by [artist] | REASON: [max 5 words]
SEEDS: [5 IDs comma separated]` }]
      })
    })
    if (claudeRes.ok) {
      const d = await claudeRes.json()
      const text = d.content?.[0]?.text||''
      const vm = text.match(/VIBE:\s*(.+)/i); if(vm) vibe=vm[1].trim()
      claudeSuggestions = [...text.matchAll(/SONG:\s*"(.+?)"\s+by\s+(.+?)\s*\|\s*REASON:\s*(.+)/gi)].map(m=>({track:m[1].trim(),artist:m[2].trim(),reason:m[3].trim()})).filter(Boolean)
      const sm = text.match(/SEEDS:\s*([^\n]+)/i)
      if(sm){const ids=sm[1].split(',').map(s=>s.trim()).filter(s=>s.length>10);if(ids.length>=3)seedTrackIds=ids.slice(0,5)}
    }
  } catch { vibe=`${mood} · ${bassLabel} · ${energyLabel}` }

  const aiTracks=[]
  for(const s of claudeSuggestions.slice(0,10)){
    try{
      const q=encodeURIComponent(`track:${s.track} artist:${s.artist}`)
      const res=await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,{headers:{Authorization:`Bearer ${token}`}})
      const data=await res.json()
      const track=data.tracks?.items?.[0]
      if(track) aiTracks.push({...track,_source:'ai',_reason:s.reason})
    }catch{}
  }

  let spotifyTracks=[]
  try{
    const knownSet=new Set(knownArtists.map(a=>a.toLowerCase()))
    const moodDance={Focus:0.4,Chill:0.5,Energize:0.8,Melancholy:0.3,Hype:0.9}
    const moodAcoustic={Focus:0.2,Chill:0.4,Energize:0.1,Melancholy:0.55,Hype:0.05}
    const params=new URLSearchParams({
      limit:'20',seed_tracks:seedTrackIds.slice(0,5).join(','),
      target_energy:Math.max(0.05,Math.min(0.95,energy/100)).toFixed(2),
      target_valence:Math.max(0.05,Math.min(0.95,1-darkness/100)).toFixed(2),
      target_danceability:String(moodDance[mood]||0.5),
      target_acousticness:String(moodAcoustic[mood]||0.2),
      target_instrumentalness:vox===0?'0.8':vox===1?'0.3':'0.05',
      target_tempo:String(Math.round((bpmLo+bpmHi)/2)),
      min_tempo:String(bpmLo),max_tempo:String(bpmHi),
    })
    const res=await fetch(`https://api.spotify.com/v1/recommendations?${params}`,{headers:{Authorization:`Bearer ${token}`}})
    const data=await res.json()
    let recs=(data.tracks||[]).map(t=>{
      const isKnown=(t.artists||[]).map(a=>a.name.toLowerCase()).some(a=>knownSet.has(a))
      if(familiarity<35&&!isKnown)return null
      if(familiarity>70&&isKnown)return null
      return{...t,_source:'spotify',_reason:null}
    }).filter(Boolean)
    if(recs.length<5)recs=(data.tracks||[]).map(t=>({...t,_source:'spotify',_reason:null}))
    spotifyTracks=recs
  }catch{}

  const aiIds=new Set(aiTracks.map(t=>t.id))
  const merged=[...aiTracks,...spotifyTracks.filter(t=>!aiIds.has(t.id))].filter(Boolean).slice(0,30)
  return NextResponse.json({tracks:merged,vibe,aiPickCount:aiTracks.length})
}
