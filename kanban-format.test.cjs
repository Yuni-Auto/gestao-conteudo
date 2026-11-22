const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const start = html.indexOf('function setGestaoKanbanFormato(');
const end = html.indexOf('\nfunction renderAll()', start);
assert.ok(start !== -1 && end !== -1, 'Funções do quadro não encontradas');

function createBoard() {
  const wrap = { innerHTML: '' };
  const chips = ['', 'Reels', 'Carousel', 'Foto', 'Story', 'Live', 'Shorts', 'Thread', 'Pin'].map((format) => ({
    dataset: { formato: format },
    active: format === '',
    pressed: String(format === ''),
    classList: { toggle(_name, active) { this.owner.active = active; } },
    setAttribute(_name, value) { this.pressed = value; },
  }));
  chips.forEach((chip) => { chip.classList.owner = chip; });
  const context = vm.createContext({
    document: { getElementById: () => wrap, querySelectorAll: () => chips },
    posts: [
      { titulo: 'Reel', status: 'gravando', formato: 'Reels', plataformas: ['ig'], data: '2026-01-01' },
      { titulo: 'Carrossel', status: 'gravando', formato: 'Carousel', plataformas: ['ig'], data: '2026-01-02' },
      { titulo: 'Outro reel', status: 'design', formato: 'Reels', plataformas: ['tt'], data: '2026-01-03' },
      { titulo: 'Ideia', status: 'ideia', formato: 'Reels', plataformas: ['ig'], data: '2026-01-04' },
    ],
    ALL_STATUS: [
      { key: 'ideia', group: 'todo', dot: '', label: 'Ideia' },
      { key: 'gravando', group: 'progress', dot: '', label: 'Gravando' },
      { key: 'design', group: 'progress', dot: '', label: 'Design' },
      { key: 'pronto', group: 'progress', dot: '', label: 'Pronto' },
    ],
    GROUP_LABELS: { progress: 'Em progresso', complete: 'Complete' },
    INSTAGRAM_TEST_STATUS: { key: 'em_teste', group: 'complete', dot: '', label: 'Em teste' },
    postWorkflowStatus: (post) => post.plataformas.includes('ig') && post.plataformasStatus?.ig === 'em_teste' ? 'em_teste' : post.status,
    activePlatFilter: null,
    activeFormatoFilter: null,
    gestaoKanbanFormato: '',
    renderGestaoKanbanCard: (post) => `<article>${post.titulo}</article>`,
  });
  vm.runInContext(html.slice(start, end), context);
  return { context, wrap, chips };
}

test('filtro local limita os cards e contagens, e todos restaura o quadro', () => {
  const { context, wrap, chips } = createBoard();
  context.renderGestaoKanban();
  assert.match(wrap.innerHTML, /Carrossel/);
  assert.doesNotMatch(wrap.innerHTML, /<article>Ideia<\/article>/);
  context.setGestaoKanbanFormato(chips[1]);
  assert.match(wrap.innerHTML, /<article>Reel<\/article>/);
  assert.match(wrap.innerHTML, /<article>Outro reel<\/article>/);
  assert.doesNotMatch(wrap.innerHTML, /Carrossel/);
  assert.deepEqual([...wrap.innerHTML.matchAll(/agenda-kanban-count">(\d+)/g)].map((match) => Number(match[1])), [1, 1, 0, 0]);
  assert.deepEqual(chips.filter((chip) => chip.active).map((chip) => chip.dataset.formato), ['Reels']);
  assert.equal(chips[1].pressed, 'true');
  assert.equal(chips[0].pressed, 'false');
  context.setGestaoKanbanFormato(chips[0]);
  assert.match(wrap.innerHTML, /Carrossel/);
  assert.deepEqual([...wrap.innerHTML.matchAll(/agenda-kanban-count">(\d+)/g)].map((match) => Number(match[1])), [2, 1, 0, 0]);
});

test('filtro local combina com filtros gerais sem alterá-los', () => {
  const { context, wrap, chips } = createBoard();
  context.activePlatFilter = 'ig';
  context.activeFormatoFilter = 'Carousel';
  context.setGestaoKanbanFormato(chips[1]);
  assert.doesNotMatch(wrap.innerHTML, /<article>/);
  context.setGestaoKanbanFormato(chips[0]);
  assert.match(wrap.innerHTML, /<article>Carrossel<\/article>/);
  assert.doesNotMatch(wrap.innerHTML, /<article>Reel<\/article>/);
  assert.equal(context.activePlatFilter, 'ig');
  assert.equal(context.activeFormatoFilter, 'Carousel');
});

test('chips oferecem os formatos cadastráveis e acionam o filtro local', () => {
  const group = html.match(/<div class="agenda-kanban-filter" id="gestao-kanban-formatos"[\s\S]*?<\/div>/);
  assert.ok(group);
  assert.match(group[0], /role="group"/);
  for (const format of ['', 'Reels', 'Carousel', 'Foto', 'Story', 'Live', 'Shorts', 'Thread', 'Pin']) {
    assert.match(group[0], new RegExp(`<button[^>]*data-formato="${format}"[^>]*aria-pressed="(?:true|false)"[^>]*onclick="setGestaoKanbanFormato\\(this\\)"`), `Formato ausente: ${format}`);
  }
});

test('posts com Instagram em teste aparecem apenas na coluna Em teste', () => {
  const { context, wrap } = createBoard();
  context.posts[0].plataformasStatus = { ig: 'em_teste' };
  context.renderGestaoKanban();
  const columns = wrap.innerHTML.split('<div class="agenda-kanban-col"').slice(1);
  const testColumn = columns.find((column) => column.includes('title="Em teste"'));
  assert.ok(testColumn);
  assert.match(testColumn, /agenda-kanban-group">Complete<\/div>/);
  assert.match(testColumn, /<article>Reel<\/article>/);
  assert.equal(columns.filter((column) => column.includes('<article>Reel</article>')).length, 1);
  context.setGestaoKanbanFormato({ dataset: { formato: 'Carousel' } });
  assert.doesNotMatch(wrap.innerHTML, /<article>Reel<\/article>/);
});
