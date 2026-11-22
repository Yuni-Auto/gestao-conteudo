const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function extract(start, end) {
  const first = html.indexOf(start);
  const last = html.indexOf(end, first);
  assert.ok(first !== -1 && last !== -1, `Trecho não encontrado: ${start}`);
  return html.slice(first, last);
}

function setup(posts) {
  const grid = { innerHTML: '' };
  const label = { textContent: '' };
  const overdue = { innerHTML: '' };
  const unscheduled = { innerHTML: '' };
  const ctx = vm.createContext({
    posts,
    document: { getElementById: (id) => ({ 'recording-grid': grid, 'recording-week-label': label, 'recording-overdue-grid': overdue, 'recording-unscheduled-grid': unscheduled })[id] },
    getWeekStart: (offset) => new Date(2026, 10, 22 + offset * 7),
    isoDate: (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    computeProductionSchedule: (post) => post.noSchedule ? [] : [{ status: { key: 'gravando' }, start: new Date(`${post.stageStart || '2026-11-22'}T12:00:00`), end: new Date(`${post.stageEnd || '2026-11-28'}T12:00:00`) }],
    postWorkflowStatus: (post) => post.plataformasStatus?.ig === 'em_teste' ? 'em_teste' : post.status,
    escapeHtml: (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
  });
  vm.runInContext([
    extract('const DIF_LEVELS = [', '\nfunction renderDifPicker'),
    extract('let recordingWeekOffset = 0;', '\nfunction renderAll()'),
  ].join('\n'), ctx);
  return { ctx, grid, label, overdue, unscheduled };
}

test('grade ordena Gravando por dificuldade e deixa não definidos no final', () => {
  const posts = [
    { id: 1, titulo: 'Sem nível', status: 'gravando', dificuldade: '', data: '', scenes: [] },
    { id: 2, titulo: 'Difícil', status: 'gravando', dificuldade: 5, data: '2026-11-20', scenes: [{}, {}] },
    { id: 3, titulo: 'Fácil', status: 'gravando', dificuldade: 'facil', data: '2026-11-23', formato: 'Reels', scenes: [{}] },
    { id: 4, titulo: 'Pronto', status: 'pronto', dificuldade: 1 },
    { id: 5, titulo: 'Teste', status: 'gravando', dificuldade: 1, plataformasStatus: { ig: 'em_teste' } },
    { id: 6, titulo: 'Médio', status: 'gravando', dificuldade: 3, data: '2026-11-21' },
  ];
  const { ctx, grid } = setup(posts);
  ctx.renderRecordingGrid();
  const ids = [...grid.innerHTML.matchAll(/onclick="openPost\((\d+)\)"/g)].map((match) => Number(match[1]));
  assert.deepEqual(ids, [3, 6, 2, 1]);
  assert.deepEqual(posts.map((post) => post.id), [1, 2, 3, 4, 5, 6]);
  assert.match(grid.innerHTML, /Nível 1 · Muito fácil/);
  assert.match(grid.innerHTML, /Dificuldade não definida/);
  assert.match(grid.innerHTML, /1 cena</);
  assert.match(grid.innerHTML, /2 cenas</);
  assert.match(grid.innerHTML, /Nenhuma cena cadastrada/);
  assert.doesNotMatch(grid.innerHTML, />Pronto</);
});

test('empates são ordenados por data e nome, sem data por último', () => {
  const { ctx, grid } = setup([
    { id: 1, titulo: 'Sem data', status: 'gravando', dificuldade: 2 },
    { id: 2, titulo: 'Z', status: 'gravando', dificuldade: 2, data: '2026-11-22' },
    { id: 3, titulo: 'A', status: 'gravando', dificuldade: 2, data: '2026-11-22' },
    { id: 4, titulo: 'Antes', status: 'gravando', dificuldade: 2, data: '2026-11-21' },
  ]);
  ctx.renderRecordingGrid();
  assert.deepEqual([...grid.innerHTML.matchAll(/onclick="openPost\((\d+)\)"/g)].map((match) => Number(match[1])), [4, 3, 2, 1]);
});

test('grade vazia informa a ausência de conteúdos e protege texto de cards', () => {
  const { ctx, grid } = setup([{ id: 1, status: 'pronto' }]);
  ctx.renderRecordingGrid();
  assert.match(grid.innerHTML, /Nenhum conteúdo com gravação prevista para esta semana/);
  ctx.posts = [{ id: 2, status: 'gravando', titulo: '<roteiro>', formato: '<vídeo>' }];
  ctx.renderRecordingGrid();
  assert.match(grid.innerHTML, /&lt;roteiro&gt;/);
  assert.match(grid.innerHTML, /&lt;vídeo&gt;/);
});

test('navegação separa semana, períodos anteriores e posts sem cronograma', () => {
  const { ctx, grid, label, overdue, unscheduled } = setup([
    { id: 1, titulo: 'Divisa', status: 'gravando', stageStart: '2026-11-28', stageEnd: '2026-12-01', dificuldade: 4 },
    { id: 2, titulo: 'Próxima', status: 'gravando', stageStart: '2026-12-01', stageEnd: '2026-12-02', dificuldade: 1 },
    { id: 3, titulo: 'Sem cronograma', status: 'gravando', noSchedule: true },
    { id: 4, titulo: 'Anterior', status: 'gravando', stageStart: '2026-11-15', stageEnd: '2026-11-21' },
    { id: 5, titulo: 'Publicada', status: 'publicada', stageStart: '2026-11-22', stageEnd: '2026-11-28' },
  ]);
  ctx.renderRecordingGrid();
  assert.match(label.textContent, /22\/11\/2026.*28\/11\/2026/);
  assert.match(grid.innerHTML, /Divisa/);
  assert.doesNotMatch(grid.innerHTML, /Próxima|Sem cronograma|Anterior|Publicada/);
  assert.match(overdue.innerHTML, /Anterior/);
  assert.match(unscheduled.innerHTML, /Sem cronograma/);
  ctx.changeRecordingWeek(1);
  assert.match(label.textContent, /29\/11\/2026.*05\/12\/2026/);
  assert.deepEqual([...grid.innerHTML.matchAll(/onclick="openPost\((\d+)\)"/g)].map((match) => Number(match[1])), [2, 1]);
  ctx.changeRecordingWeek(-2);
  assert.match(grid.innerHTML, /Anterior/);
  assert.match(overdue.innerHTML, /Nenhuma gravação de semanas anteriores/);
  assert.match(unscheduled.innerHTML, /Sem cronograma/);
  ctx.resetRecordingWeek();
  assert.match(grid.innerHTML, /Divisa/);
});

test('seções adicionais ordenam por dificuldade e não duplicam os posts da semana', () => {
  const { ctx, grid, overdue, unscheduled } = setup([
    { id: 1, titulo: 'Passado difícil', status: 'gravando', stageStart: '2026-11-15', stageEnd: '2026-11-21', dificuldade: 5 },
    { id: 2, titulo: 'Passado fácil', status: 'gravando', stageStart: '2026-11-15', stageEnd: '2026-11-21', dificuldade: 1 },
    { id: 3, titulo: 'Sem nível', status: 'gravando', noSchedule: true },
    { id: 4, titulo: 'Sem cronograma fácil', status: 'gravando', noSchedule: true, dificuldade: 2 },
    { id: 5, titulo: 'Esta semana', status: 'gravando', dificuldade: 3 },
    { id: 6, titulo: 'Semana futura', status: 'gravando', stageStart: '2026-11-29', stageEnd: '2026-12-01' },
  ]);
  ctx.renderRecordingGrid();
  const ids = (section) => [...section.innerHTML.matchAll(/onclick="openPost\((\d+)\)"/g)].map((match) => Number(match[1]));
  assert.deepEqual(ids(grid), [5]);
  assert.deepEqual(ids(overdue), [2, 1]);
  assert.deepEqual(ids(unscheduled), [4, 3]);
});
