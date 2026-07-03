import fs from 'fs';
import path from 'path';

import { z } from 'zod';

import { repoListIndexSchema } from '../types/repo-list';

// Generate the JSON Schema for the repo-list index from the Zod schema (the
// single source of truth). Zod 4 has a built-in exporter; the standalone
// `zod-to-json-schema` package only supports Zod 3 and emits an empty schema
// against Zod 4.
//
// The output is committed here (reviewable) AND copied into the catalog repo as
// `index.schema.json`, where its CI validates every `index.json` MR against it.
// Re-run `npm run generate-schema` and copy the file whenever the Zod schemas
// change (see README, "Schema & validation").
// `io: 'input'` so the schema validates hand-authored index.json: fields with a
// Zod `.default()` (categories, installQuestions, …) are optional for authors,
// not required as they would be in the parsed output type.
const jsonSchema = z.toJSONSchema(repoListIndexSchema, { target: 'draft-7', io: 'input' });

const annotated = {
  $id: 'https://gitlab.com/civitascore-openurbanapps/civitas-marketplace-catalog/index.schema.json',
  title: 'CIVITAS Marketplace Catalog Index',
  description:
    'Schema for the repo-list index.json (addons + use cases). Generated from the Zod schemas in the marketplace add-on — do not edit by hand.',
  ...jsonSchema,
};

const outputPath = path.resolve(__dirname, '../data/index.schema.json');
fs.writeFileSync(outputPath, JSON.stringify(annotated, null, 2) + '\n');

console.log(`✅ Generated JSON Schema at ${outputPath}`);
console.log('   Next: copy it into the catalog repo as index.schema.json and commit there.');
