// App database client — points at the project's own Supabase backend.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://boyywpdzhuzbaxohnxeu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OSYQ4JuD8BJfCXPBr3JiQg_SPPFilu6';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
