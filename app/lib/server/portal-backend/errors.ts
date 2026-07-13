/**
 * Error type for the CivitasCore portal-backend install path. Carries an HTTP
 * status the install/uninstall route can surface directly to the client, mirroring
 * the pattern the retired Model Forge client used (`BundleError`, the old
 * `ModelForgeError`) so the route's error handling stays uniform.
 */
export class PortalBackendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PortalBackendError";
  }
}
