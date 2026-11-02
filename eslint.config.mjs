// eslint.config.mjs
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    // ESLint 默认**不读** .gitignore，所以「不是插件源码」的路径得在这里显式排除，
    // 否则 `npx eslint .`（以及 VS Code 的 ESLint 扩展）会把它们一并扫进来：
    //   main.js = esbuild 产物（`npm run build` 生成，发版随 Release 上传，不入库），改它没有意义；
    //   vault/ testvault/ = 本地调试库，里面的插件副本是 `npm run deploy` 复制出来的同一份产物；
    //   Node 侧工具脚本（esbuild.config.mjs / version-bump.mjs / scripts/**）= 只在 Node 里跑的
    //     构建·发版·演示数据生成脚本，永远不进插件产物 —— obsidianmd 预设对它们整体不适用
    //     （console.log 是 CLI 的正常输出、node:fs 是正常依赖、`.obsidian` 是用户给的库路径），
    //     逐条豁免等于给 4 个文件各开 3 条规则，收益不抵维护成本，故按「不在检查范围」处理。
    //     lint 范围契约见 doc/ai_rules/lint.md §1（src / views / main.ts）。
    ignores: [
      "main.js",
      "node_modules/**",
      "vault/**",
      "testvault/**",
      "esbuild.config.mjs",
      "version-bump.mjs",
      "scripts/**",
    ],
  },
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // eslint.config.mjs 自己是扁平配置、views/obsidianResolve.mjs 是 `node --test` 的模块解析钩子，
          // 两者都不在 tsconfig 的 include 里，不登记进来 lint 直接报 "was not found by the project service"
          // 的解析错误（整个文件等于没检查）。
          allowDefaultProject: ["eslint.config.*", "views/obsidianResolve.mjs"],
        },
      },
    },
    rules: {
      // example: turn off a rule from the recommended set
      "obsidianmd/sample-names": "off",
    },
  },
  {
    // 单测与测试基建跑在 Node 里（node:test / node:assert / node:fs；`views/obsidianResolve.mjs`
    // 是 `node --test` 的 ESM 解析钩子），都不经过 Obsidian webview；且 describe() / test()
    // 返回 thenable、生命周期由 Node 测试运行器统一调度 —— 这两条规则对测试范围不适用
    // （行内 disable 会被 eslint-comments/no-restricted-disable 判成新的 error，见 doc/ai_rules/lint.md）。
    files: ["**/*.test.ts", "views/obsidianResolve.mjs"],
    rules: {
      "obsidianmd/no-nodejs-modules": "off",
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
  {
    // src/engine 是零 Obsidian 依赖的纯 TS 引擎：既被打进 webview，也要在 Node 下跑测试，
    // 取 crypto 只能用 globalThis（window / activeWindow 在 Node 里不存在）。
    files: ["src/engine/**/*.ts"],
    rules: {
      "obsidianmd/no-global-this": "off",
      // types.ts 里的 tags / estimate / relations / links / file / WfLink 是「旧文件仍要能读」
      // 而刻意保留的弃用字段，引擎（含 fixture）必须继续读写它们，故引擎层关闭该规则。
      // 若将来新增与兼容无关的弃用项，请改回 "warn" 后逐处治理。
      "@typescript-eslint/no-deprecated": "off",
    },
  },
]);