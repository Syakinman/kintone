Kintone 插件极速克隆备忘录
复制模板

复制 _template 文件夹，重命名为新插件名（例：plugin4）。

修改标识

修改新插件下的 package.json 中的 "name" 为新插件名。

根目录一键激活（无需 cd 进子目录）：

生成独立私钥：
pnpm --filter plugin4 keygen

pnpm install
日常开发与打包：

打包：pnpm --filter plugin4 build


