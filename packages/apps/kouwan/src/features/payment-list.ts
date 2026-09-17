import { createApp, ref } from 'vue';

import dayjs from '../config/dayjs';
import { client } from '../config/kintone-client';
import { PAYMENT_APP_ID } from '../config/environment';
import { sortCompanyNamesByCode } from '../config/payment-companies';
import { formatCurrencyAmount, parseAmount } from '../utils/currency-format';

type SummaryCell = {
  value: number;
  currency: string;
};

type Detail = {
  $id: string;
  bl: string;
  etd: string;
  eta: string;
  route: string;
  amountMap: Record<string, { value: string; currency: string }>;
};

const appIdA = kintone.app.getId()!;

kintone.events.on('app.record.index.show', async (event: any) => {
  if (event.viewName !== '支払一覧') return;

  const app = createApp({
    setup() {
      const currentYear = ref(dayjs().year());
      const summary = ref<Record<string, Record<string, SummaryCell>>>({});
      const details = ref<Record<string, Detail[]>>({});
      const expandedMonths = ref(new Set<string>());
      const COMPANIES = ref<string[]>([]);
      const yearTotal = ref<Record<string, SummaryCell>>({});

      const fetchData = async () => {
        summary.value = {};
        details.value = {};
        expandedMonths.value.clear();

        const yearStr = currentYear.value.toString();
        const suppliers = (await client.record.getAllRecords({
          app: PAYMENT_APP_ID,
          condition: `paidDate >= "${yearStr}-01-01" and paidDate <= "${yearStr}-12-31"`,
          fields: ['BL', 'company', 'amount', 'currency', 'paidDate', 'shippingDate'],
        })) as any[];

        const companySet = new Set<string>();
        const blToPaid = new Map<
          string,
          Array<{ companyName: string; value: string; currency: string }>
        >();

        suppliers.forEach((s) => {
          const ym = s.paidDate.value.slice(0, 7);
          const currency = s.currency.value || 'USD';
          const companyName = `${s.company.value}${currency === 'JPY' ? '(円)' : '($)'}`;
          companySet.add(companyName);

          if (!summary.value[ym]) summary.value[ym] = {};
          if (!summary.value[ym][companyName]) {
            summary.value[ym][companyName] = { value: 0, currency };
          }
          const amount = parseAmount(s.amount.value);
          summary.value[ym][companyName].value += Number.isNaN(amount) ? 0 : amount;

          const blKey = `${ym}__${s.BL.value}`;
          if (!blToPaid.has(blKey)) blToPaid.set(blKey, []);
          blToPaid.get(blKey)!.push({
            companyName,
            value: s.amount.value,
            currency,
          });
        });

        COMPANIES.value = sortCompanyNamesByCode(Array.from(companySet));

        yearTotal.value = {};
        for (const ym in summary.value) {
          for (const company in summary.value[ym]) {
            const data = summary.value[ym][company];
            if (!yearTotal.value[company]) {
              yearTotal.value[company] = {
                value: 0,
                currency: data.currency,
              };
            }
            yearTotal.value[company].value += data.value;
          }
        }

        const routes = (await client.record.getAllRecords({
          app: appIdA,
          condition: `shippingDate >= "${yearStr}-01-01"`,
          fields: ['shippingDate', 'table'],
        })) as any[];

        routes.forEach((rec) => {
          rec.table.value.forEach((row: any) => {
            const bl = row.value.BL?.value;
            if (!bl) return;

            const ymList = Array.from(blToPaid.keys())
              .filter((key) => key.endsWith(`__${bl}`))
              .map((key) => key.split('__')[0]);

            ymList.forEach((ym) => {
              if (!details.value[ym]) details.value[ym] = [];

              const map: Record<string, { value: string; currency: string }> = {};
              (blToPaid.get(`${ym}__${bl}`) || []).forEach((p) => {
                map[p.companyName] = {
                  value: p.value,
                  currency: p.currency,
                };
              });

              details.value[ym].push({
                $id: rec['$id'].value,
                bl,
                etd: row.value.ETD?.value || '',
                eta: row.value.ETA?.value || '',
                route: `${row.value.dp?.value || ''}~${row.value.ap?.value || ''}`,
                amountMap: map,
              });
            });
          });
        });
      };

      const formatAmount = (val: unknown, currency = 'USD') =>
        formatCurrencyAmount(val, currency === 'JPY');

      const isExpanded = (ym: string) => expandedMonths.value.has(ym);

      const toggleExpand = (ym: string) => {
        expandedMonths.value.has(ym)
          ? expandedMonths.value.delete(ym)
          : expandedMonths.value.add(ym);
      };

      const safeDetails = (ym: string) => {
        return Array.isArray(details.value[ym])
          ? details.value[ym].filter((d) => d && d.bl)
          : [];
      };

      const prevYear = () => {
        currentYear.value -= 1;
        void fetchData();
      };

      const nextYear = () => {
        currentYear.value += 1;
        void fetchData();
      };

      void fetchData();

      return {
        currentYear,
        summary,
        details,
        COMPANIES,
        formatAmount,
        isExpanded,
        toggleExpand,
        prevYear,
        nextYear,
        safeDetails,
        yearTotal,
      };
    },
  });

  app.mount('#paymentHistory');

  window.setTimeout(() => {
    const table = document.querySelector<HTMLTableElement>('#paymentHistory table')!;
    const floating = document.getElementById('floating-summary')!;
    const floatingRow = document.getElementById('floating-summary-row')!;

    window.addEventListener('scroll', () => {
      const rows = Array.from(table.querySelectorAll<HTMLElement>('.detail-row'));
      let current: HTMLElement | null = null;

      for (const detailRow of rows) {
        const rect = detailRow.getBoundingClientRect();
        if (rect.top >= 100) {
          let pointer = detailRow.previousElementSibling as HTMLElement | null;

          while (pointer && pointer.classList.contains('detail-row')) {
            pointer = pointer.previousElementSibling as HTMLElement | null;
          }

          if (pointer && pointer.classList.contains('summary-row')) {
            const summaryRect = pointer.getBoundingClientRect();
            const stillVisible =
              summaryRect.top >= 100 && summaryRect.bottom <= window.innerHeight;
            if (!stillVisible) current = pointer;
          }
          break;
        }
      }

      if (current) {
        floatingRow.innerHTML = current.innerHTML;
        floating.style.display = '';
      } else {
        floating.style.display = 'none';
      }
    });
  }, 500);

  return event;
});
