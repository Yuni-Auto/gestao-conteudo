const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const start = html.indexOf('function evprodCheckHtml(');
const end = html.indexOf('\nfunction eventoPostBlockHtml(', start);
assert.ok(start !== -1 && end !== -1);

function setup(kind) {
  const input = { checked: false };
  const classes = new Set();
  const card = { classList: { toggle: (name, state) => state ? classes.add(name) : classes.delete(name) }, querySelector: () => input };
  const list = { children: [card] };
  const count = { textContent: '' };
  const detail = { classList: { contains: () => true } };
  const eventModal = { open: false, classList: { contains: () => eventModal.open } };
  const eventBody = { scrollTop: 42 };
  const elements = {
    'detail-modal': detail, 'm-scene-list': list, 'm-slide-list': list,
    'm-scene-count': count, 'm-slide-count': count,
    'evprod-modal': eventModal, 'evprod-body': eventBody,
    'view-palestras': { style: { display: 'none' } },
  };
  const post = { id: 7, scenes: [{ feito: false }], slides: [{ feito: false }] };
  let saves = 0;
  let renders = 0;
  const ctx = vm.createContext({
    posts: [post], currentPostId: 7,
    document: { getElementById: (id) => elements[id] },
    savePosts: () => { saves++; },
    renderEventoProducao: () => { renders++; eventBody.scrollTop = 0; },
  });
  vm.runInContext(html.slice(start, end), ctx);
  return { ctx, post, input, classes, count, eventModal, eventBody, saves: () => saves, renders: () => renders, kind };
}

for (const [kind, field, label] of [['scene', 'scenes', 'cena'], ['slide', 'slides', 'slide']]) {
  test(`detalhe salva e desmarca ${label}, atualizando progresso sem abrir evento`, () => {
    const s = setup(kind);
    s.ctx.toggleEventoItem(7, kind, 0, true);
    assert.equal(s.post[field][0].feito, true);
    assert.equal(s.input.checked, true);
    assert.equal(s.classes.has('evprod-item-done'), true);
    assert.equal(s.count.textContent, `1/1 ${label}`);
    assert.equal(s.saves(), 1);
    assert.equal(s.renders(), 0);
    s.ctx.toggleEventoItem(7, kind, 0, false);
    assert.equal(s.post[field][0].feito, false);
    assert.equal(s.input.checked, false);
    assert.equal(s.classes.has('evprod-item-done'), false);
    assert.equal(s.count.textContent, `0/1 ${label}`);
  });
}

test('controle do evento e detalhe compartilham progresso e preservam rolagem', () => {
  const s = setup('scene');
  s.eventModal.open = true;
  s.ctx.toggleEventoItem(7, 'scene', 0, true);
  assert.equal(s.renders(), 1);
  assert.equal(s.eventBody.scrollTop, 42);
  assert.equal(s.ctx.productionCountText(s.post.scenes, 'cena'), '1/1 cena');
  assert.match(s.ctx.evprodCheckHtml(7, 'scene', 0, true, 'Feita'), /aria-label="Marcar cena 1 como feita".*checked/);
});
