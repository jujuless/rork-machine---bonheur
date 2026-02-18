import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bfhtygvwmntcrdjyhdvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j4gif7kSrdaxyPOhW0qsuQ_0EnBNwqU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
