import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = '/mnt/data';

async function text(path) {
  return readFile(path, 'utf8');
}

test('custom views are preserved byte-for-byte as text', async () => {
  for (const name of ['view.html', '支払登録.html', '支払一覧.html']) {
    assert.equal(
      await text(resolve(root, 'views', name)),
      await text(resolve(sourceRoot, name)),
      `${name} changed during migration`,
    );
  }
});

test('existing CSS is preserved byte-for-byte as text', async () => {
  const pairs = [
    ['style(20260917-105220).css', 'record.css'],
    ['trading-input.css', 'trading-input.css'],
    ['payment-entry.css', 'payment-entry.css'],
    ['payment-list.css', 'payment-list.css'],
    ['port-list.css', 'port-list.css'],
  ];

  for (const [source, target] of pairs) {
    assert.equal(
      await text(resolve(root, 'src', 'styles', target)),
      await text(resolve(sourceRoot, source)),
      `${target} changed during migration`,
    );
  }
});

test('all migrated feature modules are wired from src/index.ts', async () => {
  const index = await text(resolve(root, 'src', 'index.ts'));
  for (const moduleName of [
    'subtable-shortcuts',
    'record-detail',
    'chatwork-notify',
    'trading-input',
    'payment-entry',
    'payment-list',
    'port-list',
  ]) {
    assert.match(index, new RegExp(`features/${moduleName}`));
  }
});

test('key kintone event/view behavior markers are still present', async () => {
  const checks = [
    ['subtable-shortcuts.ts', 'app.record.create.show'],
    ['subtable-shortcuts.ts', 'ArrowDown'],
    ['record-detail.ts', 'app.record.detail.show'],
    ['chatwork-notify.ts', 'chatwork通知'],
    ['trading-input.ts', '航路別／商社別輸入実績入力'],
    ['payment-entry.ts', '支払登録'],
    ['payment-list.ts', '支払一覧'],
    ['port-list.ts', 'event.viewName !== "view"'],
  ];

  for (const [file, marker] of checks) {
    const code = await text(resolve(root, 'src', 'features', file));
    assert.ok(code.includes(marker), `${file} lost marker: ${marker}`);
  }
});
