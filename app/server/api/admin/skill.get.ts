import { serverSupabaseUser } from '#supabase/server'
import { readFile } from 'fs/promises'
import { resolve } from 'path'

const ADMIN_EMAIL = 'andresclua@gmail.com'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || user.email !== ADMIN_EMAIL) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const filePath = resolve(process.cwd(), '..', 'docs', 'claude-skill', 'koryla.md')
  const content = await readFile(filePath, 'utf-8')
  return { content }
})
