import { createApp, ref } from 'vue';

import dayjs from '../config/dayjs';
import { client } from '../config/kintone-client';
import { PAYMENT_APP_ID } from '../config/environment';
import { sortCompanyNamesByCode } from '../config/payment-companies';
import { formatCurrencyAmount, parseAmount } from '../utils/currency-format';

type SupplierRecord = any;
type RouteRecord = any;
type RouteItem = {
  $id: string | undefined;
  rowId: string | undefined;
  uniqueKey: string;
  shippingDate: string | undefined;
  deadline: string;
  bl: string;
  shipper: string;
  route: string;
  etd: string;
  eta: string;
  paidMonth: string | null;
};

let vueApp: ReturnType<typeof createApp> | undefined;

kintone.events.on('app.record.index.show', async (event: any) => {
  if (event.viewName !== '支払登録') return;

  showSpinner();

  const routeList = ref<RouteItem[]>([]);
  const supplierMap = new Map<string, SupplierRecord>();
  const selected = ref(new Set<string>());
  const subtotalMap = ref<Record<string, number>>({});
  const payingMonth = ref(dayjs().format('YYYY-MM'));
  const COMPANIES = ref<string[]>([]);

  const sortRouteList = () => {
    routeList.value.sort((a, b) => {
      const deadlineA = dayjs(a.deadline || '3000-01-01');
      const deadlineB = dayjs(b.deadline || '3000-01-01');
      if (!deadlineA.isSame(deadlineB)) return deadlineA.diff(deadlineB);

      const shipDateA = dayjs(a.shippingDate || '3000-01-01');
      const shipDateB = dayjs(b.shippingDate || '3000-01-01');
      return shipDateA.diff(shipDateB);
    });
  };

  const loadInitialData = async () => {
    const suppliers = (await client.record.getAllRecords({
      app: PAYMENT_APP_ID,
      condition: 'paidDate = ""',
      fields: ['BL', 'company', 'amount', 'currency', 'paidDate', 'shippingDate'],
    })) as SupplierRecord[];

    const blSet = new Set<string>();
    suppliers.forEach((s) => {
      const currencyLabel = s.currency.value === 'JPY' ? '(円)' : '($)';
      const companyName = `${s.company.value}${currencyLabel}`;
      const key = `${s.BL.value}__${companyName}`;

      if (!supplierMap.has(key)) supplierMap.set(key, s);
      if (!COMPANIES.value.includes(companyName)) COMPANIES.value.push(companyName);
      blSet.add(s.BL.value);
    });

    COMPANIES.value = sortCompanyNamesByCode(COMPANIES.value);

    const fromDate = dayjs().subtract(12, 'month').format('YYYY-MM-DD');
    void fromDate;

    const allRoutes = (await client.record.getAllRecords({
      app: kintone.app.getId()!,
      // condition: `shippingDate >= "${fromDate}"`,
      fields: ['shippingDate', 'table'],
    })) as RouteRecord[];

    const filteredRoutes = allRoutes.filter((rec) =>
      rec.table.value.some((row: any) => blSet.has(row.value.BL.value)),
    );

    filteredRoutes.forEach((rec) => {
      const recordId = rec['$id']?.value;
      const shippingDate = rec.shippingDate?.value;

      rec.table.value.forEach((row: any) => {
        const v = row.value;
        if (!blSet.has(v.BL.value)) return;

        const paidMonth = (() => {
          for (const company of COMPANIES.value) {
            const key = `${v.BL.value}__${company}`;
            const s = supplierMap.get(key);

            if (s && s.paidDate.value) {
              return s.paidDate.value.slice(0, 7);
            }
          }

          return null;
        })();

        routeList.value.push({
          $id: recordId,
          rowId: row.id,
          uniqueKey: `${recordId}_${row.id}`,
          shippingDate,
          deadline: v.deadline.value || '',
          bl: v.BL.value,
          shipper: v.shipper.value || '',
          route: `${v.dp.value}~${v.ap.value}`,
          etd: v.ETD.value || '',
          eta: v.ETA.value || '',
          paidMonth,
        });
      });
    });

    sortRouteList();
    hideSpinner();
  };

  await loadInitialData();

  vueApp = createApp({
    setup() {
      const monthColorMap = ref<Record<string, string>>({});
      const colorPalette = [
        '#fffde7',
        '#e0f7fa',
        '#fce4ec',
        '#f3e5f5',
        '#f1f8e9',
        '#e8f5e9',
      ];
      let colorIndex = 0;

      const updateMonthColors = () => {
        routeList.value.forEach((r) => {
          if (!r.paidMonth) return;
          if (!(r.paidMonth in monthColorMap.value)) {
            monthColorMap.value[r.paidMonth] =
              colorPalette[colorIndex % colorPalette.length];
            colorIndex += 1;
          }
        });
      };
      updateMonthColors();

      const getRowStyle = (r: RouteItem) =>
        r.paidMonth ? { backgroundColor: monthColorMap.value[r.paidMonth] } : {};

      const getSupplierMap = (bl: string) => {
        const result: Record<string, string | null> = {};

        for (const company of COMPANIES.value) {
          const key = `${bl}__${company}`;
          const s = supplierMap.get(key);
          result[company] = s?.amount.value || '';
          result[`paid_${company}`] = s?.paidDate.value
            ? s.paidDate.value.slice(0, 7)
            : null;
        }

        return result;
      };

      const getCellStyle = (route: RouteItem, company: string) => {
        const amount = getSupplierMap(route.bl)[company];
        const parsed = parseAmount(amount);
        if (!amount || parsed === 0 || Number.isNaN(parsed)) return {};

        const color = route.paidMonth
          ? monthColorMap.value[route.paidMonth]
          : undefined;
        return color ? { backgroundColor: color } : {};
      };

      const formatAmount = (
        amount: string | number | null | undefined,
        company: string,
        forceZero = false,
      ) =>
        formatCurrencyAmount(amount, company.includes('円'), {
          hideZero: !forceZero,
        });

      const recalcSubtotal = () => {
        const result: Record<string, number> = {};

        selected.value.forEach((key) => {
          const s = supplierMap.get(key);
          if (s) {
            const company = key.split('__')[1];
            const val = parseAmount(s.amount.value);
            result[company] = (result[company] || 0) + (Number.isNaN(val) ? 0 : val);
          }
        });

        subtotalMap.value = result;
      };

      const toggleSelect = (bl: string, company: string) => {
        const key = `${bl}__${company}`;
        const data = supplierMap.get(key);
        if (!data || data.paidDate.value) return;

        if (selected.value.has(key)) selected.value.delete(key);
        else selected.value.add(key);

        recalcSubtotal();
      };

      const isSelected = (bl: string, company: string) =>
        selected.value.has(`${bl}__${company}`);

      const toggleDeadline = (deadline: string) => {
        selected.value.clear();

        routeList.value.forEach((r) => {
          if (r.deadline === deadline) {
            COMPANIES.value.forEach((company) => {
              const key = `${r.bl}__${company}`;
              const s = supplierMap.get(key);
              if (s && !s.paidDate.value) selected.value.add(key);
            });
          }
        });

        recalcSubtotal();
      };

      const registerPaymentMonth = async () => {
        const lst = Array.from(selected.value);
        if (lst.length === 0) return alert('選択対象ありません');
        if (!payingMonth.value) return alert('支払予定日を選んでください');

        const updatesB = lst.map((key) => {
          const s = supplierMap.get(key)!;
          return {
            id: s.$id.value,
            record: {
              paidDate: { value: `${payingMonth.value}-01` },
            },
          };
        });

        try {
          await client.record.updateRecords({
            app: PAYMENT_APP_ID,
            records: updatesB,
          });
          alert('支払月を登録しました');
          location.reload();
        } catch (err) {
          console.error(err);
          alert('登録中にエラーが発生しました');
        }
      };

      return {
        routeList,
        COMPANIES,
        getSupplierMap,
        formatAmount,
        isSelected,
        toggleSelect,
        toggleDeadline,
        subtotalMap,
        payingMonth,
        registerPaymentMonth,
        getRowStyle,
        getCellStyle,
        // NOTE: 原 HTML 中的 loadMore 在旧 JS 中没有实现，本次迁移故意不补功能。
      };
    },
  });

  vueApp.mount('#paymentApp');
  return event;
});
