import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/authMiddleware';

// Must use Node.js runtime — pdf-parse and mammoth are Node-only libraries
export const runtime = 'nodejs';

const ANTHROPIC_TIMEOUT_MS = 60_000;

export async function POST(request) {
  try {
    const { error: authError } = await requireAuth(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Enforce 10MB size limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File is too large. Please upload a file under 10MB.' },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const mimeType = file.type;

    // Read the file into a Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let claudeMessages;

    if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
      const { extractText } = await import('unpdf');
      const pdfData = await extractText(new Uint8Array(arrayBuffer), { mergePages: true });
      const text = pdfData.text;
      if (!text || text.trim().length < 20) {
        return NextResponse.json(
          { error: 'Could not extract text from this PDF. It may be a scanned image — try uploading it as a JPG or PNG instead.' },
          { status: 400 }
        );
      }
      claudeMessages = [{ role: 'user', content: buildTextPrompt(text) }];

    } else if (
      fileName.endsWith('.docx') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.doc') ||
      mimeType === 'application/msword'
    ) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      if (!text || text.trim().length < 20) {
        return NextResponse.json(
          { error: 'Could not extract text from this document. Please try a different format.' },
          { status: 400 }
        );
      }
      claudeMessages = [{ role: 'user', content: buildTextPrompt(text) }];

    } else if (
      fileName.endsWith('.png') || mimeType === 'image/png' ||
      fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || mimeType === 'image/jpeg'
    ) {
      const base64String = buffer.toString('base64');
      const mediaType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      claudeMessages = [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64String } },
          { type: 'text', text: buildVisionPrompt() },
        ],
      }];

    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, DOCX, DOC, PNG, JPG, or JPEG.' },
        { status: 400 }
      );
    }

    // Call Claude
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), ANTHROPIC_TIMEOUT_MS);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: claudeMessages,
      }),
      signal: ac.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'AI analysis failed. Please try again.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawText = data.content.map((item) => item.text || '').join('\n');
    const clean = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    if (!parsed.courseName || !Array.isArray(parsed.assignments)) {
      return NextResponse.json(
        { error: 'The AI could not find a valid syllabus in this file. Please try a different file.' },
        { status: 422 }
      );
    }

    return NextResponse.json(parsed);

  } catch (error) {
    console.error('[parse-syllabus] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

function sanitizeForXml(s) {
  return String(s ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildTextPrompt(syllabusText) {
  return `You are an academic assistant. The following is the text content of a course syllabus. Extract the course information and all assignments, tests, papers, projects, quizzes, and homework items that have due dates or scheduled dates.

<syllabus>
${sanitizeForXml(syllabusText.slice(0, 15000))}
</syllabus>

Respond ONLY with valid JSON in this exact format, no preamble or markdown:
{
  "courseName": "Full course name (e.g. Introduction to Psychology)",
  "semester": "Semester name (e.g. Fall, Spring, Summer)",
  "year": "4-digit year as a string (e.g. 2025)",
  "assignments": [
    {
      "title": "Assignment or assessment title (be concise but descriptive)",
      "dueDate": "ISO 8601 date string (YYYY-MM-DD) or null if no date found"
    }
  ]
}

Rules:
- Include ALL assignments, tests, papers, quizzes, projects, readings, and homework items
- If no year is explicitly stated, infer from context or use the current year
- If a due date cannot be determined, set dueDate to null
- Keep assignment titles concise (under 80 characters)
- Do not include office hours, class meetings, or general schedule items that are not student deliverables`;
}

function buildVisionPrompt() {
  return `You are an academic assistant. The attached image is a course syllabus. Extract the course information and all assignments, tests, papers, projects, quizzes, and homework items that have due dates or scheduled dates.

Respond ONLY with valid JSON in this exact format, no preamble or markdown:
{
  "courseName": "Full course name (e.g. Introduction to Psychology)",
  "semester": "Semester name (e.g. Fall, Spring, Summer)",
  "year": "4-digit year as a string (e.g. 2025)",
  "assignments": [
    {
      "title": "Assignment or assessment title (be concise but descriptive)",
      "dueDate": "ISO 8601 date string (YYYY-MM-DD) or null if no date found"
    }
  ]
}

Rules:
- Include ALL assignments, tests, papers, quizzes, projects, readings, and homework items
- If no year is explicitly stated, infer from context or use the current year
- If a due date cannot be determined, set dueDate to null
- Keep assignment titles concise (under 80 characters)
- Do not include office hours, class meetings, or general schedule items that are not student deliverables`;
}
