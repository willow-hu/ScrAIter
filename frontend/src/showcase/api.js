import data from './data.mjs';

export const SHOWCASE_READ_ONLY = true;

// Resolve the existing API contracts locally; never send keys or requests to a backend.
export async function showcaseFetch(input, options = {}) {
  if ((options.method || 'GET').toUpperCase() !== 'GET') {
    return Response.json({ detail: '展示模式不支持修改或生成' }, { status: 403 });
  }
  const path = new URL(input, 'https://showcase.invalid').pathname.replace(/^\/api\/v1/, '');
  const routes = {
    '/projects': { projects: data.projects, total_count: data.projects.length },
    '/knowledge-bases': { knowledge_bases: data.knowledgeBases },
    '/knowledge-base/list': { knowledge_bases: data.knowledgeBases },
    '/files': { files: data.files },
    '/categories': { categories: [...new Set(data.files.map(file => file.category))] },
    '/source-tags': { tags: data.tags },
  };
  if (Object.hasOwn(routes, path)) return Response.json(routes[path]);
  const match = path.match(/^\/projects\/([^/]+)(\/script)?$/);
  if (match) {
    const project = data.projects.find(item => item.id === match[1]);
    if (project) return Response.json(match[2] ? data.scripts[project.id] : project);
  }
  return Response.json({ detail: '没有对应的展示数据' }, { status: 404 });
}
