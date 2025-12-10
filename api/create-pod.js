export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const DAILY_API_KEY = process.env.DAILY_API_KEY;

  if (!DAILY_API_KEY) {
    return res.status(500).json({ error: 'Daily.co API key not configured' });
  }

  try {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          enable_chat: false,
          enable_screenshare: false,
          start_video_off: true,
          start_audio_off: false,
          enable_prejoin_ui: false,
          exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60)
        }
      })
    });

    const room = await response.json();

    if (room.error) {
      return res.status(400).json({ error: room.error });
    }

    return res.status(200).json({ roomUrl: room.url });
  } catch (error) {
    console.error('Error creating Daily.co room:', error);
    return res.status(500).json({ error: 'Failed to create room' });
  }
}
