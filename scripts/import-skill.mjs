#!/usr/bin/env node
// Seed the plugin's config from the command line, without starting DSH.
// Useful for scripted setup and for verifying an import before opening the UI.
//
//   node scripts/import-skill.mjs "C:/path/to/my-skill" [--command my-command] [--python C:/Python314/python.exe] [--data-dir dsh-skill-manage]
import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'

import { configEntry, normalizeConfig } from '../src/core/config.js'
import { newId } from '../src/core/ids.js'
import { cleanText, isCommandName, normalizeSkillDocument, SKILL_FILE } from '../src/core/skill.js'
import { auditSkill } from '../src/host/audit.js'
import { resolveSkillDir } from '../src/host/files.js'
import { createStore, resolveDshHome } from '../src/host/store.js'

function parseArgs(argv) {
  const out = { flags: {}, path: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = argv[index + 1]
      if (value === undefined || value.startsWith('--')) {
        console.error(`import-skill: ${arg} needs a value`)
        process.exit(1)
      }
      out.flags[key] = value
      index += 1
    } else if (!out.path) {
      out.path = arg
    }
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
if (!args.path) {
  console.error('usage: node scripts/import-skill.mjs <absolute-skill-folder> [--command name] [--python path] [--data-dir dir]')
  process.exit(1)
}

const folder = await resolveSkillDir(args.path)
const report = await auditSkill(folder, { pythonPath: args.flags.python ?? '' })
if (!report.ok) {
  console.error(`import-skill: ${report.errors.join(' | ')}`)
  process.exit(1)
}

const doc = normalizeSkillDocument(await readFile(join(folder, SKILL_FILE), 'utf8'))
const command = String(args.flags.command ?? doc.name).trim()
if (!isCommandName(command)) {
  console.error('import-skill: --command must be kebab-case (a-z, 0-9, hyphen)')
  process.exit(1)
}

const dataDir = String(args.flags['data-dir'] ?? 'dsh-skill-manage').trim()
const root = isAbsolute(dataDir) ? dataDir : join(resolveDshHome(), dataDir)
const store = createStore({ root })
const config = normalizeConfig(await store.loadConfig())
if (config.skills.some(entry => entry.path.toLowerCase() === folder.toLowerCase())) {
  console.error(`import-skill: already imported: ${folder}`)
  process.exit(1)
}
if (config.skills.some(entry => entry.name === doc.name)) {
  console.error(`import-skill: a skill named "${doc.name}" already exists`)
  process.exit(1)
}
if (config.skills.some(entry => entry.command === command)) {
  console.error(`import-skill: command /${command} is already used`)
  process.exit(1)
}

const entry = {
  id: newId('skm'),
  name: doc.name,
  description: cleanText(doc.description, 4096),
  path: folder,
  command,
  menuEnabled: true,
  addedAt: Date.now(),
}
config.skills.push(entry)
await store.saveConfig({
  version: 1,
  updatedAt: Date.now(),
  skills: config.skills.map(configEntry),
})

console.log(JSON.stringify({
  imported: true,
  id: entry.id,
  name: entry.name,
  command: entry.command,
  path: entry.path,
  configPath: store.paths.config,
  audit: { engine: report.engine, warnings: report.warnings, files: report.files },
}, null, 2))
