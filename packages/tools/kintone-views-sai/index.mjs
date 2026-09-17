import { KintoneRestAPIClient } from '@kintone/rest-api-client';

import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';

import {
  basename,
  dirname,
  extname,
  join,
  resolve,
} from 'node:path';

import { loadEnvFile } from 'node:process';

// --------------------------------------------------
// 查找 monorepo 根目录的 .env
// --------------------------------------------------

function findEnvFile(startDir) {
  let currentDir = startDir;

  while (true) {
    const envPath = join(currentDir, '.env');

    if (existsSync(envPath)) {
      return envPath;
    }

    const parentDir = dirname(currentDir);

    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

// --------------------------------------------------
// 清理 getViews 返回的数据
//
// updateViews 不需要 id 等只读属性。
// 这里只保留 Update Views API 支持的属性。
// --------------------------------------------------

function normalizeView(view) {
  const normalized = {
    type: view.type,
    index: view.index,
  };

  if (view.type === 'LIST') {
    if (view.fields) {
      normalized.fields = view.fields;
    }
  }

  if (view.type === 'CALENDAR') {
    if (view.date !== undefined) {
      normalized.date = view.date;
    }

    if (view.title !== undefined) {
      normalized.title = view.title;
    }
  }

  if (view.type === 'CUSTOM') {
    if (view.html !== undefined) {
      normalized.html = view.html;
    }

    if (view.pager !== undefined) {
      normalized.pager = view.pager;
    }

    if (view.device !== undefined) {
      normalized.device = view.device;
    }
  }

  if (view.filterCond !== undefined) {
    normalized.filterCond = view.filterCond;
  }

  if (view.sort !== undefined) {
    normalized.sort = view.sort;
  }

  return normalized;
}

// --------------------------------------------------
// main
// --------------------------------------------------

async function main() {
  const projectDir = process.cwd();

  // -------------------------------
  // .env
  // -------------------------------

  const envPath = findEnvFile(projectDir);

  if (!envPath) {
    throw new Error(
      '找不到 .env 文件',
    );
  }

  loadEnvFile(envPath);

  const {
    KINTONE_BASE_URL,
    KINTONE_USERNAME,
    KINTONE_PASSWORD,
  } = process.env;

  if (
    !KINTONE_BASE_URL ||
    !KINTONE_USERNAME ||
    !KINTONE_PASSWORD
  ) {
    throw new Error(
      '.env 中缺少 KINTONE_BASE_URL / KINTONE_USERNAME / KINTONE_PASSWORD',
    );
  }

  // -------------------------------
  // manifest
  // -------------------------------

  const manifestPath = resolve(
    projectDir,
    'customize-manifest.json',
  );

  if (!existsSync(manifestPath)) {
    throw new Error(
      '找不到 customize-manifest.json',
    );
  }

  const manifest = JSON.parse(
    readFileSync(manifestPath, 'utf8'),
  );

  const app = Number(manifest.app);

  if (!Number.isInteger(app) || app <= 0) {
    throw new Error(
      `无效的 app ID: ${manifest.app}`,
    );
  }

  // -------------------------------
  // views/
  // -------------------------------

  const viewsDir = resolve(
    projectDir,
    'views',
  );

  if (!existsSync(viewsDir)) {
    throw new Error(
      '找不到 views 目录',
    );
  }

  const htmlFiles = readdirSync(viewsDir)
    .filter(
      (file) =>
        extname(file).toLowerCase() === '.html',
    );

  if (htmlFiles.length === 0) {
    console.log('views 目录没有 HTML 文件。');
    return;
  }

  // -------------------------------
  // client
  // -------------------------------

  const client = new KintoneRestAPIClient({
    baseUrl: KINTONE_BASE_URL,

    auth: {
      username: KINTONE_USERNAME,
      password: KINTONE_PASSWORD,
    },
  });

  console.log('');
  console.log(`App ID: ${app}`);
  console.log(`Views: ${htmlFiles.length}`);
  console.log('');

  // -------------------------------
  // 获取 pre-live views
  // -------------------------------

  const current = await client.app.getViews({
    app,
    preview: true,
  });

  const views = {};

  for (
    const [viewName, view]
    of Object.entries(current.views)
  ) {
    views[viewName] = normalizeView(view);
  }

  // -------------------------------
  // 计算新的 index
  // -------------------------------

  const indexes = Object.values(views)
    .map((view) => Number(view.index))
    .filter(Number.isFinite);

  let nextIndex =
    indexes.length > 0
      ? Math.max(...indexes) + 1
      : 0;

  // -------------------------------
  // HTML → 自定义视图
  // -------------------------------

  for (const file of htmlFiles) {
    const viewName = basename(
      file,
      extname(file),
    );

    const htmlPath = join(
      viewsDir,
      file,
    );

    const html = readFileSync(
      htmlPath,
      'utf8',
    );

    const existing = views[viewName];

    if (existing) {
      if (existing.type !== 'CUSTOM') {
        throw new Error(
          `「${viewName}」已经存在，但不是 CUSTOM 视图。为防止覆盖，已停止处理。`,
        );
      }

      existing.html = html;

      console.log(
        `UPDATE  ${viewName}`,
      );
    } else {
      views[viewName] = {
        type: 'CUSTOM',
        name: viewName,
        html,
        pager: false,
        device: 'DESKTOP',
        filterCond: '',
        sort: '',
        index: String(nextIndex),
      };

      nextIndex += 1;

      console.log(
        `CREATE  ${viewName}`,
      );
    }
  }

  // -------------------------------
  // 更新 pre-live settings
  // -------------------------------

  await client.app.updateViews({
    app,
    views,
  });

  console.log('');
  console.log('View settings updated.');

  // -------------------------------
  // 发布 App
  // -------------------------------

  await client.app.deployApp({
    apps: [
      {
        app,
      },
    ],
  });

  console.log(
    'App deployment initiated.',
  );
}

main().catch((error) => {
  console.error('');
  console.error('View update failed.');

  if (error?.message) {
    console.error(error.message);
  }

  if (error?.errors) {
    console.error(error.errors);
  }

  process.exit(1);
});