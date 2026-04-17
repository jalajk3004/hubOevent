# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (http://localhost:3000)
npm run build     # Production build
npm run start     # Run production build
npm run lint      # Run ESLint
```

## Architecture Overview

HubO Events is a **Next.js App Router** event ticketing platform. All pages and API routes live under `src/app/`.

### Key Data Flow

1. User fills checkout form → `POST /api/create-order` creates a "initiated" registration in Supabase and returns a gateway token
2. Frontend launches Razorpay/Paytm checkout using that token
3. Payment result hits `POST /api/verify-payment` (callback) or `POST /api/webhook` (Razorpay webhook)
4. Backend verifies signature, updates registration status to `paid`/`failed`, sends WhatsApp ticket via Meta Cloud API

### Backend (`src/app/api/`)

| Route | Purpose |
|---|---|
| `register/` | Direct registration without payment |
| `create-order/` | Initiate payment (Razorpay or Paytm) |
| `verify-payment/` | Handle payment callback from both gateways |
| `webhook/` | Razorpay webhook handler |
| `ticket/[id]/` | Retrieve ticket details |
| `admin/login|logout` | JWT auth (HTTP-only cookie, 1-day TTL) |
| `admin/users/` | List registrations joined with payments |
| `admin/users/[id]/` | Update user details |
| `admin/stats/` | Revenue/ticket analytics |
| `admin/resend-ticket/` | Resend ticket via WhatsApp/email |

All `admin/*` routes are protected by `verifyAdmin()` in `src/lib/auth.ts` (JWT verification).

### Database (Supabase)

No ORM — raw Supabase JS client (`src/lib/supabase.ts`). Two main tables:
- **`registrations`**: `id`, `name`, `email`, `phone`, `address`, `category`, `amount`, `status` (`initiated`/`paid`/`failed`), payment IDs, `created_at`
- **`payments`**: `id`, `registration_id`, payment gateway IDs, `amount`, `status`, `created_at`

Schema is managed directly in the Supabase dashboard; no migration files exist.

### Payment Gateways

Both Razorpay and Paytm are supported with fallback logic (if one fails, the other is tried). Gateway selection returns a discriminator field `gateway: 'razorpay' | 'paytm'` so the frontend knows which SDK to invoke.

- **Razorpay**: HMAC-SHA256 signature verification using `RAZORPAY_KEY_SECRET`
- **Paytm**: Checksum verification via `paytm-checksum` package + status API query

### Notifications

`src/lib/whatsapp.ts` calls Meta Graph API v22.0 directly via `axios`. Template name: `ticket_confirmation`. Variables: `name`, `ticket_id`, `venue`.

### Frontend Structure

- `src/app/page.tsx` — Home page composing sections from `src/components/home/`
- `src/app/checkout/` — Payment form; dynamically loads Razorpay script or submits Paytm form
- `src/app/admin/` — Admin dashboard (login + data table + stats)
- `src/components/blocks/scroll-expansion-hero.tsx` — Video hero with GSAP/Three.js scroll animation
- UI primitives come from **shadcn/ui** (Radix Nova style); add components with `npx shadcn@latest add <component>`

### Path Aliases

`@/*` maps to `src/*` (configured in `tsconfig.json`).

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase connection |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay server-side |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay client-side checkout |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook verification |
| `PAYTM_MID` / `PAYTM_MERCHANT_KEY` / `PAYTM_WEBSITE` / `PAYTM_HOST` | Paytm gateway |
| `META_WA_ACCESS_TOKEN` / `META_WA_PHONE_NUMBER_ID` | WhatsApp Cloud API |
| `JWT_SECRET` | Admin JWT signing key |
| `NEXT_PUBLIC_APP_URL` | Base URL for redirects |
