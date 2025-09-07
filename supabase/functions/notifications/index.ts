// Supabase Edge Function: notifications
// Sends Expo push notifications when a row is inserted into the `notifications` table.
// Deploy with: supabase functions deploy notifications
// Set env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
};

async function fetchPushTokens(userId: string) {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!url || !key) {
    console.error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return [] as string[];
  }
  
  // Sanitize user ID to prevent SQL injection
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-]/g, '');
  
  const resp = await fetch(`${url}/rest/v1/push_tokens?user_id=eq.${sanitizedUserId}&is_active=eq.true&select=token`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!resp.ok) return [] as string[];
  const rows = await resp.json();
  return (rows || []).map((r: any) => r.token as string);
}

async function markSent(id: string) {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!url || !key) {
    console.error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return;
  }
  
  // Sanitize ID to prevent SQL injection
  const sanitizedId = id.replace(/[^a-zA-Z0-9-]/g, '');
  
  await fetch(`${url}/rest/v1/notifications?id=eq.${sanitizedId}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({ is_sent: true })
  });
}

async function sendExpoPush(tokens: string[], title: string, body: string, data?: any) {
  if (!tokens.length) return;
  const chunks = tokens.map((to) => ({ to, title, body, data, sound: 'default', priority: 'high' }));
  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chunks),
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const payload = await req.json();
  // Expecting Postgres row payload from trigger/webhook
  const row: NotificationRow = payload.record || payload.new || payload;
  if (!row?.user_id) return new Response('Bad payload', { status: 400 });

  try {
    const tokens = await fetchPushTokens(row.user_id);
    await sendExpoPush(tokens, row.title, row.body, row.data);
    await markSent(row.id);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

