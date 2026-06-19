import NextAuth from "next-auth"
import type { JWT } from "@auth/core/jwt"
import Keycloak from "next-auth/providers/keycloak"

// The appstore and the CIVITAS core portal both run on `localhost` in dev.
// Browser cookies are scoped by hostname, NOT port, so without distinct names
// the two apps overwrite each other's NextAuth cookies (session, PKCE, state).
// Because each app has its own AUTH_SECRET this breaks decryption and logout.
// Namespacing every auth cookie keeps the two sessions isolated.
const COOKIE_PREFIX = "appstore"
const useSecureCookies = process.env.NODE_ENV === "production"
const cookieName = (name: string) =>
    `${useSecureCookies ? "__Secure-" : ""}${COOKIE_PREFIX}.${name}`

const baseCookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: useSecureCookies,
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    session: {
        strategy: "jwt",
    },
    cookies: {
        sessionToken: {
            name: cookieName("session-token"),
            options: baseCookieOptions,
        },
        callbackUrl: {
            name: cookieName("callback-url"),
            options: baseCookieOptions,
        },
        csrfToken: {
            name: `${useSecureCookies ? "__Host-" : ""}${COOKIE_PREFIX}.csrf-token`,
            options: baseCookieOptions,
        },
        pkceCodeVerifier: {
            name: cookieName("pkce.code_verifier"),
            options: { ...baseCookieOptions, maxAge: 60 * 15 },
        },
        state: {
            name: cookieName("state"),
            options: { ...baseCookieOptions, maxAge: 60 * 15 },
        },
        nonce: {
            name: cookieName("nonce"),
            options: baseCookieOptions,
        },
    },
    providers: [
        Keycloak({
            clientId: process.env.AUTH_KEYCLOAK_ID,
            clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
            issuer: process.env.AUTH_KEYCLOAK_ISSUER,
        })
    ],
    callbacks: {
        // Persist the Keycloak id_token on first login so it can be used as the
        // id_token_hint for RP-initiated logout later.
        async jwt({ token, account }) {
            if (account) {
                return { ...token, id_token: account.id_token }
            }
            return token
        },
    },
    events: {
        // When the local NextAuth session is cleared, also terminate the
        // Keycloak SSO session (RP-initiated logout). Without this the SSO
        // session survives, so re-login is silent and the core platform stays
        // logged in.
        async signOut(message) {
            const keycloakIssuer = process.env.AUTH_KEYCLOAK_ISSUER
            if (!keycloakIssuer) {
                console.error("AUTH_KEYCLOAK_ISSUER environment variable is not set")
                return
            }

            const { token } = message as { token: JWT | null }

            try {
                const logoutParams = new URLSearchParams({
                    client_id: process.env.AUTH_KEYCLOAK_ID || "",
                })

                // id_token_hint lets Keycloak end the session without a
                // confirmation prompt.
                if (token?.id_token) {
                    logoutParams.set("id_token_hint", token.id_token as string)
                }

                const keycloakLogoutUrl = `${keycloakIssuer}/protocol/openid-connect/logout?${logoutParams.toString()}`
                const res = await fetch(keycloakLogoutUrl, { method: "GET" })
                if (!res.ok) {
                    console.error(
                        `Keycloak logout returned ${res.status}; SSO session may still be active`,
                    )
                }
            } catch (error) {
                console.error("Error during Keycloak logout:", error)
            }
        },
    },
})
