kintone.events.on('app.record.index.show', (event: any) => {
  if (event.viewName !== "view") return event;

  let strTbody = '';

  event.records.forEach((record: any) => {
    let strSubTable = '';

    record.table.value.forEach((sub: any) => {
      strSubTable += `
          <tr>
            <td>${sub.value.BL.value || ''}</td>
            <td>${sub.value.shipper.value || ''}</td>
            <td>${(sub.value.dp.value || '') + '→' + (sub.value.ap.value || '')}</td>
            <td>${sub.value.vessel.value || ''}</td>
            <td>${sub.value.memoRoute.value || ''}</td>
            <td>${sub.value.ETD.value || ''}</td>
            <td>${sub.value.ETA.value || ''}</td>
            <td>${sub.value.get.value || ''}</td>
          </tr>`;
    });

    const link = `${location.origin + location.pathname}show#record=${record.$id.value}`;

    strTbody += `
        <tr data-href="${link}" class="clickable">
          <td>
            <span style="font-size:2em;font-weight:bold">${record.shippingDate.value}</span>
            <table class="subTable">
              <thead>
                <tr style="background-color:lightpink">
                  <th>BL</th>
                  <th>シッパー</th>
                  <th>航路</th>
                  <th>船名</th>
                  <th>航路備考</th>
                  <th>出発日</th>
                  <th>到着日</th>
                  <th>引取日</th>
                </tr>
              </thead>
              <tbody>${strSubTable}</tbody>
            </table>
            <br><br>
          </td>
        </tr>`;
  });

  const wrapper = document.querySelector<HTMLElement>('#wrapper')!;
  wrapper.innerHTML = `<table><tbody>${strTbody}</tbody></table>`;

  wrapper.querySelectorAll<HTMLTableRowElement>('tr[data-href]').forEach((tr) => {
    tr.addEventListener('click', (clickEvent) => {
      const targetTr = (clickEvent.target as HTMLElement).closest<HTMLTableRowElement>('tr');
      if (targetTr?.dataset.href) {
        window.location.href = targetTr.dataset.href;
      }
    });
  });

  return event;
});
