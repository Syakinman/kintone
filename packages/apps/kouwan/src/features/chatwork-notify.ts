import Swal from 'sweetalert2';

import dayjs from '../config/dayjs';
import {
  CHATWORK_ROOM_ID,
  CHATWORK_TOKEN,
} from '../config/environment';

const shipperMap: Record<string, string> = {
  910: '泉州鳴本',
  920: '金大通',
  930: '嵐磊',
  940: '伊聖',
  950: '松晟',
  960: '欧凱',
  970: '瑾盛',
  980: '大陸興',
  990: '中揚',
  995: '三益友',
};

const forwarderMap: Record<string, string> = {
  0: 'T&L',
  1: '日通',
  2: '磊力',
  3: '内外',
};

const dpMap: Record<string, string> = {
  1: '厦門',
  2: '大連',
};

const apMap: Record<string, string> = {
  140: '横浜',
  150: '東京',
  270: '大阪',
  280: '神戸',
  290: '名古屋',
  330: '水島',
  340: '福山',
  400: '門司',
};

kintone.events.on(['app.record.detail.show'], (event: any) => {
  const header = document.querySelector<HTMLElement>(
    '.gaia-argoui-app-toolbar-statusmenu',
  );
  if (document.getElementById('btnChatwork')) return;

  const btnSend = document.createElement('button');
  btnSend.id = 'btnChatwork';
  btnSend.innerText = 'chatwork通知';

  btnSend.onclick = () => {
    if (isAdmin()) {
      void Swal.fire({
        title: 'Chatworkに情報を送信しますか？',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '送信する',
        cancelButtonText: 'キャンセル',
      }).then((result: { isConfirmed: boolean }) => {
        if (result.isConfirmed) {
          chatwrokNotify();
          void Swal.fire({
            title: '通知完了！',
            text: 'Chatwork通知が正常に送信されました。',
            icon: 'success',
          });
        }
      });
    } else {
      void Swal.fire({
        title: '残念！',
        text: 'この機能は選ばれた人にしか使えません！',
        icon: 'warning',
      });
    }
  };

  const btnUpdate = document.createElement('button');
  btnUpdate.id = 'btnUpdate';
  btnUpdate.innerText = '送信内容更新';
  btnUpdate.onclick = writePreview;

  header!.appendChild(btnSend);
  header!.appendChild(btnUpdate);

  document.body.addEventListener('keydown', keyHandler);

  return event;
});

function keyHandler(event: KeyboardEvent) {
  if (/mode=edit/.test(location.href)) return;
  const ctrl = event.ctrlKey || event.metaKey;

  if (ctrl && event.key === 'Delete') {
    recordPost('preview', '', false);
  }

  if (event.altKey && event.shiftKey && event.key === 'Delete') {
    const msgId = (kintone.app.record.get() as any).record.msgId.value;
    if (parseInt(msgId)) {
      DeleteChatworkMsgById(msgId);
      recordPost('preview', '', false);
      recordPost('msgId', '', true);
    }
  }
}

kintone.events.on(
  [
    'app.record.create.show',
    'app.record.edit.show',
    'app.record.create.change.table',
    'app.record.edit.change.table',
  ],
  (event: any) => {
    event.record.msgId.disabled = true;
    event.record.table.value.forEach(
      (row: any) => (row.value.deadline.disabled = true),
    );
    return event;
  },
);

kintone.events.on(
  [
    'app.record.create.change.dp',
    'app.record.edit.change.dp',
    'app.record.create.change.ap',
    'app.record.edit.change.ap',
    'app.record.create.change.ETA',
    'app.record.edit.change.ETA',
    'app.record.create.change.ETD',
    'app.record.edit.change.ETD',
    'app.record.create.change.get',
    'app.record.edit.change.get',
    'app.record.create.change.vessel',
    'app.record.edit.change.vessel',
    'app.record.create.change.assessment',
    'app.record.edit.change.assessment',
    'app.record.create.change.shipper',
    'app.record.edit.change.shipper',
    'app.record.create.change.forwarder',
    'app.record.edit.change.forwarder',
    'app.record.create.change.BL',
    'app.record.edit.change.BL',
  ],
  (event: any) => {
    const row = event.changes.row.value;

    ['vessel', 'BL', 'assessment'].forEach((key) => {
      row[key].value = (row[key].value || '').toUpperCase();
    });

    ['ETD', 'ETA', 'get'].forEach((key) => {
      row[key].value = row[key].value || '';
    });

    if (row.ETA.value) {
      const d = dayjs(row.ETA.value);
      const last = d.endOf('month').date();
      row.deadline.value = `${d.year()}-${d.month() + 1}-${last}`;
    }

    row.shipper.value = shipperMap[row.shipper.value] || row.shipper.value;
    const fwd = forwarderMap[row.forwarder.value];
    if (fwd) {
      row.forwarder.value = fwd;
      if (fwd === 'T&L' || fwd === '磊力' || fwd === '内外') {
        row.qtn.value = 0;
      }
    }

    row.dp.value = dpMap[row.dp.value] || row.dp.value;
    row.ap.value = apMap[row.ap.value] || row.ap.value;

    return event;
  },
);

function writePreview() {
  const rec = (kintone.app.record.get() as any).record;
  const table = rec.table.value;
  const preview = rec.preview.value || '';
  const memo = rec.memo.value || '';

  const oldETDs = preview.match(/出港予定：[^\n&]*/g) || [];
  const oldETAs = preview.match(/入港予定：[^\n&]*/g) || [];
  const oldGets = preview.match(/引取予定：[^\n&]*/g) || [];

  let result = '';

  for (let i = 0; i < table.length; i += 1) {
    const row = table[i].value;
    let etd = Fullwidth(DateFormat(row.ETD.value, true));
    let eta = Fullwidth(DateFormat(row.ETA.value, true));
    let get = Fullwidth(DateFormat(row.get.value, true));
    const vessel = row.vessel.value || '';
    const BL = row.BL.value || '';
    const memoRoute = row.memoRoute.value ? `【※${row.memoRoute.value}】` : '';
    const dp = row.dp.value;
    const ap = row.ap.value;

    if (oldETDs[i]) {
      const old = oldETDs[i].substring(5);
      etd = etd === old ? old : `${old}▶ ${etd}`;
    }
    if (oldETAs[i]) {
      const old = oldETAs[i].substring(5);
      eta = eta === old ? old : `${old}▶ ${eta}`;
    }
    if (oldGets[i]) {
      const old = oldGets[i].substring(5);
      get = get === old ? old : `${old}▶ ${get}`;
    }

    result += `${dp}⇒${ap}【${vessel}】${memoRoute}\n船荷証券：${BL}\n出港予定：${etd}\n入港予定：${eta}\n引取予定：${get}\n[hr]`;
  }

  const extra = table.some((row: any) => !row.value.ETD.value)
    ? '[hr]※入出港情報が未記載の分について、情報送信時点において厦門港（大連港）から出港していない状況です。\n詳細が判明次第、随時ご案内いたしますので、今しばらくお待ちくださいますようお願い申し上げます。'
    : '';

  recordPost('preview', result + (memo ? `[hr]${memo}` : '') + extra);
}

function chatwrokNotify() {
  const rec = (kintone.app.record.get() as any).record;
  if (rec.msgId.value) DeleteChatworkMsgById(rec.msgId.value);

  const title = `${Fullwidth(DateFormat(rec.shippingDate.value, false))}積港湾予定 ${GetPicon() || ''}`;
  const body = `[info][title]${title}[/title]${rec.preview.value}[/info]`;

  const headers = {
    'X-ChatWorkToken': CHATWORK_TOKEN,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const url = `https://api.chatwork.com/v2/rooms/${CHATWORK_ROOM_ID}/messages`;
  const params = `body=${body}`;

  kintone
    .proxy(url, 'POST', headers, params)
    .then(([resp]: any[]) => {
      const id = JSON.parse(resp).message_id;
      recordPost('msgId', id);
    })
    .catch(console.error);
}

function DeleteChatworkMsgById(id: string) {
  const url = `https://api.chatwork.com/v2/rooms/${CHATWORK_ROOM_ID}/messages/${id}`;
  const headers = { 'X-ChatWorkToken': CHATWORK_TOKEN };
  kintone.proxy(url, 'DELETE', headers, '').catch(console.error);
}

function recordPost(field: string, value: string, reload = true) {
  const body = {
    app: kintone.app.getId(),
    id: kintone.app.record.getId(),
    record: { [field]: { value } },
  };

  kintone.api(
    kintone.api.url('/k/v1/record', true),
    'PUT',
    body,
    () => {
      if (reload) location.reload();
    },
    console.error,
  );
}

function DateFormat(dateStr: string, showWeek: boolean) {
  const d = dayjs(dateStr);
  if (!d.isValid()) return '';
  const date = d.format('MM／DD');
  return showWeek ? `${date}（${d.format('ddd')}）` : date;
}

function Fullwidth(str: string) {
  return (str || '').replace(/[A-Za-z0-9]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) + 0xfee0),
  );
}

function GetPicon() {
  const code = kintone.getLoginUser().code;
  const users: Record<string, number> = {
    'sai@narumoto.co.jp': 4487673,
    本社: 4487668,
    'kensuke@narumoto.co.jp': 4487660,
    'fukushima@narumoto.co.jp': 4340412,
  };
  return users[code] ? `[picon:${users[code]}]` : '';
}

function isAdmin() {
  const user = kintone.getLoginUser().code;
  return [
    'sai@narumoto.co.jp',
    '本社',
    'kensuke@narumoto.co.jp',
    'fukushima@narumoto.co.jp',
  ].includes(user);
}
