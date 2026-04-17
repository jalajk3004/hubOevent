import { handleOptions, json } from '../_shared/cors.ts';
import { supabase } from '../_shared/supabase-client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  try {
    const url = new URL(req.url);
    // Support both /ticket?id=xxx and /ticket/xxx
    const pathParts = url.pathname.split('/').filter(Boolean);
    const id = url.searchParams.get('id') || pathParts[pathParts.length - 1];

    if (!id || id === 'ticket') {
      return json({ success: false, message: 'Ticket ID required' }, 400);
    }

    const { data, error } = await supabase
      .from('registrations')
      .select('id, name, email, category, status, amount, created_at, paytm_payment_id')
      .eq('id', id)
      .single();

    if (error || !data) {
      return json({ success: false, message: 'Ticket not found' }, 404);
    }

    return json({ success: true, ticket: data });
  } catch (err) {
    console.error('ticket error:', err);
    return json({ success: false, message: 'Internal server error' }, 500);
  }
});
