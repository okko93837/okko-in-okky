import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/** 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** 서버(API Route)용 Supabase 클라이언트 — RLS 우회 */
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
