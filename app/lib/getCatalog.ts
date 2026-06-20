import catalogData from '../data/catalog.json';
import { catalogSchema, Catalog } from '../types/catalog';

export function getCatalog(): Catalog {
  // This parses the JSON data against our Zod schema.
  // If the JSON structure is invalid, Zod throws an error (which is good for catching issues early).
  return catalogSchema.parse(catalogData);
}
