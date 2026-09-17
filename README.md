添加工程内全局共享依赖参考

安装项目依赖(-w  =` 强制装到 workspace 根目录 不加 -w = 装到当前 package`)

pnpm add -w @kintone/rest-api-client@^6.2.1

安装程序开发依赖 ( -D = 放进 devDependencies)

pnpm add -Dw vite@^8.3.0 typescript@^7.0.2 @types/node@^22.20.2

-w  = dependencies 项目依赖 workspace 根目录
-D  = devDependencies 开发依赖
