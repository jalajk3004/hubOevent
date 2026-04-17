import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabase } from '../_shared/supabase-client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  try {
    const { amount, ticketData } = await req.json();

    if (!amount || isNaN(amount) || amount <= 0) {
      return json({ success: false, message: 'Invalid amount' }, 400);
    }
    if (!ticketData?.email || !ticketData?.phone) {
      return json({ success: false, message: 'Missing user details' }, 400);
    }

    const tempId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const friendlyTicketId = `HB-${tempId}`;
    const orderId = `ORD_${tempId}_${Date.now()}`;

    // Create registration with status "initiated"
    const { data: reg, error: regError } = await supabase
      .from('registrations')
      .insert([{
        name: ticketData.name,
        email: ticketData.email,
        phone: ticketData.phone,
        address: ticketData.address || 'NA',
        category: ticketData.category || 'NA',
        amount,
        status: 'initiated',
        paytm_order_id: orderId,
        paytm_payment_id: friendlyTicketId,
      }])
      .select('id')
      .single();

    if (regError || !reg) {
      console.error('DB insert error:', regError);
      return json({ success: false, message: 'Failed to initiate registration' }, 500);
    }

    // Create Razorpay order via REST API
    const keyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
    const credentials = btoa(`${keyId}:${keySecret}`);

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt: orderId }),
    });

    const rzpOrder = await rzpRes.json();

    if (!rzpRes.ok || !rzpOrder.id) {
      console.error('Razorpay order error:', rzpOrder);
      return json({ success: false, message: 'Payment gateway unavailable' }, 502);
    }

    // Store Razorpay order ID so verify-payment can look up by it
    await supabase
      .from('registrations')
      .update({ paytm_order_id: rzpOrder.id })
      .eq('id', reg.id);

    return json({
      success: true,
      gateway: 'razorpay',
      orderId: rzpOrder.id,
      amount: amount.toString(),
      keyId: Deno.env.get('RAZORPAY_KEY_ID'),
    });
  } catch (err) {
    console.error('create-order error:', err);
    return json({ success: false, message: 'Internal server error' }, 500);
  }
});
