import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Missing SUPABASE_URL or SUPABASE_ANON_KEY. Add them to your .env file.'
    )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
