import { z } from 'zod';

export const deploymentRefSchema = z.object({
  type: z.enum(['helm', 'git', 'bundle']),
  url: z.string().url(),
  chartName: z.string().optional(),
  path: z.string().optional()
});

export const addonSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(1),
  description: z.string(),
  version: z.string(),
  author: z.string(),
  iconUrl: z.string().url().optional(),
  civitasCoreVersion: z.string(),
  requiredCapabilities: z.array(z.string()).optional(),
  deploymentRef: deploymentRefSchema
});

export const catalogSchema = z.object({
  version: z.string(),
  updatedAt: z.string().datetime(),
  addons: z.array(addonSchema)
});

// Infer TypeScript types directly from the Zod schemas
export type DeploymentRef = z.infer<typeof deploymentRefSchema>;
export type Addon = z.infer<typeof addonSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
