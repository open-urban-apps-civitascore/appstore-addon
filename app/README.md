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
MODELFORGE_BASE_URL="http://localhost:8001"
MODELFORGE_API_KEY="your-secret-key-here"
```

### 4. Start Model Forge for the Use-Case Install Demo
The Marketplace "Als Entwurf installieren" flow now reads the referenced DataSet
directly from Model Forge before storing a local draft in the Marketplace app.

Start Model Forge separately, for example:

```bash
cd ../../model-forge
docker compose up -d --build postgres model-forge
```

If you are already running the CIVITAS/CORE platform locally and `8000` / `5432`
are occupied, use the port overrides documented in the Model-Forge README, for
example:

```bash
MODELFORGE_HTTP_PORT=8001
MODELFORGE_DB_PORT=5544
MODELFORGE_PGADMIN_PORT=5051
```

The Marketplace expects a reachable DataSet for the `Baumkataster Starter`
demo-use-case. The minimal setup is:

1. Create the DataSet in Model Forge.
2. Create the `TreeRecord` DataStructure in Model Forge.
3. Attach the `TreeRecord` URN to the DataSet via `PUT /api/v1/datasets?id=...`.

The exact demo commands are:

```bash
curl -sS -X POST \
  'http://localhost:8001/api/v1/datasets' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: your-secret-key-here' \
  -d '{"title":"Baumkataster Starter"}'

curl -sS -X POST \
  'http://localhost:8001/api/v1/datastructures' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: your-secret-key-here' \
  -d '{
    "schema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "$id": "urn:core:platform:civitas:datastructure:demo:TreeRecord:1.0.0",
      "title": "TreeRecord",
      "type": "object",
      "required": ["treeId", "species", "location"],
      "properties": {
        "treeId": { "type": "string" },
        "species": { "type": "string" },
        "plantedAt": { "type": "string", "format": "date" },
        "location": {
          "type": "object",
          "required": ["lat", "lon"],
          "properties": {
            "lat": { "type": "number" },
            "lon": { "type": "number" }
          }
        }
      }
    }
  }'

curl -sS -X PUT \
  'http://localhost:8001/api/v1/datasets?id=urn%3Acore%3Aplatform%3Acivitas%3Adataset%3Acommon%3ABaumkataster-Starter%3A1.0.0' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: your-secret-key-here' \
  -d '{
    "id": "urn:core:platform:civitas:dataset:common:Baumkataster-Starter:1.0.0",
    "title": "Baumkataster Starter",
    "description": "Als Entwurf importierter Datensatz für einen kommunalen Baumkataster-Prototyp.",
    "version": "1.0",
    "dataStructureRefs": [
      "urn:core:platform:civitas:datastructure:demo:TreeRecord:1.0.0"
    ],
    "dataSourceRefs": [],
    "dataSinkRefs": [],
    "mappingRefs": [],
    "pipelineRefs": []
  }'
```

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
4. Click `Als Entwurf installieren`.
5. On the `Installiert` page:
   - inspect the generated draft
   - open `Importprotokoll anzeigen` to see the Model-Forge request, response and local draft payload
   - use `Entwurf entfernen` to reset the local Marketplace state for another test run

---

## Production Deployment

In a production environment (or when fully testing via `helmfile apply`), the manual Keycloak steps above are **not required**. 

The Keycloak Client and Client Secret are automatically provisioned by the `keycloak-config-cli` job using the infrastructure-as-code definitions found in `../deployment/keycloak-clients.yaml`. The secret is injected into the container at runtime.
