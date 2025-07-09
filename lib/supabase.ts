// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // 경로는 실제 위치에 맞게 조정

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
