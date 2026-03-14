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
            .select('amount, type, category, status');

        if (error) {
            console.error("Supabase stats error:", error);
            return NextResponse.json({ success: false, message: "Database error" }, { status: 500 });
        }

        // Calculate stats client/edge side
        // Total revenue from all 'paid' payments
        const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select('amount, status')
            .eq('status', 'paid');

        if (paymentsError) {
            console.error("Supabase payments stats error:", paymentsError);
        }

        const totalRevenue = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const totalTicketsSold = (payments || []).length;
        const totalRegistrations = data.length;

        const categoryCounts = data.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            success: true,
            stats: {
                totalRevenue,
                totalTicketsSold,
                totalRegistrations,
                categoryCounts
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
