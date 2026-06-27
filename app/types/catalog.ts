import { z } from 'zod';

export const deploymentRefSchema = z.object({
  type: z
    .enum(['helm', 'git', 'bundle'])
    .describe('The deployment mechanism used to install this add-on'),
  url: z.string().url().describe('URL to the Helm chart repository or Git repository'),
  chartName: z.string().optional().describe("Name of the chart if type is 'helm'"),
  path: z.string().optional().describe("Path within the repository if type is 'git'")
});

// One entry per supported CivitasCore version. The upstream add-ons track
// compatibility per Git branch (e.g. `main` for 1.2, `devel-v1.3` for 1.3),
// each with its own last-updated timestamp — so this is a list, not a scalar.
export const compatibilitySchema = z.object({
  coreVersion: z.string().describe("Supported CivitasCore version (e.g., '1.2')"),
  branch: z
    .string()
    .optional()
    .describe("Git branch that supports this Core version (e.g., 'main', 'devel-v1.3')"),
  lastUpdated: z.string().optional().describe('Timestamp this branch was last updated')
});

// Two distinct licenses are shown in the upstream UI: the license of the
// add-on integration itself, and the license of the wrapped tool.
export const licensesSchema = z.object({
  addon: z
    .string()
    .optional()
    .describe("License of the add-on integration itself (e.g., 'European Union Public License 1.2')"),
  tool: z
    .string()
    .optional()
    .describe("License of the wrapped upstream tool (e.g., 'Apache License 2.0')")
});

export const addonSchema = z.object({
  id: z.string().min(3).describe('Unique identifier for the add-on (e.g., airflow-addon)'),
  name: z.string().min(1).describe('Human-readable name'),
  description: z.string().describe('Short description of what the add-on does'),
  author: z
    .string()
    .describe('Publisher or maintainer of the add-on (currently the source repository namespace)'),
  categories: z
    .array(z.string())
    .describe("Free-form classification tags shown in the UI (e.g., 'Workflow', 'Storage')"),
  repository: z.string().url().optional().describe("URL of the add-on's source repository"),
  iconUrl: z.string().url().optional().describe('Optional URL to a logo or icon'),
  licenses: licensesSchema
    .optional()
    .describe("Licenses shown in the UI: the add-on integration's own license and the wrapped tool's license"),
  compatibility: z
    .array(compatibilitySchema)
    .min(1)
    .describe('One entry per supported CivitasCore version, tracked per Git branch'),
  requiredCapabilities: z
    .array(z.string())
    .optional()
    .describe("List of required platform capabilities or connectors (e.g., 'KEYCLOAK', 'APISIX_INGRESS')"),
  deploymentRef: deploymentRefSchema
});

export const catalogSchema = z.object({
  version: z.string().describe('Version of the catalog schema or data'),
  updatedAt: z.string().datetime(),
  addons: z.array(addonSchema)
});

// Infer TypeScript types directly from the Zod schemas
export type DeploymentRef = z.infer<typeof deploymentRefSchema>;
export type Compatibility = z.infer<typeof compatibilitySchema>;
export type Licenses = z.infer<typeof licensesSchema>;
export type Addon = z.infer<typeof addonSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
