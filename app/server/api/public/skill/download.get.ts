import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { resolve } from 'path'

export default defineEventHandler(async (event) => {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Track download — fire-and-forget
  supabase.from('skill_downloads').insert({ skill_name: 'koryla' }).then()

  const filePath = resolve(process.cwd(), '../docs/claude-skill/koryla.md')
  const content = await readFile(filePath, 'utf-8')

  setResponseHeaders(event, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Content-Disposition': 'attachment; filename="koryla.md"',
  })

  return content
})
