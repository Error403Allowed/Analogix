let isFirstSession = false;

export function markFirstSession() {
  isFirstSession = true;
}

export function isFirstSessionActive(): boolean {
  return isFirstSession;
}
