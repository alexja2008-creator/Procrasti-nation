import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/authMiddleware';
import { callClaude, AIError, MODELS, sanitizeForXml, resolveToday } from '../../../lib/ai';

// Must use Node.js runtime — pdf-parse and mammoth are Node-only libraries
export const runtime = 'nodejs';
export const maxDuration = 60;

const SYLLABUS_SCHEMA = {
  type: 'object',
  properties: {
    courseName: { type: 'string', description: 'Full course name (e.g. Introduction to Psychology)' },
    semester: { type: 'string', description: 'Semester name (e.g. Fall, Spring, Summer)' },
    year: { type: 'string', description: '4-digit year (e.g. 2026)' },
    assignments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Assignment or assessment title, concise but descriptive' },
          dueDate: {
            anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }],
            description: 'Due date as YYYY-MM-DD, or null if no date found',
          },
        },
        required: ['title', 'dueDate'],
        additionalProperties: false,
      },
    },
  },
  required: ['courseName', 'semester', 'year', 'assignments'],
  additionalProperties: false,
};

export async function POST(request) {
  try {
    const { error: authError } = await requireAuth(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
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

    // Legacy .doc binary format is not supported by mammoth — reject early with a clear message
    if (fileName.endsWith('.doc') && !fileName.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Legacy .doc files are not supported. Please save as .docx and re-upload.' },
        { status: 400 }
      );
    }

    // Read the file into a Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const today = resolveToday(formData.get('today'), formData.get('timeZone'));
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
      claudeMessages = [{ role: 'user', content: buildTextPrompt(text, today) }];

    } else if (
      fileName.endsWith('.docx') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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
      claudeMessages = [{ role: 'user', content: buildTextPrompt(text, today) }];

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
          { type: 'text', text: buildVisionPrompt(today) },
        ],
      }];

    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, DOCX, PNG, JPG, or JPEG.' },
        { status: 400 }
      );
    }

    const parsed = await callClaude({
      model: MODELS.plan,
      effort: 'low',
      schema: SYLLABUS_SCHEMA,
      timeoutMs: 55_000,
      messages: claudeMessages,
    });

    if (!parsed.courseName || !Array.isArray(parsed.assignments)) {
      return NextResponse.json(
        { error: 'The AI could not find a valid syllabus in this file. Please try a different file.' },
        { status: 422 }
      );
    }

    if (parsed.assignments.length === 0) {
      return NextResponse.json(
        { error: 'No assignments or deadlines were found in this syllabus. If this looks wrong, try uploading a clearer copy.' },
        { status: 422 }
      );
    }

    // Normalize missing metadata fields so the client never receives undefined
    parsed.semester = parsed.semester || 'Unknown Semester';
    parsed.year = parsed.year || String(new Date().getFullYear());

    // Sanitize each assignment: ensure title is a string and dueDate is ISO 8601 or null
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    parsed.assignments = parsed.assignments.map((a) => ({
      title: String(a.title || 'Untitled Assignment').slice(0, 120),
      dueDate: a.dueDate && ISO_DATE_RE.test(String(a.dueDate)) ? a.dueDate : null,
    }));

    return NextResponse.json(parsed);

  } catch (error) {
    if (error instanceof AIError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[parse-syllabus] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

function buildTextPrompt(syllabusText, today) {
  return `You are an academic assistant. The following is the text content of a course syllabus. Extract the course information and all assignments, tests, papers, projects, quizzes, and homework items that have due dates or scheduled dates.

<syllabus>
${sanitizeForXml(syllabusText.slice(0, 60000))}
</syllabus>

Today is ${today.label}.

Rules:
- Include ALL assignments, tests, papers, quizzes, projects, readings, and homework items
- If no year is explicitly stated, infer it from context and today's date
- If a due date cannot be determined, set dueDate to null
- Keep assignment titles concise (under 80 characters)
- Do not include office hours, class meetings, or general schedule items that are not student deliverables`;
}

function buildVisionPrompt(today) {
  return `You are an academic assistant. The attached image is a course syllabus. Extract the course information and all assignments, tests, papers, projects, quizzes, and homework items that have due dates or scheduled dates.

Today is ${today.label}.

Rules:
- Include ALL assignments, tests, papers, quizzes, projects, readings, and homework items
- If no year is explicitly stated, infer it from context and today's date
- If a due date cannot be determined, set dueDate to null
- Keep assignment titles concise (under 80 characters)
- Do not include office hours, class meetings, or general schedule items that are not student deliverables`;
}
