// 支払登録 / 支払一覧 共用的商社コード対照表（用于按コード顺序排序显示列）。
// 与 trading-input.ts 中的 codeMap 是各自画面原本就存在的独立对照表，
// 910 的显示名在两边不一致（"泉州鳴本" vs "泉州"），属于旧代码本身的差异，
// 迁移阶段不做业务逻辑上的统一，因此这里不与 trading-input 共用。
export const PAYMENT_COMPANY_CODE_MAP: Record<string, string> = {
  910: '泉州',
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

export function sortCompanyNamesByCode(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const codeA =
      Object.entries(PAYMENT_COMPANY_CODE_MAP).find(([, name]) => a.startsWith(name))?.[0] ||
      9999;
    const codeB =
      Object.entries(PAYMENT_COMPANY_CODE_MAP).find(([, name]) => b.startsWith(name))?.[0] ||
      9999;
    return Number(codeA) - Number(codeB);
  });
}
