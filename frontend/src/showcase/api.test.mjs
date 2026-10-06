import test from 'node:test';
import assert from 'node:assert/strict';
import { showcaseFetch } from './api.js';

test('browse every preset project without network access', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unexpected network request'); };
  try {
    const { projects } = await (await showcaseFetch('/api/v1/projects')).json();
    assert.ok(projects.length > 0);
    for (const project of projects) {
      const script = await (await showcaseFetch(`/api/v1/projects/${project.id}/script`)).json();
      assert.ok(script.structure.length > 0);
      const ids = new Set(script.structure.map(node => node.id));
      for (const node of script.structure) {
        assert.ok((node.child_ids || []).every(id => ids.has(id)));
      }
    }
    for (const route of ['files', 'categories', 'source-tags', 'knowledge-bases', 'knowledge-base/list']) {
      assert.equal((await showcaseFetch(`/api/v1/${route}`)).status, 200);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reject mutations and generation without changing the snapshot', async () => {
  const before = await (await showcaseFetch('/api/v1/projects')).text();
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal((await showcaseFetch('/api/v1/projects', { method })).status, 403);
    assert.equal((await showcaseFetch('/api/v1/generate/node-content-stream', { method })).status, 403);
  }
  assert.equal(await (await showcaseFetch('/api/v1/projects')).text(), before);
  assert.equal((await showcaseFetch('/api/v1/projects/missing/script')).status, 404);
});
