import { db } from '@/lib/firebase-admin';

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
}

const DEFAULT_FROM = 'JavihAI <onboarding@resend.dev>';

// Short in-process cache so admin key updates propagate within 5 minutes
// without a Firestore read on every send.
let _cache: { config: ResendConfig; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Resolves the Resend API key + From address. Admin-managed keys in Firestore
 * (settings/api_keys) take precedence; falls back to env vars. Returns null
 * when no key is configured anywhere.
 */
export async function getResendConfig(): Promise<ResendConfig | null> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.config;

  try {
    if (db) {
      const doc = await db.collection('settings').doc('api_keys').get();
      const data = doc.exists ? doc.data() : null;
      if (data?.resendApiKey) {
        const config: ResendConfig = {
          apiKey: data.resendApiKey as string,
          fromEmail: (data.resendFromEmail as string) || process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
        };
        _cache = { config, ts: Date.now() };
        return config;
      }
    }
  } catch { /* fall through to env */ }

  if (process.env.RESEND_API_KEY) {
    const config: ResendConfig = {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    };
    _cache = { config, ts: Date.now() };
    return config;
  }

  return null;
}
