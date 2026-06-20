import { zodToJsonSchema } from 'zod-to-json-schema';
import { catalogSchema } from '../types/catalog';
import fs from 'fs';
import path from 'path';

// Generate the JSON Schema from the Zod Schema
const jsonSchema = zodToJsonSchema(catalogSchema, 'CatalogSchema');

// Define the output path
const outputPath = path.resolve(__dirname, '../data/catalog-addon.schema.json');

// Write the JSON Schema to the file
fs.writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2));

console.log(`✅ Successfully generated JSON Schema at ${outputPath}`);
