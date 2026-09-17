const isProductionHost = location.hostname.includes('narumoto.cybozu.com');

export const PAYMENT_APP_ID = isProductionHost ? '149' : '351';
export const CHATWORK_ROOM_ID = isProductionHost ? '210325369' : '210427051';

// 迁移阶段不把旧源码中的 Chatwork Token 继续写进仓库。
// 请在当前子项目的 .env.local 中设置 VITE_CHATWORK_TOKEN。
export const CHATWORK_TOKEN = import.meta.env.VITE_CHATWORK_TOKEN ?? '';
