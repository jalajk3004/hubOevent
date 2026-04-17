// Base URL for all Supabase Edge Functions.
// Derived from NEXT_PUBLIC_SUPABASE_URL by appending /functions/v1
// e.g. https://kxxnqiinkbqzjgohlnrx.supabase.co/functions/v1
export const EDGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
