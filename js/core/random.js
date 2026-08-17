export function hashSeed(value) {
  const text = String(value ?? Date.now());
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

export function nextRandom(state) {
  let value = state >>> 0 || 1;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  const nextState = value >>> 0;
  return { state: nextState, value: nextState / 4294967296 };
}

export function randomInt(state, min, max) {
  const next = nextRandom(state);
  return {
    state: next.state,
    value: Math.floor(next.value * (max - min + 1)) + min
  };
}

export function shuffle(values, initialState) {
  const result = [...values];
  let state = initialState;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const pick = randomInt(state, 0, index);
    state = pick.state;
    [result[index], result[pick.value]] = [result[pick.value], result[index]];
  }
  return { state, value: result };
}

export function pick(values, state) {
  if (!values.length) return { state, value: undefined };
  const result = randomInt(state, 0, values.length - 1);
  return { state: result.state, value: values[result.value] };
}

export function createId(prefix = 'id') {
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}
