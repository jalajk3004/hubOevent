import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { sendWhatsAppTicket } from '../_shared/whatsapp.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!;

    // Verify webhook signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const generated = Array.from(new Uint8Array(sigBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (generated !== signature) {
      return json({ success: false, message: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(rawBody);
    if (event.event !== 'payment.captured') {
      return json({ success: true, message: 'Event ignored' });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) return json({ success: false, message: 'Invalid payload' }, 400);

    const orderId = payment.order_id;
    const paymentId = payment.id;

    // Check if already processed
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('paytm_order_id', orderId)
      .eq('status', 'paid')
      .maybeSingle();

    if (existing) return json({ success: true, message: 'Already processed' });

    const { data: registration } = await supabase
      .from('registrations')
      .select('*')
      .eq('paytm_order_id', orderId)
      .maybeSingle();

    if (!registration) return json({ success: false, message: 'Registration not found' }, 404);

    await supabase.from('payments').insert([{
      registration_id: registration.id,
      paytm_order_id: orderId,
      paytm_payment_id: paymentId,
      amount: registration.amount,
      status: 'paid',
    }]);

    await supabase
      .from('registrations')
      .update({ status: 'paid' })
      .eq('id', registration.id);

    try {
      await sendWhatsAppTicket(registration.phone, {
        name: registration.name,
        event: 'dhurandhar',
        ticketId: registration.paytm_payment_id || registration.id,
        venue: 'lajpat',
      });
    } catch (err) {
      console.error('WhatsApp error in webhook:', err);
    }

    return json({ success: true });
  } catch (err) {
    console.error('webhook error:', err);
    return json({ success: false, message: 'Internal server error' }, 500);
  }
});
