// Player notes only: no discovery, rewards, or automatic objectives.
export const MAX_MAP_MARKS = 16;
export function cleanMapMarks(input) {
  const marks = [], ids = new Set();
  for (const mark of Array.isArray(input) ? input : []) {
    if (!mark || !Number.isInteger(mark.id) || mark.id < 1 || mark.id > 1e9 || ids.has(mark.id)) continue;
    if (![mark.x, mark.z].every(n => Number.isFinite(n) && Math.abs(n) <= 208)) continue;
    const label = typeof mark.label === 'string' ? mark.label.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32) : '';
    marks.push({ id: mark.id, x: mark.x, z: mark.z, label: label || 'Метка' }); ids.add(mark.id);
    if (marks.length === MAX_MAP_MARKS) break;
  }
  return marks;
}
export function addMapMark(state, x, z, label) {
  if (state.mapMarks.length >= MAX_MAP_MARKS) return false;
  const id = Math.max(0, ...state.mapMarks.map(m => m.id)) + 1;
  const mark = cleanMapMarks([{ id, x, z, label }])[0];
  if (!mark) return false;
  state.mapMarks.push(mark); return true;
}
