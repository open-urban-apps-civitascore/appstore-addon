# Civitas Marketplace Add-on

This is a Next.js application that serves as the Central Add-on Marketplace for CivitasCore.

## Local Development Workflow

To achieve the fastest development feedback loop, we run this Next.js app locally (`npm run dev`) against a local Keycloak instance provided by the `civitas-core-platform` Docker Compose stack.

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
```

### 4. Start the Dev Server
```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). You will be prompted to log in using the Civitas Keycloak instance.

---

## Production Deployment

In a production environment (or when fully testing via `helmfile apply`), the manual Keycloak steps above are **not required**. 

The Keycloak Client and Client Secret are automatically provisioned by the `keycloak-config-cli` job using the infrastructure-as-code definitions found in `../deployment/keycloak-clients.yaml`. The secret is injected into the container at runtime.
