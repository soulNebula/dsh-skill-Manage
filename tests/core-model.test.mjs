import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isCommandName,
  isSafeRelativePath,
  isSkillName,
  isTextPath,
  normalizeRelativePath,
  normalizeSkillDocument,
  parseFrontmatter,
} from '../src/core/model.js'

const GOOD = `---
name: my-skill
description: >-
  A short description
  that folds onto one line.
whenToUse: When a test needs a skill.
---

# My skill

Body text.
`

test('parses folded and literal frontmatter scalars', () => {
  const { data, hasFrontmatter } = parseFrontmatter(GOOD)
  assert.equal(hasFrontmatter, true)
  assert.equal(data.name, 'my-skill')
  assert.equal(data.description, 'A short description that folds onto one line.')
  assert.equal(data.whenToUse, 'When a test needs a skill.')

  const literal = parseFrontmatter('---\ndescription: |\n  line one\n  line two\n---\nbody')
  assert.equal(literal.data.description, 'line one\nline two')
})

test('normalizes a valid SKILL.md', () => {
  const doc = normalizeSkillDocument(GOOD)
  assert.equal(doc.name, 'my-skill')
  assert.equal(doc.body.trim(), '# My skill\n\nBody text.')
})

test('rejects a missing frontmatter, name or description', () => {
  assert.throws(() => normalizeSkillDocument('# no frontmatter'), /frontmatter/)
  assert.throws(() => normalizeSkillDocument('---\ndescription: x\n---\n'), /frontmatter\.name/)
  assert.throws(() => normalizeSkillDocument('---\nname: my-skill\n---\n'), /description/)
})

test('skill and command names are kebab-case', () => {
  assert.equal(isSkillName('my-skill'), true)
  assert.equal(isSkillName('my_skill'), false)
  assert.equal(isSkillName('My-Skill'), false)
  assert.equal(isCommandName('my-skill'), true)
})

test('relative paths reject traversal and absolute forms', () => {
  assert.equal(normalizeRelativePath('references\\00-map.md'), 'references/00-map.md')
  assert.equal(normalizeRelativePath('./SKILL.md'), 'SKILL.md')
  for (const bad of ['../secret', 'a/../../b', '/etc/passwd', 'C:\\Windows\\win.ini', '', 'a//..//b']) {
    assert.equal(isSafeRelativePath(bad), false, bad)
  }
})

test('text editor extensions are conservative', () => {
  assert.equal(isTextPath('SKILL.md'), true)
  assert.equal(isTextPath('references/01.md'), true)
  assert.equal(isTextPath('scripts/scaffold.mjs'), true)
  assert.equal(isTextPath('assets/logo.png'), false)
  assert.equal(isTextPath('LICENSE'), true)
  assert.equal(isTextPath('.gitignore'), true)
})
