export async function POST(request) {
  const { refresh_token } = await request.json()
  if (!refresh_token) return Response.json({ error: 'No refresh token' }, { status: 400 })
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token }).toString(),
  })
  return Response.json(await res.json())
}
