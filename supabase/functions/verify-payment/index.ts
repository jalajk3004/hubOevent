import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { sendWhatsAppTicket } from '../_shared/whatsapp.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  try {
    const body = await req.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return json({ success: false, message: 'Missing payment fields' }, 400);
    }

    // Verify HMAC-SHA256 signature using Web Crypto API
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`)
    );
    const generated = Array.from(new Uint8Array(sigBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const isSuccess = generated === razorpay_signature;

    // Look up registration
    const { data: registration, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('paytm_order_id', razorpay_order_id)
      .single();

    if (fetchError || !registration) {
      console.error('Registration not found for order:', razorpay_order_id);
      return json({ success: false, message: 'Registration not found' }, 404);
    }

    const finalStatus = isSuccess ? 'paid' : 'failed';

    // Record payment
    await supabase.from('payments').insert([{
      registration_id: registration.id,
      paytm_order_id: razorpay_order_id,
      paytm_payment_id: razorpay_payment_id,
      amount: registration.amount,
      status: finalStatus,
    }]);

    // Update registration
    await supabase
      .from('registrations')
      .update({ status: finalStatus })
      .eq('id', registration.id);

    if (!isSuccess) {
      return json({ success: false, message: 'Payment verification failed' });
    }

    // Send WhatsApp ticket
    try {
      await sendWhatsAppTicket(registration.phone, {
        name: registration.name,
        event: 'dhurandhar',
        ticketId: registration.paytm_payment_id || registration.id,
        venue: 'lajpat',
      });
    } catch (msgErr) {
      console.error('WhatsApp send error:', msgErr);
    }

    return json({ success: true });
  } catch (err) {
    console.error('verify-payment error:', err);
    return json({ success: false, message: 'Internal server error' }, 500);
  }
});
