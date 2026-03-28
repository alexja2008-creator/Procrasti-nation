import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/authMiddleware';

const WHEREBY_TIMEOUT_MS = 15_000;

export async function POST(request) {
  const { error: authError } = await requireAuth(request);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let endTime;
  try {
    ({ endTime } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const endDate = new Date(endTime);
  if (!endTime || isNaN(endDate) || endDate <= new Date()) {
    return NextResponse.json({ error: 'endTime must be a valid future date' }, { status: 400 });
  }

  const apiKey = process.env.WHEREBY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Whereby API key not configured' }, { status: 500 });
  }

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), WHEREBY_TIMEOUT_MS);
    const response = await fetch('https://api.whereby.dev/v1/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endDate: endDate.toISOString(),
        fields: ['hostRoomUrl'],
      }),
      signal: ac.signal,
    });
    clearTimeout(timer);

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
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
