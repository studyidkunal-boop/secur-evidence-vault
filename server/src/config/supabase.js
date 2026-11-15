const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('⚠️ Supabase credentials missing: check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

/**
 * Initialize and export the Supabase admin client using the Service Role Key
 * (Bypasses RLS policies for server-side secure private bucket storage operations)
 */
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = supabase;

