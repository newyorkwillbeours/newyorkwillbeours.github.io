const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function page() {
  const html = fs.readFileSync('index.html', 'utf8');
  const scripts = [...html.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const elements = new Map();
  const context = {
    console, URL, URLSearchParams,
    window: { RACE_CONVEX_URL: 'https://example.convex.cloud' },
    location: { search: '?players=123&start=1', pathname: '/', hash: '#rules' },
    history: { replaceState: (a, b, url) => { context.cleanedUrl = url; } },
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { value: '', disabled: false, style: {}, replaceChildren() {} });
        return elements.get(id);
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(scripts[0], context);
  vm.runInContext(scripts.at(-1).replace(/main\(\);\s*$/, ''), context);
  vm.runInContext('render = () => paintCloud(); refreshAll = async () => {};', context);
  return { context, elements, run: code => vm.runInContext(code, context) };
}

test('legacy links are cleaned before the app starts', () => {
  const { context } = page();
  assert.equal(context.cleanedUrl, '/#rules');
});

test('joining requires no organizer key and updates from the saved database result', async () => {
  const { elements, run } = page();
  run(`cloud.ready = true; cloud.client = { mutation: async (name, args) => {
    if (name !== 'race:addPlayer' || Object.keys(args).join() !== 'accountId') throw new Error('Wrong public call');
    return { players: [147271596, args.accountId], start: 1791586800, revision: 2 };
  }}; paintCloud();`);
  assert.equal(elements.get('add-input').disabled, false);
  assert.equal(elements.get('add-btn').disabled, false);
  assert.equal(elements.get('start').disabled, true);
  elements.get('add-input').value = '123';
  await run('commitAdd(123)');
  assert.equal(run('state.ids.includes(123)'), true);
  assert.equal(run('cloud.revision'), 2);
  assert.equal(elements.get('add-input').value, '');
  assert.equal(elements.get('sync-info').textContent, 'Player saved to shared race');
});

test('a failed save keeps the entered ID and reports the error without adding a local row', async () => {
  const { elements, run } = page();
  run(`cloud.ready = true; cloud.client = { mutation: async () => { throw { data: 'Save failed' }; } }; paintCloud();`);
  elements.get('add-input').value = '123';
  await run('commitAdd(123)');
  assert.equal(elements.get('add-input').value, '123');
  assert.equal(run('state.ids.includes(123)'), false);
  assert.equal(run('state.errors.get("sync")'), 'Save failed');
  assert.equal(elements.get('add-btn').disabled, false);
});

test('an offline visitor can type but cannot silently save to local state', async () => {
  const { elements, run } = page();
  run('paintCloud()');
  assert.equal(elements.get('add-input').disabled, false);
  assert.equal(elements.get('add-btn').disabled, true);
  await run('commitAdd(123)');
  assert.equal(run('state.ids.length'), 0);
  assert.match(run('state.errors.get("sync")'), /connect/);
});
