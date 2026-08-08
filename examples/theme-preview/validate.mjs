import { join } from 'path';
import { validateContent, loadContent } from '@doodle-engine/toolkit';

const contentDir = join(process.cwd(), 'content');
const { registry, fileMap, config, parseErrors } = await loadContent(contentDir);
const errors = [...parseErrors, ...validateContent(registry, fileMap, config)];

console.log(errors.length > 0 ? errors : 'No content errors.');
if (errors.length > 0) process.exit(1);
