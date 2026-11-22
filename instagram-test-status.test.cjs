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

function createContext() {
  const context = vm.createContext({
    Date,
    document: { getElementById: () => null },
    todayStr: () => '2026-11-22',
    platHora: () => '00:00',
    platDiaOk: () => true,
    posts: [],
  });
  vm.runInContext([
    extract('const ALL_STATUS = [', '\nconst GROUP_LABELS'),
    extract('const INSTAGRAM_TEST_STATUS = ', '\nconst FORMAT_ICON'),
    extract('function statusOptionsHtml(', '\nfunction togglePlatDatesList'),
    extract('function platEffectiveDate(', '\nfunction syncAllPlatChecks'),
    extract('function getStatusMeta(', '\n/* ─── Tempo de produção'),
    extract('function getPostsDueNow()', '\nfunction loadDayKeys'),
    extract('function statusPill(', '\nfunction getPostRequiredTags'),
  ].join('\n'), context);
  return context;
}

test('Em teste é oferecido somente no Instagram e mantém seleção', () => {
  const ctx = createContext();
  for (const format of ['Reels', 'Carousel', 'Foto', 'Story', 'Live', 'Shorts', 'Thread', 'Pin']) {
    assert.match(ctx.statusOptionsHtml(format, 'em_teste', 'ig'), /value="em_teste" selected>Em teste/);
    for (const plat of ['tt', 'li', 'yt', 'pt', 'tw']) {
      assert.doesNotMatch(ctx.statusOptionsHtml(format, 'em_teste', plat), /value="em_teste"/);
    }
    assert.doesNotMatch(vm.runInContext('JSON.stringify(statusesForFormato(' + JSON.stringify(format) + '))', ctx), /em_teste/);
  }
});

test('status aparece corretamente e não é tratado como publicado', () => {
  const ctx = createContext();
  assert.equal(ctx.getStatusMeta('em_teste').label, 'Em teste');
  assert.equal(ctx.groupOf('em_teste'), 'complete');
  assert.match(ctx.statusPill('em_teste'), /st-em-teste.*Em teste/);
  assert.equal(ctx.platEffectiveStatus({ status: 'publicada', plataformasStatus: { ig: 'em_teste' } }, 'ig'), 'em_teste');
  assert.equal(ctx.platEffectiveStatus({ status: 'publicada', plataformasStatus: { ig: 'em_teste' } }, 'tt'), 'publicada');
});

test('menu de status mostra Em teste no grupo Complete', () => {
  const ctx = createContext();
  const dropdown = { innerHTML: '' };
  ctx.document.getElementById = () => dropdown;
  ctx.GROUP_LABELS = { todo: 'To-do', progress: 'In progress', complete: 'Complete' };
  vm.runInContext(extract('function buildStatusDropdown(', '\nfunction toggleStatusDropdown'), ctx);
  ctx.buildStatusDropdown('Carousel', 'em_teste', ['ig']);
  const completeIndex = dropdown.innerHTML.indexOf('>Complete</div>');
  const testIndex = dropdown.innerHTML.indexOf('<span>Em teste</span>');
  assert.ok(completeIndex !== -1 && testIndex > completeIndex);
  ctx.buildStatusDropdown('Carousel', 'programada', ['tt']);
  assert.doesNotMatch(dropdown.innerHTML, /<span>Em teste<\/span>/);
});

test('Instagram em teste continua recebendo lembrete de publicação', () => {
  const ctx = createContext();
  ctx.posts = [
    { id: 1, data: '2026-11-22', status: 'publicada', plataformas: ['ig', 'tt'], plataformasStatus: { ig: 'em_teste' } },
    { id: 2, data: '2026-11-22', status: 'programada', plataformas: ['tt'] },
    { id: 3, data: '2026-11-22', status: 'gravando', plataformas: ['ig'] },
  ];
  assert.deepEqual(Array.from(ctx.getPostsDueNow(), (item) => item.key), ['1:ig', '2:tt']);
});

test('entrada e saída de Em teste preservam status das outras plataformas', () => {
  const ctx = createContext();
  const post = { status: 'programada', plataformas: ['ig', 'tt', 'li'], plataformasStatus: { tt: 'publicada' } };
  assert.equal(ctx.setPostWorkflowStatus(post, 'em_teste'), true);
  assert.equal(post.status, 'programada');
  assert.equal(ctx.postWorkflowStatus(post), 'em_teste');
  assert.equal(ctx.platEffectiveStatus(post, 'ig'), 'em_teste');
  assert.equal(ctx.platEffectiveStatus(post, 'tt'), 'publicada');
  assert.equal(ctx.platEffectiveStatus(post, 'li'), 'programada');
  assert.equal(ctx.setPostWorkflowStatus(post, 'pronto'), true);
  assert.equal(ctx.postWorkflowStatus(post), 'pronto');
  assert.equal(ctx.platEffectiveStatus(post, 'ig'), 'pronto');
  assert.equal(ctx.platEffectiveStatus(post, 'tt'), 'publicada');
  assert.equal(ctx.platEffectiveStatus(post, 'li'), 'programada');
});

test('não permite Em teste para post sem Instagram', () => {
  const ctx = createContext();
  const post = { status: 'programada', plataformas: ['tt'] };
  assert.equal(ctx.setPostWorkflowStatus(post, 'em_teste'), false);
  assert.equal(post.status, 'programada');
  assert.equal(post.plataformasStatus, undefined);
});
