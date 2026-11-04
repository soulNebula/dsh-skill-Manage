import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { javascriptAudit } from '../src/host/audit.js'
import { readSkillFile, resolveSkillDir, writeSkillFile } from '../src/host/files.js'

const GOOD = `---
name: sample-skill
description: A sample skill used by the tests.
---

# Sample
`

async function makeSkill() {
  const root = await mkdtemp(join(tmpdir(), 'skm-test-'))
  const folder = join(root, 'sample-skill')
  await mkdir(join(folder, 'references'), { recursive: true })
  await writeFile(join(folder, 'SKILL.md'), GOOD, 'utf8')
  await writeFile(join(folder, 'references', 'note.md'), '# Note\n', 'utf8')
  return { root, folder }
}

test('javascript audit accepts a well-formed skill folder', async () => {
  const { root, folder } = await makeSkill()
  try {
    const report = await javascriptAudit(folder)
    assert.equal(report.ok, true, report.errors.join('; '))
    assert.equal(report.name, 'sample-skill')
    assert.deepEqual(report.scaffolding, ['references'])
    assert.ok(report.files.count >= 2)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('javascript audit reports a missing SKILL.md', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skm-test-'))
  try {
    const report = await javascriptAudit(root)
    assert.equal(report.ok, false)
    assert.match(report.errors.join(' '), /SKILL\.md/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('resolveSkillDir requires an absolute folder with SKILL.md', async () => {
  const { root, folder } = await makeSkill()
  try {
    assert.equal(await resolveSkillDir(folder), folder)
    await assert.rejects(() => resolveSkillDir(root), /SKILL\.md/u)
    await assert.rejects(() => resolveSkillDir('relative-folder'), /absolute/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('file reads and writes stay inside the skill root', async () => {
  const { root, folder } = await makeSkill()
  try {
    const entry = { id: 'skm_abc123', path: folder }
    const file = await readSkillFile(entry, 'references/note.md')
    assert.match(file.text, /# Note/u)
    await writeSkillFile(entry, 'references/note.md', '# Changed\n')
    assert.equal((await readSkillFile(entry, 'references/note.md')).text, '# Changed\n')
    await assert.rejects(() => readSkillFile(entry, '../outside.md'), /outside|invalid/u)
    await assert.rejects(() => writeSkillFile(entry, 'SKILL.md/../x.md', 'x'), /outside|invalid/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
