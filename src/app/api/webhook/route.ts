import { NextResponse } from 'next/server';
import PaytmChecksum from 'paytmchecksum';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppTicket } from '@/lib/whatsapp';

export async function POST(req: Request) {
    try {
        let body: Record<string, any> = {};
        const contentType = req.headers.get("content-type") || "";
        let rawBody = "";

        if (contentType.includes("application/json")) {
            rawBody = await req.text();
            try { body = JSON.parse(rawBody); } catch { /* ignore */ }
        } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            body = Object.fromEntries(formData.entries()) as Record<string, string>;
        } else {
            rawBody = await req.text();
            try { body = JSON.parse(rawBody); } catch { /* ignore */ }
        }

        const razorpaySignature = req.headers.get("x-razorpay-signature");

        if (razorpaySignature) {
            // ----------- RAZORPAY WEBHOOK LOGIC -----------
            const crypto = require("crypto");
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

            if (!webhookSecret) {
                console.error("Missing Razorpay Webhook Secret in ENV");
                return NextResponse.json({ success: false, message: "Configuration error" }, { status: 500 });
            }

            const hmac = crypto.createHmac('sha256', webhookSecret);
            hmac.update(rawBody);
            const expectedSignature = hmac.digest('hex');

            if (expectedSignature !== razorpaySignature) {
                console.error("Razorpay Webhook Validation Error: Invalid Signature");
                return NextResponse.json({ success: false, message: "Invalid Signature" }, { status: 400 });
            }

            const event = body.event;
            const paymentEntity = body?.payload?.payment?.entity;
            
            if (!event || !paymentEntity) {
                return NextResponse.json({ success: false, message: "Invalid Razorpay Webhook payload" }, { status: 400 });
            }

            const paymentId = paymentEntity.id;
            const orderId = paymentEntity.order_id;
            const amount = (paymentEntity.amount / 100).toString(); // convert from paise to INR
            const isSuccess = event === 'payment.captured';

            // Find Registration by Razorpay orderId which was saved in paytm_order_id during create-order
            const { data: registration, error: fetchError } = await supabase
                .from('registrations')
                .select('*')
                .eq('paytm_order_id', orderId)
                .single();

            if (fetchError || !registration) {
                console.error(`Razorpay Webhook Error: No registration found for Order ID: ${orderId}`);
                return NextResponse.json({ success: false, message: "Registration not found" }, { status: 404 });
            }

            if (registration.status === 'paid' && isSuccess) {
                return NextResponse.json({ success: true, message: "Webhook processed already" }, { status: 200 });
            }

            const finalStatus = isSuccess ? 'paid' : (event === 'payment.failed' ? 'failed' : registration.status);
            
            if (finalStatus !== registration.status) {
                // Deduplicate webhook event mapping
                const { data: existingPayment } = await supabase
                    .from('payments')
                    .select('id')
                    .eq('registration_id', registration.id)
                    .eq('paytm_payment_id', paymentId)
                    .single();
                
                if (!existingPayment) {
                    await supabase
                        .from('payments')
                        .insert([{
                            registration_id: registration.id,
                            paytm_order_id: orderId,
                            paytm_payment_id: paymentId,
                            amount: amount,
                            status: finalStatus
                        }]);
                }

                console.log(`Razorpay Webhook: Updating registration ${registration.id} status to: ${finalStatus}`);
                await supabase
                    .from('registrations')
                    .update({
                        status: finalStatus,
                        amount: amount
                    })
                    .eq('id', registration.id);

                if (isSuccess) {
                    const ticketData = {
                        name: registration.name,
                        email: registration.email,
                        phone: registration.phone,
                        event: registration.event || 'dhurandhar',
                    };
                    try {
                        const eventVenues: Record<string, string> = {
                            'neon-nights':    'Mumbai Arena',
                            'rhythm-project': 'Delhi State',
                            'midnight-sun':   'Goa Beach Club',
                            'dhurandhar':     'TBD',
                        };
                        const venue = eventVenues[ticketData.event] || 'TBD';
                        await sendWhatsAppTicket(ticketData.phone, {
                            name:     ticketData.name,
                            event:    ticketData.event,
                            ticketId: registration.paytm_payment_id || registration.id,
                            venue,
                        });
                    } catch (msgErr) {
                        console.error("Razorpay Webhook Messaging error:", msgErr);
                    }
                }
            }

            return NextResponse.json({ success: true, message: "Razorpay Webhook processed successfully" }, { status: 200 });
        }


        // ----------- PAYTM WEBHOOK LOGIC -----------
        const merchantKey = process.env.PAYTM_MERCHANT_KEY!;

        const { ORDERID, TXNID } = body;
        const orderId = ORDERID || body.orderId;

        if (!orderId) {
            return NextResponse.json({ success: false, message: "Missing Order ID for Paytm" }, { status: 400 });
        }

        const mid = process.env.PAYTM_MID!;
        const host = process.env.PAYTM_HOST || 'https://securestage.paytmpayments.com';

        const paytmParams: any = {};
        paytmParams.body = {
            "mid": mid,
            "orderId": orderId,
        };

        const signature = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), merchantKey);
        paytmParams.head = { "signature": signature };

        const statusResponse = await fetch(`${host}/v3/order/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paytmParams)
        });

        const statusData = await statusResponse.json();
        const isSuccess = statusData?.body?.resultInfo?.resultStatus === 'TXN_SUCCESS';

        const { data: registration, error: fetchError } = await supabase
            .from('registrations')
            .select('*')
            .eq('paytm_order_id', orderId)
            .single();

        if (fetchError || !registration) {
            console.error("Paytm Webhook Error: No registration found for ORDERID:", orderId);
            return NextResponse.json({ success: false, message: "Registration not found" }, { status: 404 });
        }

        if (registration.status === 'paid' && isSuccess) {
            return NextResponse.json({ success: true, message: "Webhook processed already" }, { status: 200 });
        }

        const amount = statusData?.body?.txnAmount || registration.amount || '0';
        const finalStatus = isSuccess ? 'paid' : 'failed';
        const paytmTxnId = statusData?.body?.txnId || TXNID || 'N/A';

        console.log(`Paytm Webhook: Recording payment for registration ${registration.id} with status: ${finalStatus}`);

        const { data: existingPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('registration_id', registration.id)
            .eq('paytm_payment_id', paytmTxnId)
            .single();
            
        if (!existingPayment) {
            await supabase
                .from('payments')
                .insert([{
                    registration_id: registration.id,
                    paytm_order_id: orderId,
                    paytm_payment_id: paytmTxnId,
                    amount: amount,
                    status: finalStatus
                }]);
        }

        await supabase
            .from('registrations')
            .update({
                status: finalStatus,
                amount: amount
            })
            .eq('id', registration.id);

        if (!isSuccess) {
            return NextResponse.json({ success: true, message: "Webhook received, payment not successful" });
        }

        const ticketData = {
            name: registration.name,
            email: registration.email,
            phone: registration.phone,
            event: registration.event || 'dhurandhar',
        };

        try {
            const eventVenues: Record<string, string> = {
                'neon-nights':    'Mumbai Arena',
                'rhythm-project': 'Delhi State',
                'midnight-sun':   'Goa Beach Club',
                'dhurandhar':     'TBD',
            };
            const venue = eventVenues[ticketData.event] || 'TBD';

            await sendWhatsAppTicket(ticketData.phone, {
                name:     ticketData.name,
                event:    ticketData.event,
                ticketId: registration.paytm_payment_id || registration.id,
                venue,
            });
        } catch (msgErr) {
            console.error("Paytm Webhook Messaging error:", msgErr);
        }

        return NextResponse.json({ success: true, message: "Paytm Webhook processed successfully" }, { status: 200 });

    } catch (error) {
        console.error("Webhook Route Error:", error);
        return NextResponse.json({ success: false, message: "Webhook handler failed" }, { status: 500 });
    }
}
