// kintone 的金额字段（尤其是带千位分隔符显示的计算字段）有时会返回
// 像 "1,500.50" 这样带逗号的字符串。裸用 Number()/parseFloat() 解析会得到
// NaN 或被逗号截断的错误数值，进而在求和时把整列汇总静默污染成 0。
export function parseAmount(value: unknown): number {
  return parseFloat(String(value ?? '').replace(/,/g, ''));
}

export function formatCurrencyAmount(
  value: unknown,
  isJPY: boolean,
  options: { hideZero?: boolean } = {},
): string {
  const num = parseAmount(value);
  if (Number.isNaN(num)) return '';
  if (options.hideZero && num === 0) return '';

  return isJPY
    ? Math.round(num).toLocaleString()
    : num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}
