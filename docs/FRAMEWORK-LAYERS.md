# 框架层映射（framework pack v1）

本项目由 `C:\Users\Administrator\Desktop\dsh-plugin-product-framework` 的 **framework pack v1** 生成/对齐；根目录的 `.framework.json` 记录框架 id、变量和使用的层。

| 层 | 本项目的对应文件 | 说明 |
| --- | --- | --- |
| `00-base` | `package.json`、`cordis.patch.yml`、`tsdown.config.mjs`、`README.md`、`AGENTS.md`、`.gitignore`、`.npmrc` | 工程底座 |
| `10-core` | `src/core/ids.js`、`src/core/model.js`、`src/core/config.js` | 纯逻辑，无 Node/DOM |
| `20-host` | `src/host/store.js`、`audit.js`、`files.js`、`rpc.js`、`runtime.js`、`errors.js`、`features/skills.js`、`src/index.js` | 存储、校验、文件围栏、RPC、技能/命令生命周期 |
| `30-agent` | `src/agent.js` + `cordis.patch.yml` 的 preset 行 | 只读工具 `skm_skills` / `skm_read` |
| `40-ui` | `src/client.jsx`、`src/ui/**` | 侧栏入口、全页、设置弹窗、文件编辑器 |
| `50-tests` | `tests/**` | core / rpc / 文件围栏 / 服务 / 打包契约 |
| `60-http` | 未使用 | 本插件没有二进制上传或流式路由 |

## 与框架模板的差异（有意保留）

新框架的 `40-ui/api.js`、`20-host/rpc.js` 仍是旧契约（空 payload 不补 `{}`、只认 `principal === 'owner'`）。本项目已经按本机 DSH 0.2.1 的真实行为修正：

- 无参数 RPC 统一发送 `{}`；
- owner 校验同时接受 `principal.kind === 'owner'`；
- 主题 token 使用 `--dsw-alias-bg-base`、`--dsw-alias-label-primary-inverted` 等真实变量；
- 增加设置弹窗、字号缩放、配置文件编辑。

这些修复不回退到框架模板版本。新框架的 `jobs/llm/generate` 是模型生成/长任务演示模块；本插件的导入/校验是本地文件操作，没有模型调用，因此未保留这些空模块（README 的「关于框架结构审计」有说明）。

## 更新这个技能本身

桌面上的 `dsh-plugin-product-framework` 是被「小鱼的技能」引用的技能，不复制到本项目。框架文件更新后：

- 在插件页选中该技能，点「重新读取」即可刷新 `SKILL.md` / 描述 / 命令；
- 或完全退出 DSH 再打开，插件会按磁盘上的最新内容重新注册。

最新框架包另外提供了制作指南；本插件把它放到 `docs/SKILL-AUTHORING-GUIDE.md`，并在「添加 Skill」弹窗里内置了阅读入口。旧内容备份在 `docs/archive/skill-authoring-guide-2026-11-06.md`，不再被代码引用。
