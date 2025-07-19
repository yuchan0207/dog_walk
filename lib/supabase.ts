// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
// lib/supabase.ts
import { Database } from './database.types'; // 또는 '../../lib/database.types' 등
// 경로는 실제 위치에 맞게 조정

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
