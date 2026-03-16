import { NextResponse } from 'next/server'

export async function POST(request) {
  const { mood, bass, energy, bpm, vox, darkness, familiarity, topTracks, likedTracks, token } = await request.json()

  const bpmLo = Math.max(60, bpm - 24)
  const bpmHi = Math.min(200, bpm + 24)

  // Build taste profile
  const allTracks = [...(topTracks || []), ...(likedTracks || [])]
  const seen = new Set()
  const uniqueTracks = allTracks
    .filter(t => { if (!t?.id || seen.has(t.id)) return false; seen.add(t.id); return true })
    .slice(0, 30)

  // Human-readable gauge descriptions for Claude
  const bassLabel = bass < 20 ? 'no bass at all' : bass < 40 ? 'light gentle bass' : bass < 60 ? 'balanced moderate bass' : bass < 75 ? 'punchy prominent bass' : bass < 90 ? 'heavy deep bass' : 'full sub-bass, maximum low end'
  const energyLabel = energy < 20 ? 'meditative, nearly still' : energy < 35 ? 'very low energy, quiet and slow' : energy < 50 ? 'low-medium energy, relaxed' : energy < 65 ? 'medium energy, steady' : energy < 80 ? 'high energy, driving' : 'peak intensity, full power'
  const voxLabel = vox === 0 ? 'strictly instrumental, absolutely no vocals' : vox === 1 ? 'minimal or distant vocals ok, not front and center' : 'full vocals, singer is the focus'
  const darknessLabel = darkness < 30 ? 'bright, euphoric, uplifting, major key feeling' : darkness < 55 ? 'neutral emotional tone, neither dark nor bright' : darkness < 75 ? 'somewhat dark, moody, introspective' : 'very dark, brooding, minor key, melancholic'
  const familiarityLabel = familiarity < 25 ? 'only artists the user already knows well from their library' : familiarity < 50 ? 'mostly familiar artists with a few new ones' : familiarity < 75 ? 'mix of familiar and new discoveries' : 'push into new territory, unfamiliar artists encouraged'

  const tasteProfile = uniqueTracks
    .map(t => `"${t.name}" by ${(t.artists || []).map(a => a.name).join(', ')}`)
    .join('\n')

  // Known artists for familiarity filtering
  const knownArtists = [...new Set(
    uniqueTracks.flatMap(t => (t.artists || []).map(a => a.name))
  )].slice(0, 20)

  let claudeSuggestions = []
  let seedTrackIds = uniqueTracks.slice(0, 5).map(t => t.id)
  let vibe = ''

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `You are wave., an AI music curator. Your job is to find the perfect songs for this person right now.

USER'S MUSIC TASTE (their top & liked tracks):
${tasteProfile}

THEIR KNOWN ARTISTS: ${knownArtists.join(', ')}

TODAY'S SOUND SETTINGS:
- Mood: ${mood}
- Bass: ${bassLabel} (${bass}/100)
- Energy: ${energyLabel} (${energy}/100)  
- BPM range: ${bpmLo}–${bpmHi} BPM
- Vocals: ${voxLabel}
- Darkness/tone: ${darknessLabel} (${darkness}/100)
- Familiarity: ${familiarityLabel} (${familiarity}/100)

YOUR TASKS:

1. Write a vibe sentence (max 12 words) that captures this exact sound setting. Be poetic and specific. Examples: "Late night drive with heavy sub-bass and zero distractions" or "Euphoric peak-hour energy, crowd-ready and relentless"

2. Suggest exactly 10 real songs that exist on Spotify matching all the settings above. Consider familiarity setting carefully — ${familiarity < 40 ? 'stick to artists similar to what they already listen to' : familiarity > 65 ? 'introduce genuinely new artists they probably haven\'t heard' : 'balance known and new artists'}. For each song write a reason tag of max 5 words that describes WHY it fits (the sound, not the mood name).

3. From the user's library tracks above, select the 5 track IDs that best match these exact settings as recommendation seeds.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
VIBE: [your vibe sentence]
SONG: "[track name]" by [artist] | REASON: [max 5 words]
SONG: "[track name]" by [artist] | REASON: [max 5 words]
SONG: "[track name]" by [artist] | REASON: [max 5 words]
SONG: "[track name]" by [artist] | REASON: [max 5 words]
SONG: "[track name]" by [artist] | REASON: [max 5 words]
SONG: "[track name]" by [artist] | REASON: [max 5 words]
SONG: "[track name]" by [artist] | REASON: [max 5 words]
SONG: "[track name]" by [artist] | REASON: [max 5 words]
SONG: "[track name]" by [artist] | REASON: [max 5 words]
SONG: "[track name]" by [artist] | REASON: [max 5 words]
SEEDS: [5 track IDs from user library, comma separated]`
        }]
      })
    })

    if (claudeRes.ok) {
      const d = await claudeRes.json()
      const text = d.content?.[0]?.text || ''

      const vibeMatch = text.match(/VIBE:\s*(.+)/i)
      if (vibeMatch) vibe = vibeMatch[1].trim()

      const songLines = [...text.matchAll(/SONG:\s*"(.+?)"\s+by\s+(.+?)\s*\|\s*REASON:\s*(.+)/gi)]
      claudeSuggestions = songLines.map(m => ({
        track: m[1].trim(),
        artist: m[2].trim(),
        reason: m[3].trim(),
      })).filter(Boolean)

      const seedsMatch = text.match(/SEEDS:\s*([^\n]+)/i)
      if (seedsMatch) {
        const ids = seedsMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 10)
        if (ids.length >= 3) seedTrackIds = ids.slice(0, 5)
      }
    }
  } catch {
    vibe = `${mood} · ${bassLabel} · ${energyLabel}`
  }

  // Search Spotify for Claude's suggested songs
  const aiTracks = []
  for (const s of claudeSuggestions.slice(0, 10)) {
    try {
      const q = encodeURIComponent(`track:${s.track} artist:${s.artist}`)
      const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      const track = data.tracks?.items?.[0]
      if (track) aiTracks.push({ ...track, _source: 'ai', _reason: s.reason })
    } catch { /* skip */ }
  }

  // Spotify recommendations using best seeds + audio feature targets
  let spotifyTracks = []
  try {
    // Map darkness to valence (inverse — dark = low valence)
    const targetValence = Math.max(0.05, Math.min(0.95, 1 - (darkness / 100))).toFixed(2)
    const targetEnergy = Math.max(0.05, Math.min(0.95, energy / 100)).toFixed(2)
    // Familiarity influences how we pick seeds — already handled by Claude above

    const moodDance = { Focus: 0.4, Chill: 0.5, Energize: 0.8, Melancholy: 0.3, Hype: 0.9 }
    const moodAcoustic = { Focus: 0.2, Chill: 0.4, Energize: 0.1, Melancholy: 0.55, Hype: 0.05 }

    const params = new URLSearchParams({
      limit: '20',
      seed_tracks: seedTrackIds.slice(0, 5).join(','),
      target_energy: targetEnergy,
      target_valence: targetValence,
      target_danceability: String(moodDance[mood] || 0.5),
      target_acousticness: String(moodAcoustic[mood] || 0.2),
      target_instrumentalness: vox === 0 ? '0.8' : vox === 1 ? '0.3' : '0.05',
      target_tempo: String(Math.round((bpmLo + bpmHi) / 2)),
      min_tempo: String(bpmLo),
      max_tempo: String(bpmHi),
    })

    const res = await fetch(`https://api.spotify.com/v1/recommendations?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()

    // Apply familiarity filter to Spotify recs
    const knownArtistSet = new Set(knownArtists.map(a => a.toLowerCase()))
    spotifyTracks = (data.tracks || []).map(t => {
      const artistNames = (t.artists || []).map(a => a.name.toLowerCase())
      const isKnown = artistNames.some(a => knownArtistSet.has(a))

      // For low familiarity: prefer known artists
      // For high familiarity (adventurous): prefer new artists
      if (familiarity < 35 && !isKnown) return null
      if (familiarity > 70 && isKnown) return null

      return { ...t, _source: 'spotify', _reason: null }
    }).filter(Boolean)

    // If filter was too aggressive, fall back to all recs
    if (spotifyTracks.length < 5) {
      spotifyTracks = (data.tracks || []).map(t => ({ ...t, _source: 'spotify', _reason: null }))
    }
  } catch { /* use AI picks only */ }

  // Merge — deduplicate, AI picks first
  const aiIds = new Set(aiTracks.map(t => t.id))
  const merged = [
    ...aiTracks,
    ...spotifyTracks.filter(t => !aiIds.has(t.id))
  ].filter(Boolean).slice(0, 30)

  return NextResponse.json({
    tracks: merged,
    vibe,
    aiPickCount: aiTracks.length,
  })
}
