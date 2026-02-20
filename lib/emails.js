/**
 * Email HTML templates — ProcrastiNation brand voice
 * Nation/flag theme, dark background, emerald accent
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://procrasti-nation.vercel.app';

// ─── Shared components ────────────────────────────────────────────────────────

const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ProcrastiNation</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      Procrasti<span style="color:#34d399;">Nation</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background-color:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#475569;">
                © 2026 ProcrastiNation · The nation where things get done.
                <br/>
                <a href="${BASE_URL}" style="color:#34d399;text-decoration:none;">Visit ProcrastiNation</a>
                &nbsp;·&nbsp;
                <a href="${BASE_URL}/dashboard" style="color:#34d399;text-decoration:none;">Your Dashboard</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── Nudge email ──────────────────────────────────────────────────────────────

export function buildNudgeEmail({ taskTitle, stepsRemaining, taskId, userEmail }) {
  const planUrl = `${BASE_URL}/planner?task=${taskId}`;
  const stepsWord = stepsRemaining === 1 ? 'step' : 'steps';

  const content = `
    <!-- Gradient top bar -->
    <tr>
      <td style="height:4px;background:linear-gradient(90deg,#059669,#0d9488);"></td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:32px;">

        <!-- Icon + badge -->
        <p style="margin:0 0 20px 0;">
          <span style="display:inline-block;background-color:#064e3b;color:#34d399;font-size:12px;font-weight:700;padding:4px 12px;border-radius:100px;letter-spacing:0.5px;text-transform:uppercase;">
            ⚡ Task waiting for you
          </span>
        </p>

        <!-- Headline -->
        <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">
          You've got ${stepsRemaining} ${stepsWord} left.
        </h1>
        <p style="margin:0 0 24px 0;font-size:16px;color:#94a3b8;line-height:1.5;">
          Your task <strong style="color:#e2e8f0;">"${taskTitle}"</strong> is still in progress.
          It's not going to finish itself — but it's closer than you think.
        </p>

        <!-- Step count visual -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>
            <td style="background-color:#0f172a;border-radius:10px;padding:16px 20px;">
              <p style="margin:0;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Remaining</p>
              <p style="margin:4px 0 0 0;font-size:28px;font-weight:800;color:#34d399;">
                ${stepsRemaining} ${stepsWord}
              </p>
              <p style="margin:4px 0 0 0;font-size:13px;color:#64748b;">${taskTitle}</p>
            </td>
          </tr>
        </table>

        <!-- CTA button -->
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#0d9488);border-radius:10px;">
              <a href="${planUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                Pick up where I left off →
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:20px 0 0 0;font-size:13px;color:#475569;">
          One step. That's all it takes to build momentum today.
        </p>

      </td>
    </tr>
  `;

  return {
    subject: `You've got ${stepsRemaining} ${stepsWord} left on "${taskTitle}"`,
    html: emailWrapper(content),
  };
}

// ─── Weekly Citizen Report ─────────────────────────────────────────────────────

export function buildWeeklyReportEmail({
  completedThisWeek,
  completedTitles,
  currentStreak,
  inProgressTasks,
  pepTalk,
}) {
  const plannerUrl = `${BASE_URL}/planner`;
  const dashboardUrl = `${BASE_URL}/dashboard`;

  const completedSection = completedTitles.length > 0
    ? completedTitles.map(t => `
        <tr>
          <td style="padding:6px 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:20px;vertical-align:top;padding-top:2px;">
                  <span style="color:#34d399;font-size:14px;">✓</span>
                </td>
                <td style="font-size:14px;color:#cbd5e1;padding-left:8px;">${t}</td>
              </tr>
            </table>
          </td>
        </tr>`).join('')
    : `<tr><td style="font-size:14px;color:#475569;padding:6px 0;">No completed tasks this week — this week is your week to change that.</td></tr>`;

  const inProgressSection = inProgressTasks.length > 0
    ? inProgressTasks.map(t => `
        <tr>
          <td style="padding:6px 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:20px;vertical-align:top;padding-top:2px;">
                  <span style="color:#f59e0b;font-size:14px;">→</span>
                </td>
                <td style="font-size:14px;color:#cbd5e1;padding-left:8px;">${t}</td>
              </tr>
            </table>
          </td>
        </tr>`).join('')
    : `<tr><td style="font-size:14px;color:#475569;padding:6px 0;">Nothing in progress — time to queue something up.</td></tr>`;

  const streakDisplay = currentStreak > 0
    ? `🔥 ${currentStreak}-day streak`
    : `No active streak — start one today`;

  const content = `
    <!-- Gradient top bar -->
    <tr>
      <td style="height:4px;background:linear-gradient(90deg,#059669,#0d9488);"></td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:32px;">

        <!-- Badge -->
        <p style="margin:0 0 20px 0;">
          <span style="display:inline-block;background-color:#064e3b;color:#34d399;font-size:12px;font-weight:700;padding:4px 12px;border-radius:100px;letter-spacing:0.5px;text-transform:uppercase;">
            📊 Your Weekly Citizen Report
          </span>
        </p>

        <!-- Headline -->
        <h1 style="margin:0 0 6px 0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.3;">
          ${completedThisWeek > 0 ? `${completedThisWeek} task${completedThisWeek === 1 ? '' : 's'} down. Nation status: active.` : `New week. Clean slate. Let's go.`}
        </h1>
        <p style="margin:0 0 28px 0;font-size:14px;color:#64748b;">Your productivity recap for the past 7 days.</p>

        <!-- Stats row -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>
            <td width="48%" style="background-color:#0f172a;border-radius:10px;padding:16px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:800;color:#34d399;">${completedThisWeek}</p>
              <p style="margin:4px 0 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Tasks Completed</p>
            </td>
            <td width="4%"></td>
            <td width="48%" style="background-color:#0f172a;border-radius:10px;padding:16px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:800;color:#f59e0b;">${currentStreak}</p>
              <p style="margin:4px 0 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Day Streak 🔥</p>
            </td>
          </tr>
        </table>

        <!-- Completed tasks -->
        <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Completed this week</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${completedSection}
        </table>

        <!-- In progress -->
        <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Still in progress</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          ${inProgressSection}
        </table>

        <!-- AI pep talk -->
        ${pepTalk ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>
            <td style="background-color:#0f172a;border-left:3px solid #34d399;border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#34d399;text-transform:uppercase;letter-spacing:0.5px;">From your AI coach</p>
              <p style="margin:0;font-size:15px;color:#e2e8f0;line-height:1.6;font-style:italic;">"${pepTalk}"</p>
            </td>
          </tr>
        </table>
        ` : ''}

        <!-- CTAs -->
        <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#0d9488);border-radius:10px;">
              <a href="${plannerUrl}" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                Plan something new →
              </a>
            </td>
            <td style="padding-left:12px;">
              <a href="${dashboardUrl}" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:700;color:#34d399;text-decoration:none;border:1.5px solid #34d399;border-radius:10px;">
                View Dashboard
              </a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  `;

  const weekCompleteText = completedThisWeek > 0
    ? `You completed ${completedThisWeek} task${completedThisWeek === 1 ? '' : 's'} — ${streakDisplay}`
    : `Your weekly report is ready`;

  return {
    subject: `Your Weekly Citizen Report — ${weekCompleteText}`,
    html: emailWrapper(content),
  };
}
