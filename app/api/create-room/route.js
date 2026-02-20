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
      let errMsg = `Whereby error: ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData.error?.message || errData.message || errMsg;
      } catch {
        errMsg = await response.text() || errMsg;
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    const roomUrl = data.roomUrl;
    if (!roomUrl) throw new Error('Whereby did not return a room URL');
    return NextResponse.json({ roomUrl, hostRoomUrl: data.hostRoomUrl || roomUrl });
  } catch (err) {
    console.error('Error creating Whereby room:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
