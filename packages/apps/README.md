上传自定义html到kintone一览备忘

环境准备

在子目录的package.json里面添加下面两项

```json
  "scripts": {
    "views": "kintone-views-sai"
  },
  "devDependencies": {
    "kintone-views-sai": "workspace:*"
  }
```
