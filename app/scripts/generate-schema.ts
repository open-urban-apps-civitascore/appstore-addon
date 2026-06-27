import { z } from 'zod';
import { catalogSchema } from '../types/catalog';
import fs from 'fs';
import path from 'path';

// Generate the JSON Schema from the Zod Schema.
// Zod 4 has a built-in exporter; the standalone `zod-to-json-schema` package
// only supports Zod 3 and emits an empty schema against Zod 4.
const jsonSchema = z.toJSONSchema(catalogSchema, { target: 'draft-7' });

// Define the output path
const outputPath = path.resolve(__dirname, '../data/catalog-addon.schema.json');

// Write the JSON Schema to the file
fs.writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2) + '\n');

console.log(`✅ Successfully generated JSON Schema at ${outputPath}`);
