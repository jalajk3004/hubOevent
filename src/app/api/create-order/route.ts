import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import PaytmChecksum from 'paytmchecksum';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, ticketData, preferredGateway } = body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });
        }

        if (!ticketData || !ticketData.email || !ticketData.phone) {
            return NextResponse.json({ success: false, message: "Missing user details" }, { status: 400 });
        }

        // 1. Generate IDs before database insertion
        const tempId = Math.random().toString(36).substring(2, 10).toUpperCase();
        const friendlyTicketId = `HB-${tempId}`;
        const orderId = `ORD_${tempId}_${Date.now()}`;

        // 2. Create a registration entry in the database immediately (status: initiated)
        const { data: reg, error: regError } = await supabase
            .from('registrations')
            .insert([{
                name: ticketData.name,
                email: ticketData.email,
                phone: ticketData.phone,
                address: ticketData.address || 'NA',
                category: ticketData.category || 'NA',
                amount: amount,
                status: 'initiated', 
                paytm_order_id: orderId, // Store Paytm Order ID here
                paytm_payment_id: friendlyTicketId // Store HB-XXXX here
            }])
            .select('id, name, paytm_order_id, paytm_payment_id')
            .single();

        if (regError || !reg) {
            console.error("Database Registration Error:", regError);
            return NextResponse.json({ success: false, message: "Failed to initiate registration" }, { status: 500 });
        }

        const tryPaytm = async () => {
            const mid = process.env.PAYTM_MID;
            const mkey = process.env.PAYTM_MERCHANT_KEY;
            const website = process.env.PAYTM_WEBSITE || 'DEFAULT';
            const host = process.env.PAYTM_HOST || 'https://securestage.paytmpayments.com';

            if (!mid || !mkey) {
                console.warn("Paytm credentials missing");
                return null;
            }

            try {
                const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/verify-payment`;
                const paytmParams: any = {
                    body: {
                        requestType: "Payment",
                        mid: mid,
                        websiteName: website,
                        orderId: orderId,
                        callbackUrl: callbackUrl,
                        txnAmount: { value: amount.toString(), currency: "INR" },
                        userInfo: {
                            custId: ticketData.email.replace(/[^a-zA-Z0-9]/g, '_'),
                            mobile: ticketData.phone,
                            email: ticketData.email
                        },
                    },
                };

                const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), mkey);
                paytmParams.head = { signature: checksum };

                const post_data = JSON.stringify(paytmParams);
                const url = `${host}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: post_data,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const paytmResult = await response.json();

                if (paytmResult.body?.resultInfo?.resultStatus === 'S') {
                    return NextResponse.json({
                        success: true,
                        gateway: 'paytm',
                        orderId: orderId,
                        txnToken: paytmResult.body.txnToken,
                        mid: mid,
                        amount: amount.toString(),
                        host: host
                    }, { status: 200 });
                } else {
                    console.error("Paytm Initiation Failed, response:", paytmResult);
                    return null;
                }
            } catch (err) {
                console.error("Paytm init error/timeout:", err);
                return null;
            }
        };

        const tryRazorpay = async () => {
            try {
                const razorpay = new Razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID!,
                    key_secret: process.env.RAZORPAY_KEY_SECRET!
                });

                const rzpOrder = await razorpay.orders.create({
                    amount: amount * 100, // paise
                    currency: "INR",
                    receipt: orderId 
                });

                // Update registration with Razorpay ID so verify-payment can lookup by it
                await supabase
                    .from('registrations')
                    .update({ paytm_order_id: rzpOrder.id })
                    .eq('id', reg.id);

                return NextResponse.json({
                    success: true,
                    gateway: 'razorpay',
                    orderId: rzpOrder.id,
                    amount: amount.toString(),
                    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
                }, { status: 200 });
            } catch (rzpErr) {
                console.error("Razorpay fallback failed:", rzpErr);
                return null;
            }
        };

        let response = null;
        if (preferredGateway === 'paytm') {
            response = await tryPaytm();
            if (!response) response = await tryRazorpay();
        } else {
            // Defaults to Razorpay or specified as razorpay
            response = await tryRazorpay();
            if (!response) response = await tryPaytm();
        }

        if (response) return response;

        return NextResponse.json({
            success: false,
            message: "All payment gateways are currently unavailable."
        }, { status: 500 });

    } catch (error) {
        console.error("Initiate Order Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
