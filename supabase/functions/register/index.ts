import { handleOptions, json } from '../_shared/cors.ts';
import { supabase } from '../_shared/supabase-client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  try {
    const body = await req.json();
    const { name, email, phone, address, category, amount } = body;

    if (!email || !phone || !name) {
      return json({ success: false, message: 'Missing required fields' }, 400);
    }

    const { data, error } = await supabase
      .from('registrations')
      .insert([{ name, email, phone, address: address || 'NA', category: category || 'NA', amount: amount || 0, status: 'paid' }])
      .select('id')
      .single();

    if (error || !data) {
      return json({ success: false, message: 'Registration failed' }, 500);
    }

    return json({ success: true, id: data.id });
  } catch (err) {
    console.error('register error:', err);
    return json({ success: false, message: 'Internal server error' }, 500);
  }
});
