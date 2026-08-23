import { Resend } from 'resend';
import type { Kpis } from '@/lib/kpis';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'JavihAI <onboarding@resend.dev>';
const DIGEST_RECIPIENT = process.env.MRR_DIGEST_EMAIL ?? 'smartjaganrao@gmail.com';

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

function row(label: string, value: string): string {
  return `<tr style="border-bottom:1px solid #334155;"><td style="padding:10px 0;color:#94a3b8;font-size:14px;">${label}</td><td style="padding:10px 0;color:#e2e8f0;font-size:14px;text-align:right;font-weight:600;">${value}</td></tr>`;
}

export async function sendMrrDigest(kpis: Kpis, date: string): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'Email not configured' };
  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = `
<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#0f172a;color:#e2e8f0;padding:0;margin:0;">
<div style="max-width:600px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:14px 22px;">
      <span style="color:white;font-size:22px;font-weight:800;">JavihAI Admin</span>
    </div>
  </div>

  <h1 style="font-size:22px;font-weight:800;margin:0 0 4px;text-align:center;">Daily MRR &amp; Usage Digest</h1>
  <p style="color:#64748b;font-size:13px;text-align:center;margin:0 0 28px;">${date}</p>

  <div style="background:linear-gradient(135deg,#312e81,#4c1d95);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
    <p style="color:#c4b5fd;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Total MRR</p>
    <p style="color:#fff;font-size:36px;font-weight:800;margin:0;">${inr(kpis.totalMRR)}</p>
  </div>

  <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:24px;">
    <h2 style="font-size:14px;color:#94a3b8;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">MRR by Plan</h2>
    <table style="width:100%;border-collapse:collapse;">
      ${row('Quick Pass', inr(kpis.mrrByPlan.quick_pass))}
      ${row('Pro', inr(kpis.mrrByPlan.pro))}
      ${row('Power', inr(kpis.mrrByPlan.power))}
    </table>
  </div>

  <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:24px;">
    <h2 style="font-size:14px;color:#94a3b8;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">Users</h2>
    <table style="width:100%;border-collapse:collapse;">
      ${row('Total users', kpis.totalUsers.toLocaleString('en-IN'))}
      ${row('Active this week', kpis.activeThisWeek.toLocaleString('en-IN'))}
      ${row('Free', kpis.usersByPlan.free.toLocaleString('en-IN'))}
      ${row('Quick Pass', kpis.usersByPlan.quick_pass.toLocaleString('en-IN'))}
      ${row('Pro', kpis.usersByPlan.pro.toLocaleString('en-IN'))}
      ${row('Power', kpis.usersByPlan.power.toLocaleString('en-IN'))}
      ${row('Churn rate (this month)', `${kpis.churnRate}%`)}
    </table>
  </div>

  <div style="text-align:center;margin:28px 0 0;">
    <a href="https://admin.javihai.in/analytics" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">Open full dashboard →</a>
  </div>
</div>
</body></html>`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: DIGEST_RECIPIENT,
    subject: `📊 JavihAI daily digest — ${inr(kpis.totalMRR)} MRR, ${kpis.totalUsers} users`,
    html,
  });

  if (error) {
    console.error('[digest-email/mrr] Resend error:', JSON.stringify(error));
    return { ok: false, error: error.message ?? JSON.stringify(error) };
  }
  return { ok: true };
}
