let flg = true;

kintone.events.on(
  ['app.record.create.show', 'app.record.edit.show'],
  (event: any) => {
    const record = event.record;
    void record;
    document.body.addEventListener('keydown', keydownHandler);
    return event;
  },
);

const keydownHandler = (eKey: KeyboardEvent) => {
  const ctrlKey = eKey.ctrlKey || eKey.metaKey;
  const altKey = eKey.altKey;
  const shiftKey = eKey.shiftKey;
  void altKey;
  void shiftKey;

  if (ctrlKey && eKey.key === 'ArrowDown') {
    // ctrl+↓ 行追加
    addRow();
  }

  if (ctrlKey && eKey.key === 'ArrowUp') {
    // ctrl+↑ 行削除
    // 特定栏位如果有值的话,则提醒是否删除;
    deleteRow('BL');
  }

  if (ctrlKey && (eKey.key === 'q' || eKey.key === 'Q')) {
    // 並び替え
    mySort(flg);
    flg = !flg;
  }
};

function mySort(isAssending: boolean) {
  const obj = kintone.app.record.get() as any;

  const fieldTable = 'table';
  const fieldForSorting = 'sort';

  obj.record[fieldTable].value.sort((a: any, b: any) => {
    return isAssending
      ? Number(a.value[fieldForSorting].value) - Number(b.value[fieldForSorting].value)
      : Number(b.value[fieldForSorting].value) - Number(a.value[fieldForSorting].value);
  });

  kintone.app.record.set(obj);
}

function addRow() {
  const fieldTable = 'table';
  const record = (kintone.app.record.get() as any).record;

  const lastRow = record[fieldTable].value[record[fieldTable].value.length - 1];
  record[fieldTable].value.push(lastRow);

  kintone.app.record.set({ record } as any);
}

function deleteRow(colIfExistedDataThenAlert: string) {
  const record = (kintone.app.record.get() as any).record;
  const fieldTable = 'table';

  const lastRow = record[fieldTable].value.length - 1;
  if (record[fieldTable].value[lastRow].value[colIfExistedDataThenAlert].value) {
    if (window.confirm('do you want to delete this row')) {
      record[fieldTable].value.splice(lastRow, 1);
    }
  } else {
    record[fieldTable].value.splice(lastRow, 1);
  }

  kintone.app.record.set({ record } as any);
}
