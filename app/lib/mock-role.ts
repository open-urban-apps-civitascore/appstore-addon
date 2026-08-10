import { cookies } from "next/headers";

/**
 * Which hat the viewer wears. Curation belongs to Civitas Connect e. V., not to
 * a commune — so the Kuratierung section only exists for that role.
 *
 * MOCK: a cookie the demo can flip in the sidebar. In a real deployment this is
 * a permission from the portal-backend (the curator role would be granted in
 * Keycloak / the assignments table), never a client-settable value.
 */
export type MockRole = "commune" | "curator";

export const MOCK_ROLE_COOKIE = "mock-role";

export const MOCK_ROLE_PROFILES: Record<
  MockRole,
  { person: string; initials: string; organisation: string; switchLabel: string }
> = {
  commune: {
    person: "Maria Krause",
    initials: "MK",
    organisation: "Stadt Musterstadt",
    switchLabel: "Kommune",
  },
  curator: {
    person: "Carla Neumann",
    initials: "CN",
    organisation: "Civitas Connect e. V.",
    switchLabel: "Civitas Connect",
  },
};

export async function getMockRole(): Promise<MockRole> {
  const store = await cookies();
  return store.get(MOCK_ROLE_COOKIE)?.value === "curator" ? "curator" : "commune";
}
