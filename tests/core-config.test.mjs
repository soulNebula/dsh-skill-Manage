import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeConfig } from '../src/core/config.js'

function entry(overrides = {}) {
  return {
    id: 'skm_abc123',
    name: 'my-skill',
    description: 'A skill',
    path: 'C:\\Users\\me\\skills\\my-skill',
    command: 'my-skill',
    menuEnabled: true,
    addedAt: 1,
    ...overrides,
  }
}

test('normalizes a valid config entry', () => {
  const config = normalizeConfig({ version: 1, updatedAt: 5, skills: [entry()] })
  assert.equal(config.skills.length, 1)
  assert.deepEqual(config.skills[0], entry())
})

test('drops bad entries item by item', () => {
  const config = normalizeConfig({
    skills: [
      entry(),
      entry({ id: 'bad', name: 'other' }),
      entry({ id: 'skm_def456', name: 'Bad Name' }),
      entry({ id: 'skm_ghi789', name: 'third', path: 'relative/path' }),
      entry({ id: 'skm_jkl012', name: 'fourth', command: 'Bad Command' }),
    ],
  })
  assert.deepEqual(config.skills.map(item => item.name), ['my-skill'])
})

test('deduplicates by id, name and case-insensitive path', () => {
  const config = normalizeConfig({
    skills: [
      entry(),
      entry({ id: 'skm_abc124' }),
      entry({ id: 'skm_abc125', name: 'another', path: 'c:\\users\\me\\skills\\my-skill' }),
    ],
  })
  assert.equal(config.skills.length, 1)
})

test('menuEnabled defaults to true and command falls back to the name', () => {
  const config = normalizeConfig({ skills: [entry({ command: '', menuEnabled: undefined })] })
  assert.equal(config.skills[0].command, 'my-skill')
  assert.equal(config.skills[0].menuEnabled, true)
})
