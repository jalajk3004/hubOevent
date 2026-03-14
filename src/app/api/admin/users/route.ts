import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

export async function GET() {
    try {
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('registrations')
            .select('*, payments (paytm_payment_id, status, amount)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase fetch error:", error);
            return NextResponse.json({ success: false, message: "Database error" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            users: data
        }, { status: 200 });

    } catch (error) {
        console.error("Fetch Users Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
