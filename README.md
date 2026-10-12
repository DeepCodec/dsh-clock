# dsh-clock

DSH（DeepSeek Harness）Web 插件：在**底部状态栏**（composer dock）常驻显示当前日期与时间，提供**可视化配置**。

## 效果

聊天界面底部状态条（输入框下方，系统"上下文用量"旁边）显示：

```
2026年10月12日 星期一 · 15:21:08
```

默认每秒刷新，纯浏览器本地 `Date` 渲染。

## 可视化配置（推荐）

打开 **设置 → 通用 → 时钟**，直接点选/拨动即可，改动即时生效并持久化到**当前 profile 的 Cordis patch**（`cordis.patch.yml` 中 `dsh-clock` 行的 `config`）：

| 设置项 | 控件 | 说明 |
| --- | --- | --- |
| 显示内容 | 下拉菜单 | 日期 + 时间 / 仅日期 / 仅时间 |
| 显示星期几 | 开关 | 日期行是否含星期几 |
| 显示秒 | 开关 | 时间是否显示秒 |
| 刷新间隔（毫秒） | 数字输入 | 250–60000ms |

## 命令行配置（可选）

同样可在 profile 的 `cordis.patch.yml` 中预设默认值（就是可视化设置写入的同一层）：

```yaml
- id: dsh-clock
  name: dsh-clock
  config:
    mode: dateTime        # date | time | dateTime
    weekday: true         # 日期行是否含星期几
    showSeconds: true     # 时间是否显示秒
    intervalMs: 1000      # 刷新间隔（250–60000ms）
```

解析顺序（dsh-settings）：schema 默认值 → 继承的 composition 层 → 该 profile entry 的 `config`（用户设置写入的层）。

> 命名空间 = **profile entry id**：dsh-settings 以 `cordis.patch.yml` 中该行的 `id` 为 key，
> 因此 `dsh-clock` 既是设置命名空间，也是 `cordis.patch.yml` 里那一行的 `id`；
> 浏览器半用同一个 key 走 `ctx.configForms.get('dsh-clock')`。

## 实现

| 部分 | 文件 | 作用 |
| --- | --- | --- |
| 浏览器半 | `src/client/index.jsx` → `lib/client.js` | Clock 组件（dock 槽位）+ 设置行（settings.general.item） |
| 设置策略 | `src/client/clock-policy.js` | ClockPolicy：configForms 读写、clamp、host 采纳、dispose |
| 设置行组件 | `src/client/ClockSettingsRow.jsx` | 设置 → 通用 里的可视化配置行 |
| 共享设置定义 | `src/client/clock-settings.js` | 命名空间、字段键、默认值（纯数据） |
| 格式化 | `src/client/clock-core.js` | 日期/时间本地化格式化（纯函数） |
| 样式 | `src/client/styles.js` + `*.css` | `--dsw-*` token，`data-plugin-css` 协议注入 |
| 宿主半 | `src/index.ts` → `lib/index.js` | volatile `Config` + `settings.configure({ auto: false })` |
| 构建 | `build.mjs` | esbuild 双半构建（baseline external） |
| 测试 | `test/*.spec.mjs` | 浏览器注册/策略/格式 + 宿主 schema/注册 + 主题 token 校验（14 项） |

### 规范符合性（对照 `packages/client/AGENTS.md`）

- **Slot 纪律**：dock 槽位 + `settings.general.item` 槽位，组件经标准 props shares + inject 面拿数据，组件不见 `ctx`。
- **本地化**：文案全部走 `zh`/`en` 字典 + `t` seat（含设置面文案），无硬编码产品文案。
- **样式**：CSS 语义类 + `--dsw-*` token，无内联样式/无字面色值；`data-plugin-css` 幂等注入（HMR claimStyles 协议）。
- **导出纪律**：浏览器半只导出 `apply`/`inject`；宿主半导出 `name`/`Config`/`SETTINGS_NAMESPACE`/`apply`。
- **可视化设置**：官方 settings 命名空间 = profile entry id；宿主导出 `.volatile()` `Config` 并经
  `settings.configure({ auto: false })` 发布（自绘设置行，不自动生成页面），浏览器半经
  `ctx.configForms.get('dsh-clock')` 读写（与 `dsh-client-locale`、`dsh-client-ui-conversation` 同款范式）。
- **inject 纪律**：`inject` 只声明运行时**真实存在**的服务（`slots` / `locale` / `configForms`）。
  cordis fiber 会一直 pending 在一个不存在的服务上，而 web boot 审计会把 pending 当作启动失败、
  直接让整个 Web 页面引导失败——`settingsScope` 正是这个坑（DSH 里没有这个服务）。
- **依赖声明**：peerDependencies 只声明实际使用；浏览器 baseline 模块（`dsh-client-store` 等）external 由模块表提供。
- **容错**：浏览器半 apply 全程 try/catch；host 半嵌套 inject，无 settings provider 也照常激活。

## 开发

```sh
pnpm install          # autoInstallPeers=false
pnpm build            # 生成 lib/client.js + lib/index.js
pnpm test             # 构建 + 14 项测试
```

## 安装

**装成依赖还不够**：插件半必须在 profile 的 `dsh.profile.bundles` 里才会加载
（bundle 列表决定 `cordis.patch.yml` 里的 `insert` 是否生效）。

- Desktop：走 **设置 → 插件**（插件市场）安装/启用；`desktop` profile 由 Electron 应用独占管理，
  命令行 `dsh --profile desktop` 会被拒绝。
- 其他 profile：

```sh
dsh plugin --profile <name> add /Users/duls/Work/clock-dsh
```

（或手动 `cd ~/.dsh/profiles/<name> && pnpm add /Users/duls/Work/clock-dsh`，
并在 `package.json` 的 `dsh.profile.bundles` 里追加 `dsh-clock`。）重启 DSH Desktop 生效。

## 卸载

```sh
dsh plugin --profile <name> remove dsh-clock
```