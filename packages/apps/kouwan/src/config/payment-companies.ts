// 支払登録 / 支払一覧 / trading-input / chatwork-notify 共用的商社コード対照表。
export const COMPANY_CODE_MAP: Record<string, string> = {
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
      Object.entries(COMPANY_CODE_MAP).find(([, name]) => a.startsWith(name))?.[0] ||
      9999;
    const codeB =
      Object.entries(COMPANY_CODE_MAP).find(([, name]) => b.startsWith(name))?.[0] ||
      9999;
    return Number(codeA) - Number(codeB);
  });
}
