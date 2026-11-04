// Tools of the "Skill 管理" conversation preset.
// This file is a thin shell: validate arguments, call the host runtime, return
// a readable value. No store access, no session state, no writes.
import { defineTool } from '@deepseek-ai/dsh-tools'

import { getRuntime } from './host/runtime.js'

export const name = 'dsh-skill-manage-agent'
export const inject = ['tools', 'systemPrompt']

export const TOOL_LIST = 'skm_skills'
export const TOOL_READ = 'skm_read'

export const TOOL_GUIDE = `## Skill 管理 tools
- ${TOOL_LIST}: list the skills the user imported into Skill 管理 (name, folder, slash command, health).
- ${TOOL_READ}: read one UTF-8 file inside a managed skill, for example SKILL.md or references/01-architecture.md.
These tools are read-only. To add, remove or edit a skill, tell the user to use the Skill 管理 page (left sidebar).`

export function apply(ctx) {
  ctx.systemPrompt.section({
    name: 'dsh-skill-manage:tools',
    order: 2900,
    interpolate: false,
    text: TOOL_GUIDE,
  })

  ctx.tools.register(defineTool({
    name: TOOL_LIST,
    description: 'List every skill managed by the Skill 管理 plugin, including its folder, slash command and health.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          skills: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                name: { type: 'string', required: true },
                description: { type: 'string', required: true },
                path: { type: 'string', required: true },
                command: { type: 'string', required: true },
                menuEnabled: { type: 'boolean', required: true },
                status: { type: 'string', required: true },
              },
            },
          },
        },
      },
      render: (args, value) => [{
        type: 'text',
        text: value.skills.length
          ? value.skills.map(skill => `- ${skill.name} — /${skill.command} — ${skill.status} — ${skill.path}`).join('\n')
          : 'No skills are managed yet. Ask the user to import one on the Skill 管理 page.',
      }],
    },
    timeoutMs: 15_000,
    async execute() {
      const runtime = getRuntime()
      await runtime.ready
      return { skills: runtime.skills.agentList() }
    },
  }))

  ctx.tools.register(defineTool({
    name: TOOL_READ,
    description: 'Read one UTF-8 file inside a skill managed by the Skill 管理 plugin. Read SKILL.md first, then references it names.',
    parameters: {
      skill: { type: 'string', required: true, description: 'Skill name or id from skm_skills' },
      path: { type: 'string', required: true, description: 'Path relative to the skill folder, e.g. SKILL.md or references/01-architecture.md' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          path: { type: 'string', required: true },
          bytes: { type: 'number', required: true },
          truncated: { type: 'boolean', required: true },
          content: { type: 'string', required: true },
        },
      },
      render: (args, value) => [{
        type: 'text',
        text: `### ${value.name} · ${value.path}${value.truncated ? ' (truncated)' : ''}\n\n${value.content}`,
      }],
    },
    timeoutMs: 20_000,
    async execute(args) {
      const runtime = getRuntime()
      await runtime.ready
      return runtime.skills.agentRead({
        skill: String(args.skill ?? '').slice(0, 200),
        path: String(args.path ?? '').slice(0, 1024),
      })
    },
  }))
}
