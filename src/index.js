// Host entry of Skill 管理 (dsh-skill-manage).
//
// Wires the JSON store, the managed-skill service, the RPC channel used by the
// page, and the runtime bridge used by the read-only agent tools. Every live
// registration lives inside an effect so uninstalling the plugin releases it.
import { isAbsolute, join } from 'node:path'

import { createUserMessage } from '@deepseek-ai/dsh-llm'
import z from '@deepseek-ai/schemastery'

import { auditSkill } from './host/audit.js'
import { AppError } from './host/errors.js'
import { createSkillsService } from './host/features/skills.js'
import { resolveSkillDir } from './host/files.js'
import { createRpcHandler } from './host/rpc.js'
import { publishRuntime } from './host/runtime.js'
import { createStore, resolveDshHome } from './host/store.js'

export const name = 'dsh-skill-manage'
export const VERSION = '0.2.0'
export const CHANNEL = '/skill-manage'

export const Config = z.object({
  dataDir: z.string().default(''),
  pythonPath: z.string().default(''),
})

function resolveDataRoot(dataDir) {
  const text = String(dataDir ?? '').trim()
  if (text && isAbsolute(text)) return text
  const safe = text && /^[A-Za-z0-9._ -]+$/u.test(text) ? text : 'dsh-skill-manage'
  return join(resolveDshHome(), safe)
}

export function apply(ctx, config = {}) {
  const logger = ctx.logger
  const pythonPath = String(config?.pythonPath ?? '').trim()
  const store = createStore({ root: resolveDataRoot(config?.dataDir) })
  const skills = createSkillsService({ store, logger, pythonPath, version: VERSION, createUserMessage })

  const ready = skills.load().catch(error => {
    logger?.error?.('skill-manage: initial load failed: %s', error?.message)
    return 0
  })

  async function settled() {
    await ready
  }

  const routes = {
    'app/info': async () => {
      await settled()
      return skills.info()
    },
    'skill/list': async () => {
      await settled()
      return skills.list()
    },
    'settings/get': async () => {
      await settled()
      return skills.getSettings()
    },
    'settings/save': async payload => {
      await settled()
      return skills.saveSettings(payload)
    },
    'config/read': async () => {
      await settled()
      return skills.readConfig()
    },
    'config/write': async payload => {
      await settled()
      return skills.writeConfig(payload)
    },
    'skill/audit-path': async payload => {
      const dir = await resolveSkillDir(payload?.path)
      const report = await auditSkill(dir, { pythonPath, logger })
      return { report, path: dir }
    },
    'skill/add': async payload => {
      await settled()
      return skills.add(payload)
    },
    'skill/remove': async payload => {
      await settled()
      return skills.remove(payload)
    },
    'skill/update': async payload => {
      await settled()
      return skills.update(payload)
    },
    'skill/reload': async payload => {
      await settled()
      return skills.reload(payload)
    },
    'skill/audit': async payload => {
      await settled()
      return skills.audit(payload)
    },
    'files/tree': async payload => {
      await settled()
      return skills.tree(payload)
    },
    'files/read': async payload => {
      await settled()
      return skills.readFile(payload)
    },
    'files/write': async payload => {
      await settled()
      return skills.writeFile(payload)
    },
  }
  const handler = createRpcHandler(routes, { logger })

  ctx.inject(['skills'], skillCtx => {
    skills.setSkills(skillCtx.skills)
    skillCtx.effect(() => () => skills.setSkills(undefined), 'skill-manage: skills service')
  })

  ctx.inject(['commands'], commandCtx => {
    skills.setCommands(commandCtx.commands)
    commandCtx.effect(() => () => skills.setCommands(undefined), 'skill-manage: commands service')
  })

  // Shipped Connection versions read webServer from the caller's context;
  // register with this injected context so a first hot install mounts the
  // channel.
  ctx.inject(['connection', 'webServer'], connectionCtx => {
    const connection = connectionCtx.connection
    connectionCtx.effect(
      () => (typeof connection.register === 'function'
        ? connection.register(connectionCtx, CHANNEL, handler)
        : connection.rpc.handle(CHANNEL, handler)),
      'skill-manage: rpc channel',
    )
  })

  ctx.effect(() => publishRuntime({ skills, ready }), 'skill-manage: runtime')
  ctx.effect(() => () => skills.dispose(), 'skill-manage: registrations')
}

export { AppError }
