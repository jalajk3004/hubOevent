import { NextResponse } from 'next/server';
// @ts-expect-error - paytmchecksum is not typed
import PaytmChecksum from 'paytmchecksum';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, ticketData } = body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });
        }

        if (!ticketData || !ticketData.email || !ticketData.phone) {
            return NextResponse.json({ success: false, message: "Missing user details" }, { status: 400 });
        }

        // 1. Create a "pending" entry in the database immediately
        // This ensures data is saved before redirecting to Paytm
        const { data: reg, error: regError } = await supabase
            .from('registrations')
            .insert([{
                name: ticketData.name,
                email: ticketData.email,
                phone: ticketData.phone,
                event: ticketData.event,
                type: ticketData.type,
                address: ticketData.address,
                category: ticketData.category,
                quantity: 1,
                amount: amount,
                status: 'initiated',
                razorpay_order_id: null // Will be updated below with its own ID
            }])
            .select('id')
            .single();

        if (regError || !reg) {
            console.error("Database Registration Error:", regError);
            return NextResponse.json({ success: false, message: "Failed to initiate registration" }, { status: 500 });
        }

        // 2. Update the record to set razorpay_order_id to the registration ID
        // This makes tracking easier as Paytm Order ID = Registration ID
        const { error: updateError } = await supabase
            .from('registrations')
            .update({ razorpay_order_id: reg.id })
            .eq('id', reg.id);

        if (updateError) {
            console.error("Failed to update razorpay_order_id:", updateError);
        }

        const mid = process.env.PAYTM_MID!;
        const mkey = process.env.PAYTM_MERCHANT_KEY!;
        const website = process.env.PAYTM_WEBSITE!;
        const host = process.env.PAYTM_HOST || 'https://securestage.paytmpayments.com';
        
        // Use registration ID as the Order ID
        const orderId = reg.id;
        const customerId = `CUST_${Date.now()}`;

        const paytmParams: any = {};
        paytmParams.body = {
            "requestType": "Payment",
            "mid": mid,
            "websiteName": website,
            "orderId": orderId,
            "callbackUrl": `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/verify-payment`,
            "txnAmount": {
                "value": amount.toString(),
                "currency": "INR",
            },
            "userInfo": {
                "custId": customerId,
                "mobile": ticketData.phone,
                "email": ticketData.email,
                "firstName": ticketData.name
            },
        };

        const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), mkey);
        
        paytmParams.head = {
            "signature": checksum
        };

        const post_data = JSON.stringify(paytmParams);

        // Call Paytm Initiate Transaction API
        const response = await fetch(`${host}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: post_data
        });

        const data = await response.json();

        if (data && data.body && data.body.txnToken) {
            return NextResponse.json({
                success: true,
                orderId: orderId,
                amount: Number(amount).toFixed(2),
                txnToken: data.body.txnToken,
                mid: mid,
                host: host
            }, { status: 200 });
        } else {
            console.error("Paytm Initiate Transaction Error:", JSON.stringify(data, null, 2));
            return NextResponse.json({ 
                success: false, 
                message: "Failed to initiate Paytm transaction", 
                details: data 
            }, { status: 400 });
        }

    } catch (error) {
        console.error("Create Order Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
