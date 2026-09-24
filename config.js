require('dotenv').config();

const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
requiredVars.forEach((key) => {
    if (!process.env[key]){
        throw new Error(`Missing required environment variable: ${key}`);
    }
})

module.exports = {
    keys: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        publishable: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    }
}