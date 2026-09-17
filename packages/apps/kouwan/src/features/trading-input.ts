import {
  createApp,
  onMounted,
  onUnmounted,
  reactive,
  ref,
} from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

import { client } from '../config/kintone-client';
import { PAYMENT_APP_ID } from '../config/environment';
import { COMPANY_CODE_MAP } from '../config/payment-companies';

type TradingEntry = {
  $id: string | null;
  company: string;
  sai: number;
  amount: number;
  currency: string;
  BL: string;
  status: string;
  original: {
    BL: string;
    company: string;
    sai: number;
    amount: number;
    currency: string;
  };
};

type RouteBlock = {
  id: string;
  title: string;
  BL: string;
  entries: TradingEntry[];
  expanded: boolean;
};

const vuetify = createVuetify({
  components,
  directives,
});

const companyOrder = Object.values(COMPANY_CODE_MAP);

const app = createApp({
  setup() {
    const visible = ref(false);
    const routeBlocks = ref<RouteBlock[]>([]);
    const sameDateRecords = ref<any[]>([]);
    const expandAll = ref(false);
    const isCtrlPressed = ref(false);
    let tempIdCounter = 1;

    const snackbar = reactive({
      visible: false,
      message: '',
      color: 'success',
      timeout: 3000,
    });

    const deleteDialog = reactive<{
      visible: boolean;
      block: RouteBlock | null;
      entry: TradingEntry | null;
    }>({
      visible: false,
      block: null,
      entry: null,
    });

    const confirmCloseDialog = reactive({
      visible: false,
    });

    function convertToRow(rec: any, status: string): TradingEntry {
      const BL = typeof rec.BL === 'object' ? rec.BL?.value || '' : rec.BL || '';

      return {
        $id: rec.$id?.value || null,
        company: rec.company?.value || '',
        sai: Number(rec.sai?.value ?? 0),
        amount: Number(rec.amount?.value ?? 0),
        currency: rec.currency?.value || 'USD',
        BL,
        status,
        original: {
          BL: rec.BL?.value || '',
          company: rec.company?.value || '',
          sai: Number(rec.sai?.value ?? 0),
          amount: Number(rec.amount?.value ?? 0),
          currency: rec.currency?.value || 'USD',
        },
      };
    }

    async function openDialog(subtableRoutes: any[]) {
      visible.value = true;
      const shippingDate = (kintone.app.record.get() as any).record.shippingDate?.value || '';

      sameDateRecords.value = (await client.record.getAllRecords({
        app: PAYMENT_APP_ID,
        condition: `shippingDate="${shippingDate}"`,
        fields: ['$id', 'BL', 'currency', 'company', 'amount', 'sai'],
      })) as any[];

      routeBlocks.value = subtableRoutes.map((row) => {
        const BL = row.value.BL?.value || '';
        const matches = sameDateRecords.value
          .filter((r) => r.BL?.value === BL)
          .sort(
            (a, b) =>
              parseInt(a.$id?.value || 0) - parseInt(b.$id?.value || 0),
          );

        const entries = matches
          .map((rec) => convertToRow(rec, ''))
          .sort(
            (a, b) =>
              companyOrder.indexOf(a.company) - companyOrder.indexOf(b.company),
          );

        const id = matches[0]?.$id?.value || `temp-${tempIdCounter++}`;

        return {
          id,
          title: `${BL} ${row.value['dp']?.value || ''} ~ ${row.value['ap']?.value || ''} [${matches.length}件]`,
          BL,
          entries,
          expanded: false,
        };
      });
    }

    function selectAll(event: FocusEvent) {
      (event.target as HTMLInputElement).select();
    }

    async function saveAll() {
      const newRecords: any[] = [];
      const updateRecords: any[] = [];
      const shippingDate = (kintone.app.record.get() as any).record.shippingDate?.value || '';

      snackbar.message = '保存中...';
      snackbar.color = 'info';
      snackbar.timeout = -1;
      snackbar.visible = true;

      try {
        routeBlocks.value.forEach((block) => {
          block.entries.forEach((entry) => {
            if (!entry.company || Number.isNaN(entry.sai) || Number.isNaN(entry.amount)) return;

            const payload = {
              company: { value: entry.company },
              sai: { value: entry.sai },
              amount: { value: entry.amount },
              currency: { value: entry.currency },
              BL: { value: entry.BL },
              shippingDate: { value: shippingDate },
            };

            if (entry.status === '新規') {
              newRecords.push(payload);
            } else if (entry.status === '更新' && entry.$id) {
              updateRecords.push({ id: entry.$id, record: payload });
            }
          });
        });

        if (newRecords.length) {
          const res = await client.record.addRecords({
            app: PAYMENT_APP_ID,
            records: newRecords,
          });
          let idx = 0;

          routeBlocks.value.forEach((block) => {
            block.entries.forEach((entry) => {
              if (entry.status === '新規') {
                entry.$id = res.ids[idx++];
                entry.status = '';
                entry.original = {
                  BL: entry.BL,
                  company: entry.company,
                  sai: entry.sai,
                  amount: entry.amount,
                  currency: entry.currency,
                };
              }
            });
          });
        }

        if (updateRecords.length) {
          await client.record.updateRecords({
            app: PAYMENT_APP_ID,
            records: updateRecords,
          });
        }

        snackbar.message = `新規 ${newRecords.length} 件，更新 ${updateRecords.length} 件`;
        snackbar.color = 'success';
        snackbar.timeout = 3000;
      } catch (error) {
        console.error(error);
        snackbar.message =
          '保存に失敗しました：' +
          (error instanceof Error ? error.message : '不明なエラー');
        snackbar.color = 'error';
        snackbar.timeout = 5000;
      } finally {
        routeBlocks.value.forEach((block) => {
          block.entries.forEach((entry) => {
            entry.status = '';
            entry.original = {
              BL: entry.BL,
              company: entry.company,
              sai: entry.sai,
              amount: entry.amount,
              currency: entry.currency,
            };
          });
        });
        snackbar.visible = true;
      }
    }

    function deleteEntry(block: RouteBlock, entry: TradingEntry) {
      if (!isCtrlPressed.value) return;

      if (entry.$id) {
        deleteDialog.block = block;
        deleteDialog.entry = entry;
        deleteDialog.visible = true;
      } else {
        const index = block.entries.indexOf(entry);
        if (index !== -1) block.entries.splice(index, 1);
        snackbar.message = '未登録データを削除しました';
        snackbar.color = 'success';
        snackbar.timeout = 2000;
        snackbar.visible = true;
      }
    }

    async function confirmDelete() {
      const block = deleteDialog.block;
      const entry = deleteDialog.entry;
      if (!block || !entry?.$id) return;

      try {
        await client.record.deleteRecords({
          app: PAYMENT_APP_ID,
          ids: [entry.$id],
        });

        const index = block.entries.indexOf(entry);
        if (index !== -1) block.entries.splice(index, 1);

        snackbar.message = `ID ${entry.$id} を削除しました`;
        snackbar.color = 'success';
        snackbar.timeout = 3000;
      } catch (error) {
        console.error(error);
        snackbar.message = '削除に失敗しました';
        snackbar.color = 'error';
        snackbar.timeout = 5000;
      } finally {
        snackbar.visible = true;
        deleteDialog.visible = false;
      }
    }

    function toggleAllExpand() {
      expandAll.value = !expandAll.value;
      routeBlocks.value.forEach((block) => {
        block.expanded = expandAll.value;
      });
    }

    function hasUnsavedChanges() {
      return routeBlocks.value.some((block) =>
        block.entries.some(
          (entry) => entry.status === '新規' || entry.status === '更新',
        ),
      );
    }

    function handleKey(event: KeyboardEvent) {
      if (!visible.value) return;

      if (event.key === 'Escape') void close();
      if (event.key === 'Enter' && event.ctrlKey) void saveAll();

      if (event.code === 'NumpadAdd') {
        event.preventDefault();
        expandAll.value = true;
        routeBlocks.value.forEach((block) => (block.expanded = true));
      }

      if (event.code === 'NumpadSubtract') {
        event.preventDefault();
        expandAll.value = false;
        routeBlocks.value.forEach((block) => (block.expanded = false));
      }

      if (event.key === 'Control') isCtrlPressed.value = true;
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === 'Control') isCtrlPressed.value = false;
    }

    function addRow(block: RouteBlock) {
      if (!block.expanded) block.expanded = true;
      block.entries.push(convertToRow({ BL: block.BL }, '新規'));
    }

    function onInputChange(entry: TradingEntry) {
      if (COMPANY_CODE_MAP[entry.company]) {
        entry.company = COMPANY_CODE_MAP[entry.company];
      }

      // 旧代码这里重复执行了一次相同转换，本次迁移按原行为保留。
      if (COMPANY_CODE_MAP[entry.company]) {
        entry.company = COMPANY_CODE_MAP[entry.company];
      }

      if (entry.status === '新規') return;

      const { company, sai, amount, currency } = entry;
      const { original } = entry;
      entry.status =
        company !== original.company ||
        sai !== original.sai ||
        amount !== original.amount ||
        currency !== original.currency
          ? '更新'
          : '';
    }

    async function close() {
      if (hasUnsavedChanges()) {
        confirmCloseDialog.visible = true;
        return;
      }

      visible.value = false;
      routeBlocks.value = [];
    }

    function forceClose() {
      confirmCloseDialog.visible = false;
      visible.value = false;
      routeBlocks.value = [];
    }

    function formatNumber(val: unknown) {
      if (Number.isNaN(Number(val))) return '';
      return Number(val).toLocaleString();
    }

    function updateAmount(entry: TradingEntry, val: unknown) {
      const parsed = parseFloat(String(val).replace(/,/g, ''));
      entry.amount = Number.isNaN(parsed) ? 0 : parsed;
      onInputChange(entry);
    }

    function updateSai(entry: TradingEntry, val: unknown) {
      const parsed = parseFloat(String(val).replace(/,/g, ''));
      entry.sai = Number.isNaN(parsed) ? 0 : parsed;
      onInputChange(entry);
    }

    onMounted(() => {
      window.addEventListener('keydown', handleKey);
      window.addEventListener('keyup', handleKeyUp);
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    });

    return {
      visible,
      routeBlocks,
      sameDateRecords,
      expandAll,
      isCtrlPressed,
      snackbar,
      deleteDialog,
      confirmCloseDialog,
      openDialog,
      selectAll,
      saveAll,
      deleteEntry,
      confirmDelete,
      toggleAllExpand,
      addRow,
      onInputChange,
      close,
      forceClose,
      formatNumber,
      updateAmount,
      updateSai,
    };
  },

  template: `
      <v-dialog v-model="visible" width="900" persistent>
        <v-card style="height: 800px; display: flex; flex-direction: column;">
          <v-card-title class="text-h6 d-flex justify-space-between" style="position: sticky; top: 0; background: white; z-index: 10;">
            商社別輸入実績入力
            <v-btn @click="toggleAllExpand" variant="outlined"  tabindex="-1">{{ expandAll ? '全て折りたたみ' : '全て展開' }}<span style="font-size: 0.8em; color: gray;">(+/-)</span></v-btn>
            <v-btn @click="saveAll"  tabindex="-1">変更適用<span style="font-size: 0.8em; color: gray;">(Ctrl+Enter)</span></v-btn>
            <v-btn @click="close"  tabindex="-1">閉じる<span style="font-size: 0.8em; color: gray;">(Esc)</span></v-btn>
          </v-card-title>
          <v-card-text>
            <div v-for="(block, i) in routeBlocks" :key="block.id" class="mb-6">
              <v-alert type="info" dense class="cursor-pointer" :class="{ 'opacity-low': !block.expanded }" style="padding: 10px 10px; min-height: 40px; font-size: 18px;">
                <div class="d-flex justify-space-between align-center" @click="block.expanded = !block.expanded; expandAll = routeBlocks.every(b => b.expanded);">
                  <div>{{ block.title }}</div>
                  <v-btn size="large" @click.stop="addRow(block)"  tabindex="-1">＋行を追加</v-btn>
                </div>
              </v-alert>
              <template v-if="block.expanded">
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th class="col-id">ID</th>
                      <th class="col-name">商社</th>
                      <th class="col-sai">才数</th>
                      <th class="col-amount">金額</th>
                      <th class="col-currency">通貨</th>
                      <th class="col-status">状態</th>
                      <th class="col-delete">削除</th>
                    </tr>
                  </thead>
                  <tbody>
                  
                    <tr v-for="(e, j) in block.entries" :key="j">
                    
                      <td class="col-id-color">{{e.$id }}</td>
                      <td><v-text-field v-model="e.company" density="compact"  @focus="selectAll" hide-details="true" @input="onInputChange(e)" /></td>

                      
<td>
  <v-text-field
    class="align-decimal"
    :model-value="formatNumber(e.sai)"
    @update:modelValue="(val) => updateSai(e, val)"
    type="text"
    density="compact"
    hide-details="true"
    @focus="selectAll"
  />
</td>

<td>
  <v-text-field
    class="align-decimal"
    :model-value="formatNumber(e.amount)"
    @update:modelValue="(val) => updateAmount(e, val)"
    type="text"
    density="compact"
    hide-details="true"
    @focus="selectAll"
  />
</td>




                      <td>
                        <v-select
                          :items="['USD', 'JPY']"
                          v-model="e.currency"
                          density="compact"
                          hide-details="true"
                          variant="outlined"
                          style="min-width: 80px"
                          :class="['currency-select', { 'text-red': e.currency === 'JPY' }]"
                          @update:modelValue="onInputChange(e)"
                        />

                      </td>
                      <td>{{ e.status }} </td>
                      <td>
                        <v-btn
                          :color="isCtrlPressed ? (e.$id ? 'error' : 'green') : 'grey'"
                          :disabled="!isCtrlPressed"
                          @click="deleteEntry(block, e)"
                          title="Ctrlを押して削除"
                          density="compact"
                          style="min-width: 28px; width: 28px; height: 28px; padding: 0;"
                        >✖</v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </template>
            </div>
          </v-card-text>
        </v-card>
      </v-dialog>

      <v-snackbar
        v-model="snackbar.visible"
        :color="snackbar.color"
        :timeout="snackbar.timeout"
        location="top"
        elevation="2"
      >
        {{ snackbar.message }}
      </v-snackbar>

      <v-dialog v-model="deleteDialog.visible" width="500">
        <v-card>
          <v-card-title class="text-h6">削除の確認</v-card-title>
          <v-card-text>
            本当に <strong>ID {{ deleteDialog.entry?.$id }}</strong> のデータを削除しますか？<br />
            この操作は元に戻せません。
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="deleteDialog.visible = false">キャンセル</v-btn>
            <v-btn color="error" @click="confirmDelete">削除する</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="confirmCloseDialog.visible" width="500">
        <v-card>
          <v-card-title class="text-h6">未保存の変更があります</v-card-title>
          <v-card-text>
            変更を保存せずに閉じますか？<br />
            この操作は元に戻せません。
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="error" @click="forceClose">閉じる</v-btn>
            <v-btn text @click="confirmCloseDialog.visible = false">キャンセル</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

`,
});

const mountPoint = document.createElement('div');
mountPoint.id = 'popup-vue';
document.body.appendChild(mountPoint);

const vm = app.use(vuetify).mount('#popup-vue') as any;

kintone.events.on('app.record.detail.show', (event: any) => {
  const sp = document.querySelector<HTMLElement>(
    '.gaia-argoui-app-toolbar-statusmenu',
  );
  if (document.getElementById('btnShowCompanies')) return;

  const btn = document.createElement('button');
  btn.id = 'btnShowCompanies';
  btn.textContent = '航路別／商社別輸入実績入力';
  btn.className = 'btn-toolbar';
  btn.onclick = () => {
    const record = (kintone.app.record.get() as any).record;
    const subtable = record['table']?.value || [];
    void vm.openDialog(subtable);
  };

  sp!.appendChild(btn);
  return event;
});
