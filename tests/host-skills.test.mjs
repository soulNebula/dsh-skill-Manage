import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createSkillsService } from '../src/host/features/skills.js'
import { createStore } from '../src/host/store.js'

const SKILL = `---
name: alpha-skill
description: Alpha description.
---

# Alpha
`

function fakeServices() {
  const skills = new Map()
  const commands = new Map()
  return {
    skills: {
      map: skills,
      register(definition) {
        if (skills.has(definition.name)) throw new Error('duplicate skill')
        skills.set(definition.name, definition)
        return () => skills.delete(definition.name)
      },
    },
    commands: {
      map: commands,
      register(definition) {
        if (commands.has(definition.name)) throw new Error('duplicate command')
        commands.set(definition.name, definition)
        return () => commands.delete(definition.name)
      },
    },
  }
}

async function fixture() {
  const work = await mkdtemp(join(tmpdir(), 'skm-service-'))
  const dataRoot = join(work, 'data')
  const skillDir = join(work, 'skills', 'alpha-skill')
  await mkdir(skillDir, { recursive: true })
  await writeFile(join(skillDir, 'SKILL.md'), SKILL, 'utf8')
  const store = createStore({ root: dataRoot })
  const service = createSkillsService({
    store,
    logger: console,
    version: 'test',
    createUserMessage: input => ({ kind: 'test-user-message', ...input }),
  })
  await service.load()
  const fake = fakeServices()
  service.setSkills(fake.skills)
  service.setCommands(fake.commands)
  return { work, store, service, fake, skillDir }
}

test('add registers the skill, its command and persists the absolute path', async () => {
  const { work, store, service, fake, skillDir } = await fixture()
  try {
    const view = await service.add({ path: skillDir })
    assert.equal(view.name, 'alpha-skill')
    assert.equal(view.status, 'ok')
    assert.equal(view.commandStatus, 'active')
    assert.equal(view.path, skillDir)
    assert.ok(fake.skills.map.has('alpha-skill'))
    assert.ok(fake.commands.map.has('alpha-skill'))

    const config = await store.loadConfig()
    assert.equal(config.skills.length, 1)
    assert.equal(config.skills[0].path, skillDir)
    assert.equal(config.skills[0].command, 'alpha-skill')
  } finally {
    service.dispose()
    await rm(work, { recursive: true, force: true })
  }
})

test('the slash command injects the skill-loading instruction', async () => {
  const { work, service, fake, skillDir } = await fixture()
  try {
    await service.add({ path: skillDir })
    const handler = fake.commands.map.get('alpha-skill').handler
    const captured = []
    const result = handler({ rawInput: 'do the thing', agent: { followup: message => captured.push(message) } })
    assert.equal(result.kind, 'success')
    assert.equal(captured.length, 1)
    assert.match(captured[0].content[0].text, /alpha-skill/u)
    assert.match(captured[0].content[0].text, /do the thing/u)
    assert.equal(captured[0].source.kind, 'user')
  } finally {
    service.dispose()
    await rm(work, { recursive: true, force: true })
  }
})

test('menu toggle and command rename re-register live', async () => {
  const { work, service, fake, skillDir } = await fixture()
  try {
    const view = await service.add({ path: skillDir })
    await service.update({ id: view.id, menuEnabled: false })
    assert.equal(fake.commands.map.size, 0)

    const updated = await service.update({ id: view.id, menuEnabled: true, command: 'alpha-cmd' })
    assert.equal(updated.command, 'alpha-cmd')
    assert.ok(fake.commands.map.has('alpha-cmd'))
    assert.equal(fake.commands.map.has('alpha-skill'), false)
  } finally {
    service.dispose()
    await rm(work, { recursive: true, force: true })
  }
})

test('editing SKILL.md through the service refreshes name and description', async () => {
  const { work, service, fake, skillDir } = await fixture()
  try {
    const view = await service.add({ path: skillDir })
    const next = `---\nname: alpha-skill\ndescription: Beta description.\n---\n\n# Alpha\n`
    const result = await service.writeFile({ id: view.id, path: 'SKILL.md', content: next })
    assert.equal(result.skill.description, 'Beta description.')
    assert.equal(fake.skills.map.get('alpha-skill').content, next)
  } finally {
    service.dispose()
    await rm(work, { recursive: true, force: true })
  }
})

test('remove unregisters everything; deleteFiles removes the folder', async () => {
  const { work, store, service, fake, skillDir } = await fixture()
  try {
    const first = await service.add({ path: skillDir })
    await service.remove({ id: first.id })
    assert.equal(fake.skills.map.size, 0)
    assert.equal(fake.commands.map.size, 0)
    assert.equal((await store.loadConfig()).skills.length, 0)

    const second = await service.add({ path: skillDir })
    await service.remove({ id: second.id, deleteFiles: true })
    await assert.rejects(() => stat(skillDir))
    assert.equal((await readFile(join(work, 'data', 'config.json'), 'utf8')).includes('alpha-skill'), false)
  } finally {
    service.dispose()
    await rm(work, { recursive: true, force: true })
  }
})

test('settings and the raw config file round-trip through the service', async () => {
  const { work, service, fake, skillDir } = await fixture()
  try {
    const view = await service.add({ path: skillDir })
    const saved = await service.saveSettings({ fontSize: 18 })
    assert.equal(saved.fontSize, 18)

    const read = await service.readConfig()
    assert.ok(read.path.endsWith('config.json'))
    assert.match(read.text, /"fontSize": 18/u)

    const parsed = JSON.parse(read.text)
    parsed.skills[0].command = 'beta-cmd'
    const written = await service.writeConfig({ text: JSON.stringify(parsed, null, 1) })
    assert.equal(written.skills[0].command, 'beta-cmd')
    assert.ok(fake.commands.map.has('beta-cmd'))
    assert.equal(written.settings.fontSize, 18)

    await assert.rejects(() => service.writeConfig({ text: '{ not json' }), /JSON/u)
    await assert.rejects(
      () => service.writeConfig({ text: JSON.stringify({ ...parsed, skills: [...parsed.skills, { id: 'broken' }] }) }),
      /格式不正确/u,
    )
    assert.equal(view.id, written.skills[0].id)
  } finally {
    service.dispose()
    await rm(work, { recursive: true, force: true })
  }
})
