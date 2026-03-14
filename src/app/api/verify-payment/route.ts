import { NextResponse } from 'next/server';
// @ts-expect-error - paytmchecksum is not typed
import PaytmChecksum from 'paytmchecksum';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppTicket } from '@/lib/whatsapp';

export async function POST(req: Request) {
    try {
        let body: Record<string, string> = {};
        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            body = await req.json();
        } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            body = Object.fromEntries(formData.entries()) as Record<string, string>;
        } else {
            const text = await req.text();
            try { body = JSON.parse(text); } catch { /* ignore */ }
        }

        const { ORDERID, TXNID, RESPCODE, RESPMSG, CHECKSUMHASH, TXNAMOUNT } = body;
        const merchantKey = process.env.PAYTM_MERCHANT_KEY!;
        const mid = process.env.PAYTM_MID!;
        const host = process.env.PAYTM_HOST || 'https://securestage.paytmpayments.com';

        if (!ORDERID) {
            return NextResponse.redirect(new URL(`/checkout?payment=failed&msg=MissingOrderID`, req.url), { status: 303 });
        }

        // Server-Side Verification using v3 order status
        const paytmParams: any = {};
        paytmParams.body = {
            "mid": mid,
            "orderId": ORDERID,
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

        // 1. Fetch the existing record created during create-order
        const { data: registration, error: fetchError } = await supabase
            .from('registrations')
            .select('*')
            .eq('id', ORDERID)
            .single();

        if (fetchError || !registration) {
            console.error("No registration found for ORDERID:", ORDERID, fetchError);
            // Fallback: If for some reason the row is missing, handle gracefully
            return NextResponse.redirect(new URL(`/checkout?payment=failed&msg=RegistrationNotFound`, req.url), { status: 303 });
        }

        const ticketData = {
            name: registration.name,
            email: registration.email,
            phone: registration.phone,
            event: registration.event,
            category: registration.category,
            type: registration.type,
            aadhaar: registration.aadhaar,
            address: registration.address,
        };

        // 2. Record the payment attempt in the 'payments' table
        const amount = TXNAMOUNT || statusData?.body?.txnAmount || registration.amount || '0';
        const finalStatus = isSuccess ? 'paid' : 'failed';
        const paytmOrderId = ORDERID;
        const paytmTxnId = TXNID || statusData?.body?.txnId || 'N/A';

        console.log(`Recording payment for registration ${registration.id} with status: ${finalStatus}`);

        const { error: paymentInsertError } = await supabase
            .from('payments')
            .insert([{
                registration_id: registration.id,
                paytm_order_id: paytmOrderId,
                paytm_payment_id: paytmTxnId,
                amount: amount,
                status: finalStatus
            }]);

        if (paymentInsertError) {
            console.error("Failed to record payment entry:", JSON.stringify(paymentInsertError, null, 2));
            // We continue even if this fails, as updating the registration is more critical
        }

        // 3. Update the registration status
        console.log(`Updating registration ${registration.id} status to: ${finalStatus}`);

        const { error: updateError } = await supabase
            .from('registrations')
            .update({
                status: finalStatus,
                razorpay_order_id: paytmOrderId, // Keep for backward compatibility/dashboard
                razorpay_payment_id: paytmTxnId, // Keep for backward compatibility/dashboard
                amount: amount
            })
            .eq('id', registration.id);

        if (updateError) {
            console.error("Database Update Error (Registrations):", JSON.stringify(updateError, null, 2));
        } else {
            console.log("Registration updated successfully for ID:", registration.id);
        }

        if (!isSuccess) {
            const msg = statusData?.body?.resultInfo?.resultMsg || "Payment Failed";
            return NextResponse.redirect(new URL(`/checkout?payment=failed&msg=${encodeURIComponent(msg)}`, req.url), { status: 303 });
        }

        // Send Email & WhatsApp only on success
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || "smtp.gmail.com",
                port: parseInt(process.env.EMAIL_PORT || "587"),
                secure: false,
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
            });

            const mailOptions = {
                from: `"HubO Events" <${process.env.EMAIL_USER}>`,
                to: ticketData.email,
                subject: `Your Tickets for ${ticketData.event.replace('-', ' ').toUpperCase()} 🎉`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                        <h1 style="color: #f70a7d; text-align: center;">HUBO EVENTS</h1>
                        <h2 style="text-align: center;">Payment Successful!</h2>
                        <p>Hi <b>${ticketData.name}</b>,</p>
                        <p>Your payment of <b>₹${amount}</b> was successful!</p>
                        <div style="background: #fdfdfd; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px dashed #ccc;">
                            <h3>Ticket Details</h3>
                            <p><b>Event:</b> ${ticketData.event.replace('-', ' ').toUpperCase()}</p>
                            <p><b>Category:</b> ${ticketData.category}</p>
                            <p><b>Type:</b> ${ticketData.type.toUpperCase()}</p>
                            <p><b>Ticket ID:</b> ${registration.id}</p>
                        </div>
                        <p style="margin-top: 30px;">Present this email at the venue entrance. See you there!</p>
                    </div>
                `
            };

            const eventDetails: Record<string, { date: string, time: string, venue: string }> = {
                'neon-nights': { date: 'Oct 15, 2026', time: '08:00 PM', venue: 'Mumbai Arena' },
                'rhythm-project': { date: 'Nov 02, 2026', time: '07:00 PM', venue: 'Delhi State' },
                'midnight-sun': { date: 'Dec 31, 2026', time: '09:00 PM', venue: 'Goa Beach Club' }
            };

            const eventInfo = eventDetails[ticketData.event] || { date: 'TBD', time: 'TBD', venue: 'TBD' };

            await Promise.allSettled([
                transporter.sendMail(mailOptions),
                sendWhatsAppTicket(ticketData.phone, {
                    name: ticketData.name,
                    event: ticketData.event,
                    category: ticketData.category,
                    type: ticketData.type,
                    quantity: 1,
                    ticketId: registration.id,
                    paymentId: TXNID || 'N/A',
                    amount: amount,
                    date: eventInfo.date,
                    time: eventInfo.time,
                    venue: eventInfo.venue
                })
            ]);
        } catch (msgErr) {
            console.error("Messaging error:", msgErr);
        }

        return NextResponse.redirect(new URL(`/checkout?payment=success`, req.url), { status: 303 });

    } catch (error) {
        console.error("Verify Payment Error:", error);
        return NextResponse.redirect(new URL(`/checkout?payment=error`, req.url), { status: 303 });
    }
}
