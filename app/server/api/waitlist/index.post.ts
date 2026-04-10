import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { email } = await readBody(event)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, message: 'Valid email required' })
  }

  const config = useRuntimeConfig()
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    config.supabaseServiceKey,
  )

  const { error } = await supabase
    .from('waitlist')
    .insert({ email: email.toLowerCase().trim() })

  if (error) {
    if (error.code === '23505') {
      // Already on waitlist — return success silently
      return { ok: true }
    }
    throw createError({ statusCode: 500, message: 'Failed to join waitlist' })
  }

  return { ok: true }
})
