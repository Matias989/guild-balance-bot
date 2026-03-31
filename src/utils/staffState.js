const flowState = new Map();
const TTL = 5 * 60 * 1000;

export function setStaffState(userId, data) {
  flowState.set(userId, { ...data, ts: Date.now() });
}

export function getStaffState(userId) {
  const s = flowState.get(userId);
  if (!s) return null;
  if (Date.now() - s.ts > TTL) {
    flowState.delete(userId);
    return null;
  }
  return s;
}

export function clearStaffState(userId) {
  flowState.delete(userId);
}
