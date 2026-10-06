import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = name => JSON.parse(readFileSync(path.join(root, 'shared', name), 'utf8'));
const pick = (value, keys) => Object.fromEntries(keys.filter(key => key in value).map(key => [key, value[key]]));
const projectKeys = ['id', 'name', 'knowledgeBaseId', 'createdTime', 'lastModified', 'description', 'character_list'];
const nodeKeys = ['id', 'name', 'abstract', 'child_ids', 'role', 'user', 'content', 'ragSources'];
const projects = read('projects/projects_metadata.json').projects
  .filter(project => project.id === 'proj_1763881375858_12ee36f5')
  .map(project => pick(project, projectKeys));
const scripts = Object.fromEntries(projects.map(project => [project.id, {
  structure: read(`projects/${project.id}/script.json`).structure.map(node => pick(node, nodeKeys)),
}]));
const knowledgeBases = Object.entries(read('knowledge_bases/kb_metadata.json').knowledge_bases).map(([name, kb]) => ({
  name, ...pick(kb, ['theme', 'categories', 'file_count', 'document_count', 'created_time',
    'graph_entities_count', 'graph_relationships_count']), exists: true,
}));
const files = Object.entries(read('uploads/metadata.json').files).map(([relative_path, file]) => ({
  relative_path, filename: relative_path.split('/').at(-1),
  ...pick(file, ['category', 'file_type', 'source_tag', 'upload_time']),
}));
const destination = path.join(root, 'frontend/src/showcase');
mkdirSync(destination, { recursive: true });
writeFileSync(path.join(destination, 'data.mjs'), `// Snapshot exported from shared; no backend is required.\nexport default ${JSON.stringify({ projects, scripts, knowledgeBases, files, tags: read('configs/source_tags.json').tags }, null, 2)};\n`);
console.log(`Exported ${projects.length} projects and ${Object.values(scripts).reduce((count, script) => count + script.structure.length, 0)} nodes.`);
