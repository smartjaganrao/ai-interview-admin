/** Wraps editor-produced HTML in the JavihAI email shell (same look as lib/email.ts emails). */
export function wrapPromotionEmail(bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#0f172a;color:#e2e8f0;padding:0;margin:0;">
<div style="max-width:600px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:14px 22px;">
      <span style="color:white;font-size:22px;font-weight:800;">JavihAI</span>
    </div>
  </div>
  <div style="color:#cbd5e1;font-size:15px;line-height:1.7;">${bodyHtml}</div>
  <p style="color:#475569;font-size:12px;text-align:center;margin-top:32px;">JavihAI · <a href="https://javihai.in" style="color:#6366f1;">javihai.in</a></p>
</div></body></html>`;
}
