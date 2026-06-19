# Appstore UI — Design System Spec

Goal: make the **appstore-addon** look and feel like the **CIVITAS/CORE v2
portal** so it reads as a native part of the platform. This spec is extracted
from the actual portal-frontend code (not just screenshots):
`civitas/civitas-core-platform/portal-frontend`.

Reference files (in the portal-frontend repo):
- `src/app/globals.css` — design tokens
- `src/app/layout.tsx`, `src/app/(main)/layout.tsx` — app shell
- `src/components/appSidebar/**`, `src/components/appHeader/**` — nav chrome
- `src/components/ui/**` — shadcn/ui primitives
- `src/components/page-container`, `page-header`, `content-card` — page scaffold
- `components.json` — shadcn config

---

## 1. Stack & conventions

The portal and the appstore already share the same base: **Next.js (App
Router) + React 19 + Tailwind CSS v4**. To match the portal, adopt:

| Concern | Portal choice | Action for appstore |
| --- | --- | --- |
| UI primitives | **shadcn/ui** (`style: "new-york"`, Radix UI under the hood) | Add shadcn/ui, same style |
| Icons | **lucide-react** | Add `lucide-react` |
| Class merging | `clsx` + `tailwind-merge` via a `cn()` helper | Add `cn()` (see §3) |
| Variants | `class-variance-authority` (cva) | Add `class-variance-authority` |
| Fonts | **IBM Plex Sans** + **IBM Plex Mono** (`next/font/google`) | Switch from Geist to IBM Plex |
| Theming | CSS variables in OKLCH, light + `.dark` | Copy token block (§2) |
| Toasts | `sonner` | Add when needed |
| i18n | `next-intl` (de/en), language switch in header | Optional; add if multilingual |
| Tables | `@tanstack/react-table` | Add for list/overview pages |
| Path alias | `@/*` → `src/*` | Appstore uses `@/*` → root; keep or align |

> Note: the appstore currently ships the create-next-app defaults (Geist font,
> plain `globals.css` with hex colors). The steps below replace those.

---

## 2. Design tokens (copy verbatim)

The portal defines everything through CSS variables in **OKLCH**. Replace the
appstore's `app/globals.css` `:root`/`@theme` with the portal's token set so
colors, radius, and fonts match exactly.

Key brand facts:
- **Primary brand color** ≈ `oklch(49.999% 0.11934 242.772)` (CIVITAS blue).
  The sidebar logo tile uses the literal hex `#036aa1` — the same blue.
- **Radius** base is `0.625rem`; `sm/md/lg/xl` derived from it.
- **Fonts** are bound to `--font-ibm-plex-sans` / `--font-ibm-plex-mono`.
- Status colors: `--success`, `--warn`, `--error`, `--status-label`.

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-ibm-plex-sans);
  --font-mono: var(--font-ibm-plex-mono);
  /* sidebar, chart, primary/secondary/muted/accent, destructive, border, ring,
     success/warn/error/status-label, radius-sm..xl — copy from portal globals.css */
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(49.999% 0.11934 242.772);
  --primary-foreground: oklch(0.985 0 0);
  --primary-light: oklch(55.167% 0.01387 285.878);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(98.511% 0.00011 271.152);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --sidebar: oklch(100% 0.00011 271.152);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --success: oklch(75.099% 0.17584 156.33);
  --warn: oklch(85.148% 0.17171 99.388);
  --error: oklch(67.512% 0.20416 358.512);
  --status-label: oklch(90.196% 0.02539 233.145);
  /* ...full set incl. .dark { } block — copy from portal globals.css */
}

@layer base {
  * { @apply border-border outline-ring/50; }
  h1 { @apply font-sans font-semibold text-xl text-foreground; }
  h2, h3, h4, h5, h6 { @apply font-sans font-semibold text-foreground; }
  body { @apply bg-background text-foreground font-sans font-normal; }
}
```

> Always copy the **complete** `:root` and `.dark` blocks from
> `portal-frontend/src/app/globals.css` — the snippet above is abbreviated.
> Use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`)
> in components — never hard-coded hex.

---

## 3. Setup steps

1. **Fonts** — in the root `layout.tsx`, replace Geist with IBM Plex:
   ```ts
   import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
   const ibmPlexSans = IBM_Plex_Sans({
     variable: '--font-ibm-plex-sans', subsets: ['latin'],
     weight: ['300','400','500','600','700'],
   })
   const ibmPlexMono = IBM_Plex_Mono({
     variable: '--font-ibm-plex-mono', subsets: ['latin'],
     weight: ['300','400','500','600','700'],
   })
   // <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}>
   ```
2. **`cn()` helper** at `lib/utils.ts`:
   ```ts
   import { type ClassValue, clsx } from 'clsx'
   import { twMerge } from 'tailwind-merge'
   export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
   ```
3. **shadcn/ui** — init with the same config (`components.json`):
   `style: "new-york"`, `baseColor: "neutral"`, `cssVariables: true`,
   `iconLibrary: "lucide"`, RSC on. Then add the primitives you need
   (button, badge, table, sidebar, breadcrumb, dropdown-menu, input, select,
   dialog, tooltip, separator, skeleton, sonner …).
4. **Tokens** — paste the token block from §2.

---

## 4. App shell layout

The portal wraps authenticated pages in a fixed **sidebar + header + scrollable
content** shell. Mirror this for the appstore's main area.

```
SidebarProvider
├─ AppSidebar (collapsible="icon")
│   ├─ SidebarHeader  → logo tile (#036aa1) + tenant name + "CIVITAS/CORE"
│   ├─ SidebarContent → grouped nav sections (see §5)
│   └─ SidebarFooter  → user avatar + name/email + menu (incl. logout)
└─ SidebarInset (h-svh, --header-height ≈ spacing(13), --layout-padding ≈ spacing(6))
    ├─ AppHeader  → SidebarTrigger | breadcrumbs | (right) language select
    └─ <div> page content </div>  + <Toaster/>
```

Layout facts to copy:
- The inset sets CSS custom props: `--header-height: calc(spacing(13))`,
  `--layout-padding: calc(spacing(6))`; header is `sticky top-0 border-b`.
- Sidebar header logo: an `aspect-square size-8 rounded-lg bg-[#036aa1]` tile
  with the white CIVITAS mark, then a two-line label (tenant name +
  muted `CIVITAS/CORE`). Tenant name from `NEXT_PUBLIC_TENANT_NAME`.
- Use shadcn's `sidebar.tsx` primitive (`Sidebar`, `SidebarInset`,
  `SidebarProvider`, `SidebarMenu*`, `SidebarTrigger`, `SidebarGroup*`).

---

## 5. Navigation model

Nav is declared as data, then rendered. Sections → collapsible groups → items.
Pattern from `appSidebarItems.ts` + `AppSidebarContent.tsx`:

```ts
interface NavItem { title: string; url: string; icon?: LucideIcon;
  external?: boolean; requiredPermission?: PermissionName; items?: NavItem[] }
interface NavSection { title: string; items: NavItem[] }
```

- Sections in the portal: **Platform** (Our data → Datasets / Data sources /
  Data structures), **Admin** (Tenant management → Users / Groups / Roles /
  Permissions), **Help** (Documentation, external link).
- Active state: `isActive={pathname === item.url}` (and parent active if any
  child matches). Use `usePathname()`.
- Collapsible groups use `Collapsible` + a `ChevronRight` that rotates on open
  (`group-data-[state=open]/collapsible:rotate-90`).
- Permission-gated items are filtered out when the user lacks the permission;
  empty groups/sections are dropped. The appstore can start without
  permissions and add the same filter later.
- For the appstore, define your own sections (e.g. **Marketplace** → Browse /
  Installed; **Help** → Documentation) using the same structure so it visually
  matches.

---

## 6. Page scaffold

Pages use a consistent header + body. Building blocks:

- **`PageContainer`** — CSS-grid wrapper: a fixed header row + a
  `minmax(0, …)` scrollable body. Prop `headerType` picks header height
  (`onlyTitle` | `withPrimaryTabs` | `withSubTabsOrSubtitle` |
  `withBothTabsRows`).
- **`PageHeader`** — `<h1>` (`text-3xl font-bold`, truncates with tooltip),
  optional `badgeTitle` (outline `Badge`), optional `subtitle`
  (`text-muted-foreground`), optional primary tabs / segmented control, and a
  `customElement` slot on the right for page actions (e.g. a primary button).
- **`ContentCard`** — `bg-white p-[var(--layout-padding)] border rounded-sm`,
  flex column, optional `footerElement` (`text-xs`).

Typical overview page (matches the **Groups**/**Datasets** screenshots):
header with title + right-aligned primary action button (`+ New Group` /
`+ Create Dataset`), a filter/search input, a table, and pagination
(results-per-page select + page nav).

Data-fetching pattern: the route `page.tsx` is an async Server Component that
reads `searchParams`, fetches via a server request, and renders a client list
component with the data + total count (see
`app/(main)/groups/page.tsx`).

---

## 7. Component patterns (cva variants)

Use cva for variant-driven components, matching the portal's API so markup is
portable.

**Button** (`components/ui/button.tsx`):
- variants: `default` (primary blue), `destructive`, `outline`, `secondary`,
  `ghost`, `link`.
- sizes: `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` (size-9), `normal`.
- `asChild` via Radix `Slot`. Primary CTA = `default`.

**Badge** (`components/ui/badge.tsx`):
- variants: `default`, `secondary`, `destructive`, `outline`.
- The "Configured"/status pills and page-header badges use `outline`.

**Other primitives present in the portal** (add as needed): `table`, `input`,
`select`, `dialog`, `dropdown-menu`, `tooltip`, `separator`, `breadcrumb`,
`checkbox`, `switch`, `tabs`, `skeleton`, `popover`, `command`, `sonner`,
`avatar`, `scroll-area`, `sheet`, `form` (react-hook-form + zod).

---

## 8. Do / Don't

**Do**
- Use semantic color tokens (`bg-primary`, `text-muted-foreground`,
  `border-border`). They make light/dark + brand changes free.
- Reuse shadcn primitives with the portal's variant names.
- Keep the sidebar + header shell identical so cross-app navigation feels
  seamless.
- Drive nav and page headers from data/props, as the portal does.

**Don't**
- Hard-code hex colors (except the one brand tile `#036aa1`, kept for parity).
- Re-style primitives ad hoc — extend via cva variants instead.
- Diverge fonts; IBM Plex is part of the brand identity.

---

## 9. Minimal first slice for the appstore

To get from the current bare page to portal-consistent quickly:
1. Tokens + IBM Plex fonts + `cn()` (§2–3).
2. shadcn init + add `button`, `badge`, `sidebar`, `breadcrumb`,
   `dropdown-menu`, `avatar`, `separator`, `table`, `input`, `tooltip`.
3. Build the shell: `AppSidebar` (logo tile + Marketplace/Help sections +
   user footer with logout) and `AppHeader` (trigger + breadcrumbs).
4. Build one overview page with `PageHeader` (title + primary action) +
   `ContentCard` + table + pagination — mirroring the Groups screen.

This yields an appstore that visually reads as the same product as
CIVITAS/CORE v2.
