import dayjs from '../config/dayjs';

kintone.events.on('app.record.detail.show', (event: any) => {
  const record = event.record;
  const tbl = kintone.app.record.getFieldElement('table') as HTMLTableElement | null;

  if (!tbl) return event;

  const timer = window.setInterval(() => {
    const rows = tbl.tBodies?.[0]?.rows;
    if (!rows) return;

    if (rows.length === record.table.value.length) {
      window.clearInterval(timer);
      const dateFields = tbl.querySelectorAll<HTMLElement>('.control-date-field-gaia');

      dateFields.forEach((el) => {
        const rawText = el.textContent?.trim();
        if (rawText && rawText.length > 1) {
          const target = el.querySelector<HTMLSpanElement>('span');
          if (target) {
            const formatted = dayjs(rawText).isValid()
              ? dayjs(rawText).format('MM/DD(ddd)')
              : rawText;
            target.textContent = formatted;
          }
        }
      });
    }
  }, 100);

  return event;
});

kintone.events.on(
  ['app.record.create.submit', 'app.record.edit.submit'],
  (event: any) => {
    const record = event.record;
    const rows = record.table.value;

    if (!rows.length) return event;

    const allDepartured = rows.every(
      (row: any) => row.value.dp.value && row.value.ETD.value,
    );

    record.allShipsDepartured.value = allDepartured ? ['yes'] : [];

    return event;
  },
);

kintone.events.on(
  ['app.record.edit.show', 'app.record.detail.show'],
  (event: any) => {
    const btnHide = document.createElement('button');
    btnHide.textContent = '非表示';
    btnHide.style.cssText = 'margin-left:30px;background:#3498db;color:white';

    let flg = false;
    btnHide.onclick = () => {
      if (flg) {
        flg = false;
        btnHide.textContent = '非表示';
      } else {
        flg = true;
        btnHide.textContent = '表示';
      }

      // 1.備考 2.BL 3.商社 4.FCL 5.積港 6.揚港 7.船名 8.vol 09.出航日 10.入港日 11.引取日
      // 12.乙仲 13.コン数 14.重量 15.体積 16.才数 17.通関金額 18.消費税 19.評価 20.評価額 21.締切日 22.sort
      const tbl = document.querySelector<HTMLTableElement>('table')!;
      const hideTds = [1, 4, 7, 8, 9, 10, 22];

      Array.from(tbl.rows).forEach((row) => {
        hideTds.forEach((hideTd) => {
          (row.children[hideTd] as HTMLElement).style.display = flg ? 'none' : '';
        });
      });
    };

    kintone.app.record.getSpaceElement('sp')!.append(btnHide);
    return event;
  },
);
