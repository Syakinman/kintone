export function showNotification(message: string) {
  const badge = document.createElement('div');
  badge.className = 'kintone-monorepo-badge';
  badge.textContent = message;
  document.body.appendChild(badge);

  setTimeout(() => badge.remove(), 3000);
}