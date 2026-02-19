import { NextResponse } from 'next/server';

export async function POST(request) {
  const { podName, endTime } = await request.json();

  const apiKey = process.env.WHEREBY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Whereby API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch('https://api.whereby.dev/v1/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endDate: new Date(endTime).toISOString(),
        fields: ['hostRoomUrl'],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Whereby error: ${err}`);
    }

    const data = await response.json();
    return NextResponse.json({ roomUrl: data.roomUrl, hostRoomUrl: data.hostRoomUrl });
  } catch (err) {
    console.error('Error creating Whereby room:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
