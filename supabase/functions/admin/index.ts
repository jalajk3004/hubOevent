import { handleOptions, json } from '../_shared/cors.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { sendWhatsAppTicket } from '../_shared/whatsapp.ts';
// deno-lint-ignore-file no-explicit-any
import jwt from 'npm:jsonwebtoken@9';

const ADMIN_EMAIL = 'jalajkumar23989@gmail.com';
const ADMIN_PASSWORD = 'jalaj';

function getJwtSecret() {
  return Deno.env.get('JWT_SECRET') || 'fallback_secret_for_development';
}

function verifyToken(req: Request): boolean {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { role: string };
    return decoded.role === 'admin';
  } catch {
    return false;
  }
}

// Parse sub-path: /functions/v1/admin/users → 'users'
//                 /functions/v1/admin/users/123 → 'users/123'
function subPath(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // parts: ['functions', 'v1', 'admin', ...rest]
  return parts.slice(3).join('/');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  const path = subPath(req);
  const method = req.method;

  // ── POST /admin/login ──────────────────────────────────────────────────────
  if (path === 'login' && method === 'POST') {
    try {
      const { email, password } = await req.json();
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return json({ success: false, message: 'Invalid credentials' }, 401);
      }
      const token = jwt.sign({ role: 'admin' }, getJwtSecret(), { expiresIn: '1d' });
      return json({ success: true, token });
    } catch {
      return json({ success: false, message: 'Internal server error' }, 500);
    }
  }

  // All routes below require auth
  if (!verifyToken(req)) {
    return json({ success: false, message: 'Unauthorized' }, 401);
  }

  // ── GET /admin/stats ───────────────────────────────────────────────────────
  if (path === 'stats' && method === 'GET') {
    try {
      const [{ data: regs }, { data: payments }] = await Promise.all([
        supabase.from('registrations').select('amount, category, status'),
        supabase.from('payments').select('amount, status').eq('status', 'paid'),
      ]);

      const totalRevenue = (payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const totalTicketsSold = (payments || []).length;
      const totalRegistrations = (regs || []).length;
      const categoryCounts = (regs || []).reduce((acc: Record<string, number>, r: any) => {
        acc[r.category] = (acc[r.category] || 0) + 1;
        return acc;
      }, {});

      return json({ success: true, stats: { totalRevenue, totalTicketsSold, totalRegistrations, categoryCounts } });
    } catch (err) {
      console.error('stats error:', err);
      return json({ success: false, message: 'Internal server error' }, 500);
    }
  }

  // ── GET /admin/users ───────────────────────────────────────────────────────
  if (path === 'users' && method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*, payments (paytm_payment_id, status, amount)')
        .order('created_at', { ascending: false });

      if (error) return json({ success: false, message: 'Database error' }, 500);
      return json({ success: true, users: data });
    } catch (err) {
      console.error('users error:', err);
      return json({ success: false, message: 'Internal server error' }, 500);
    }
  }

  // ── PATCH /admin/users/:id ─────────────────────────────────────────────────
  if (path.startsWith('users/') && method === 'PATCH') {
    try {
      const id = path.split('/')[1];
      const updates = await req.json();

      const { error } = await supabase
        .from('registrations')
        .update(updates)
        .eq('id', id);

      if (error) return json({ success: false, message: 'Update failed' }, 500);
      return json({ success: true });
    } catch (err) {
      console.error('user update error:', err);
      return json({ success: false, message: 'Internal server error' }, 500);
    }
  }

  // ── POST /admin/resend-ticket ──────────────────────────────────────────────
  if (path === 'resend-ticket' && method === 'POST') {
    try {
      const { registrationId } = await req.json();
      if (!registrationId) return json({ success: false, message: 'Registration ID required' }, 400);

      const { data: user, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', registrationId)
        .single();

      if (error || !user) return json({ success: false, message: 'User not found' }, 404);
      if (user.status !== 'paid') return json({ success: false, message: 'Cannot resend for unpaid registration' }, 400);

      await sendWhatsAppTicket(user.phone, {
        name: user.name,
        event: user.event || 'dhurandhar',
        ticketId: user.paytm_payment_id || user.id,
        venue: 'lajpat',
      });

      return json({ success: true, message: 'Ticket resent successfully' });
    } catch (err) {
      console.error('resend-ticket error:', err);
      return json({ success: false, message: 'Internal server error' }, 500);
    }
  }

  return json({ success: false, message: 'Not found' }, 404);
});
