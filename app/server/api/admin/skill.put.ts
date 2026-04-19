import { serverSupabaseUser } from '#supabase/server'
import { writeFile } from 'fs/promises'
import { resolve } from 'path'

const ADMIN_EMAIL = 'andresclua@gmail.com'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || user.email !== ADMIN_EMAIL) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const { content } = await readBody(event)
  if (!content || typeof content !== 'string') {
    throw createError({ statusCode: 400, message: 'content is required' })
  }

  const filePath = resolve(process.cwd(), '..', 'docs', 'claude-skill', 'koryla.md')
  await writeFile(filePath, content, 'utf-8')
  return { ok: true }
})
