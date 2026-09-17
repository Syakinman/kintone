# kintone monorepo 迁移包

## 本阶段原则

- 只迁移，不优化业务逻辑。
- 保留原来的 kintone 事件、字段名、View 名和 HTML/CSS。
- `支払登録.html` 中原本存在但旧 JS 未实现的 `loadMore` 仍然不补实现。
- `showSpinner()` / `hideSpinner()` 在提供的旧源码中没有定义，因此继续按现有全局函数处理。
- `trading-input` 从 Vue 3 Options API 改为 Composition API，但功能流程保持一致。
- Vuetify 3.3.23 从 CDN 改为 npm 依赖并打进 Vite bundle。
- Vue/dayjs/SweetAlert2/@kintone/rest-api-client 从全局变量改为模块 import。

## 覆盖到现有 App

把本目录中的：

- `src/`
- `views/`
- `vite.config.ts`

复制到你从 `_template` 创建出来的真实 App 中。

现有 App 自己的这些文件继续保留：

- `package.json`（只合并依赖，不整份覆盖）
- `customize-manifest.json`
- `tsconfig.json`
- `src/types/fields.d.ts`（运行 `pnpm -F <app> dts` 重新生成）

## package.json 需要合并的 dependencies

见 `package.dependencies.json`。

因为这些库都是当前 App 源码直接 import 的运行时依赖，建议声明在当前 child package 的 `dependencies` 中。

## Chatwork Token

旧源码把 Token 直接写在 JS 中。迁移包没有复制该敏感值。

在真实 App 下创建 `.env.local`：

```env
VITE_CHATWORK_TOKEN=<原来的 Token>
```

并确保 `.env.local` 被 Git 忽略。

## View

以下 HTML 本次按原文件保留：

- `views/view.html`
- `views/支払登録.html`
- `views/支払一覧.html`

因此你现有的 `kintone-views-sai` 工作流可以继续使用。

## 建议迁移顺序

1. 合并 child package dependencies。
2. `pnpm install`
3. 覆盖 `src/` / `views/` / `vite.config.ts`
4. 创建 `.env.local`
5. `pnpm -F <app> dts`
6. `pnpm -F <app> build`
7. 在测试环境验证后再 `upload` / `views`

## 本阶段故意不处理的旧问题

- `支払登録.html` 的 `loadMore` 没有对应旧 JS 实现。
- `showSpinner()` / `hideSpinner()` 来源不在此次提供的源码中。
- DOM 查询、重复事件监听、Vue App 重复 mount 等潜在稳定性问题暂不优化。
- Chatwork Token 仍属于浏览器端可见凭据；真正保密需要服务端代理，留到后续优化。
