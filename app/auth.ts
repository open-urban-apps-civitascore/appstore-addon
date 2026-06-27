import NextAuth from "next-auth"
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
        async jwt({ token, account }) {
            if (account) {
                token.id_token = account.id_token;
            }
            return token;
        },
        async session({ session, token }) {
            // @ts-expect-error - id_token is not typed on session natively
            session.id_token = token.id_token;
            return session;
        }
    }
})
