import { useAuthStore } from '@/stores/auth-store'

/**
 * Keycloak configuration from environment variables
 */
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'doc-assembly',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'web-client',
}

/**
 * Token response from Keycloak
 */
export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_expires_in: number
  token_type: string
  id_token?: string
  scope?: string
}

/**
 * Keycloak error response
 */
export interface KeycloakError {
  error: string
  error_description?: string
}

/**
 * User info from Keycloak
 */
export interface KeycloakUserInfo {
  sub: string
  email?: string
  email_verified?: boolean
  preferred_username?: string
  given_name?: string
  family_name?: string
  name?: string
}

/**
 * Get the token endpoint URL
 */
function getTokenEndpoint(): string {
  return `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`
}

/**
 * Get the logout endpoint URL
 */
function getLogoutEndpoint(): string {
  return `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/logout`
}

/**
 * Get the userinfo endpoint URL
 */
function getUserInfoEndpoint(): string {
  return `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/userinfo`
}

/**
 * Login with username and password using Direct Access Grant
 */
export async function loginWithCredentials(
  username: string,
  password: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: keycloakConfig.clientId,
    username,
    password,
    scope: 'openid profile email',
  })

  const response = await fetch(getTokenEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error: KeycloakError = await response.json()
    throw new Error(error.error_description || error.error || 'Login failed')
  }

  return response.json()
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<TokenResponse> {
  const { refreshToken } = useAuthStore.getState()

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: keycloakConfig.clientId,
    refresh_token: refreshToken,
  })

  const response = await fetch(getTokenEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error: KeycloakError = await response.json()
    throw new Error(error.error_description || error.error || 'Token refresh failed')
  }

  const tokens: TokenResponse = await response.json()

  // Update tokens in store
  useAuthStore.getState().setTokens(
    tokens.access_token,
    tokens.refresh_token,
    tokens.expires_in
  )

  return tokens
}

/**
 * Get user info from Keycloak
 */
export async function getUserInfo(): Promise<KeycloakUserInfo> {
  const { token } = useAuthStore.getState()

  if (!token) {
    throw new Error('No access token available')
  }

  const response = await fetch(getUserInfoEndpoint(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get user info')
  }

  return response.json()
}

/**
 * Logout from Keycloak and clear local auth state
 */
export async function logout(): Promise<void> {
  const { refreshToken, clearAuth } = useAuthStore.getState()

  // Clear local auth state first
  clearAuth()

  // If we have a refresh token, try to invalidate it on Keycloak
  if (refreshToken) {
    try {
      const params = new URLSearchParams({
        client_id: keycloakConfig.clientId,
        refresh_token: refreshToken,
      })

      await fetch(getLogoutEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
    } catch (error) {
      // Ignore logout errors - we've already cleared local state
      console.warn('[Auth] Failed to logout from Keycloak:', error)
    }
  }
}

/**
 * Check if token needs refresh (expires within 60 seconds)
 */
export function shouldRefreshToken(): boolean {
  const { tokenExpiresAt } = useAuthStore.getState()
  if (!tokenExpiresAt) return false
  // Refresh if token expires within 60 seconds
  return Date.now() > tokenExpiresAt - 60000
}

/**
 * Setup automatic token refresh
 * Returns a cleanup function to stop the refresh interval
 */
export function setupTokenRefresh(): () => void {
  const refreshInterval = setInterval(async () => {
    const { token, refreshToken } = useAuthStore.getState()

    // Only refresh if we have tokens and token needs refresh
    if (token && refreshToken && shouldRefreshToken()) {
      try {
        await refreshAccessToken()
        console.log('[Auth] Token refreshed successfully')
      } catch (error) {
        console.error('[Auth] Failed to refresh token:', error)
        // Clear auth on refresh failure - user needs to login again
        useAuthStore.getState().clearAuth()
      }
    }
  }, 30000) // Check every 30 seconds

  return () => clearInterval(refreshInterval)
}

/**
 * Parse JWT token to get payload (without verification)
 */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    const base64Url = parts[1]
    if (!base64Url) return null

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export { keycloakConfig }
