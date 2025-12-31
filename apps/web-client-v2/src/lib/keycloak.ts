import Keycloak from 'keycloak-js'

// Check if mock auth is enabled
export const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === 'true'

// Keycloak configuration
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'doc-assembly',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'web-client',
}

// Create Keycloak instance (only if not using mock auth)
let keycloak: Keycloak | null = null

if (!useMockAuth) {
  keycloak = new Keycloak(keycloakConfig)
}

/**
 * Initialize Keycloak
 */
export async function initKeycloak(): Promise<boolean> {
  if (useMockAuth || !keycloak) {
    console.log('[Auth] Mock authentication enabled')
    return true
  }

  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      checkLoginIframe: false,
    })

    if (authenticated) {
      console.log('[Auth] User is authenticated')
      // Set up token refresh
      setInterval(async () => {
        try {
          await keycloak?.updateToken(60)
        } catch {
          console.error('[Auth] Failed to refresh token')
        }
      }, 60000)
    }

    return authenticated
  } catch (error) {
    console.error('[Auth] Keycloak initialization failed:', error)
    return false
  }
}

/**
 * Login with Keycloak
 */
export function login(): void {
  if (useMockAuth) {
    console.log('[Auth] Mock login - redirecting would happen here')
    return
  }

  keycloak?.login()
}

/**
 * Logout from Keycloak
 */
export function logout(): void {
  if (useMockAuth) {
    console.log('[Auth] Mock logout')
    return
  }

  keycloak?.logout({
    redirectUri: window.location.origin,
  })
}

/**
 * Get current token
 */
export function getToken(): string | undefined {
  if (useMockAuth) {
    return 'mock-token'
  }

  return keycloak?.token
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (useMockAuth) {
    return true
  }

  return keycloak?.authenticated ?? false
}

/**
 * Get user profile from Keycloak
 */
export async function getUserProfile(): Promise<{
  id?: string
  email?: string
  firstName?: string
  lastName?: string
  username?: string
} | null> {
  if (useMockAuth) {
    return {
      id: 'mock-user-id',
      email: 'admin@doc-assembly.io',
      firstName: 'John',
      lastName: 'Doe',
      username: 'admin',
    }
  }

  if (!keycloak?.authenticated) {
    return null
  }

  try {
    await keycloak.loadUserProfile()
    return {
      id: keycloak.subject,
      email: keycloak.profile?.email,
      firstName: keycloak.profile?.firstName,
      lastName: keycloak.profile?.lastName,
      username: keycloak.profile?.username,
    }
  } catch (error) {
    console.error('[Auth] Failed to load user profile:', error)
    return null
  }
}

export { keycloak }
