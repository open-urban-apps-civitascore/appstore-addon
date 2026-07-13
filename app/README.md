# Civitas Marketplace Add-on

This is a Next.js application that serves as the Central Add-on Marketplace for CivitasCore.

## Local Development Workflow

To achieve the fastest development feedback loop, we run this Next.js app locally (`pnpm dev`) against a local Keycloak instance provided by the `civitas-core-platform` Docker Compose stack.

Since we are skipping the automated Helm deployment in this mode, you need to configure the Keycloak Client **manually once**.

### 1. Start the Platform Infrastructure
Start the local database, Keycloak, and API Gateway using the core platform's dev environment:
```bash
cd ../civitas-core-platform/dev-environment
./start-portal-dev.sh --frontend=skip
```

### 2. Configure Keycloak (Manual Step)
1. Open Keycloak Admin Console: [http://localhost:8080/admin/](http://localhost:8080/admin/)
2. Log in with `admin` / `admin`.
3. Select the **`civitas-core`** Realm in the top left dropdown.
4. Go to **Clients** -> **Create client**:
   - **Client ID:** `marketplace-addon`
   - **Client authentication:** ON
   - **Valid redirect URIs:** 
     - `http://localhost:3001/api/auth/callback/keycloak`
     - `http://localhost:3001`
   - **Valid post logout redirect URIs:** `http://localhost:3001`
   - Save the client.
5. Go to the **Credentials** tab and copy the **Client Secret**.

### 3. Configure Local Environment Variables
Create a `.env.local` file in this `app/` directory and populate it with your copied secret:

```env
AUTH_SECRET="your-local-random-development-secret-string"
AUTH_KEYCLOAK_ID="marketplace-addon"
AUTH_KEYCLOAK_SECRET="<paste-your-client-secret-here>"
AUTH_KEYCLOAK_ISSUER="http://localhost:8080/realms/civitas-core"
# The CivitasCore portal-backend REST API (the install path).
PORTAL_BACKEND_BASE_URL="http://localhost:8080"
# Dev-only stub for the gateway-injected auth headers (see below).
PORTAL_BACKEND_ALLOWED_SCOPE_IDS="*"
```

### 4. About the Use-Case Install Flow (portal-backend)
Installing a use case provisions a *running* use case through the CivitasCore
portal-backend REST API. The install orchestrator drives the DataSet lifecycle, in
order:

```
datastructure(s) → datasource → dataset(DRAFT) → pipeline + datasink
  → stage(DRAFT→READY) → release(READY→AVAILABLE, async)
```

The `release` returns `202 Accepted` and kicks off the platform's provisioning saga
(FROST project, APISIX route, NiFi pipeline); the marketplace records the install
locally and reflects the dataset's lifecycle status on the `Installiert` page.
Uninstall calls `unrelease` (tears the infrastructure back down) + `DELETE`.

> **Status of this path.** The endpoints, ordering, lifecycle and auth headers are
> implemented against the verified platform contract, but this repo has no live
> portal-backend or its OpenAPI spec, so the **request-body field names are
> assumptions**. They are centralized in one place —
> `lib/server/portal-backend/mapper.ts` — each marked `TODO(confirm)`. An
> end-to-end install cannot be verified here; confirm the payloads against a live
> instance / a local spike before relying on it.

**Auth headers.** The portal-backend's data-entity endpoints expect
`X-Allowed-Scope-Ids` and `X-Api-Request: true`, normally injected by APISIX + OPA
after a Keycloak login. This is abstracted behind a pluggable provider
(`lib/server/portal-backend/auth.ts`). Dev uses a stub that emits configured/
placeholder headers; the real Keycloak-token + gateway flow is a documented `TODO`.

### 5. Start the Dev Server
```bash
pnpm install
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001). You will be prompted to log in using the Civitas Keycloak instance.

### 6. Verify the Install Flow in the UI
Use the following path:

1. Log in to the Marketplace.
2. Open `Anwendungsfälle`.
3. Open `Baumkataster Starter`.
4. Click `Im Portal-Backend bereitstellen`.
5. On the `Installiert` page:
   - inspect the provisioned use case and its lifecycle status
   - open `Provisionierungsprotokoll anzeigen` to see the ordered portal-backend
     call sequence (with response status codes)
   - use `Entwurf entfernen` to unrelease + delete on the portal-backend and reset
     the local Marketplace state for another test run

> Until the assumed payload field names are confirmed against a live portal-backend
> (see step 4), a real install will not complete end-to-end; the sequence, headers
> and lifecycle handling are exercised by the unit tests (`npm test`).

---

## Production Deployment

In a production environment (or when fully testing via `helmfile apply`), the manual Keycloak steps above are **not required**. 

The Keycloak Client and Client Secret are automatically provisioned by the `keycloak-config-cli` job using the infrastructure-as-code definitions found in `../deployment/keycloak-clients.yaml`. The secret is injected into the container at runtime.
