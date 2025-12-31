import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import {
  refreshAccessToken,
  getUserInfo,
  setupTokenRefresh,
} from '@/lib/keycloak'
import { fetchMyRoles } from '@/features/auth/api/auth-api'
import { initializeTheme } from '@/stores/theme-store'
import { LoadingOverlay } from '@/components/common/LoadingSpinner'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    token,
    refreshToken,
    isAuthLoading,
    setAuthLoading,
    setUserProfile,
    setAllRoles,
    clearAuth,
    isTokenExpired,
  } = useAuthStore()

  useEffect(() => {
    // Initialize theme system
    const cleanupTheme = initializeTheme()

    const init = async () => {
      try {
        // Check if we have existing tokens
        if (token && refreshToken) {
          // If token is expired, try to refresh
          if (isTokenExpired()) {
            console.log('[Auth] Token expired, attempting refresh...')
            try {
              await refreshAccessToken()
              console.log('[Auth] Token refreshed successfully')
            } catch (error) {
              console.error('[Auth] Failed to refresh token:', error)
              clearAuth()
              setAuthLoading(false)
              return
            }
          }

          // Token is valid, load user info and roles
          try {
            const userInfo = await getUserInfo()
            setUserProfile({
              id: userInfo.sub,
              email: userInfo.email || '',
              firstName: userInfo.given_name,
              lastName: userInfo.family_name,
              username: userInfo.preferred_username,
            })

            // Fetch roles from API
            const roles = await fetchMyRoles()
            setAllRoles(roles)
            console.log('[Auth] User info and roles loaded')
          } catch (error) {
            console.error('[Auth] Failed to load user info or roles:', error)
            // Don't clear auth here - user is still authenticated
            // Roles will be empty but user can still navigate
          }
        }
      } catch (error) {
        console.error('[Auth] Initialization failed:', error)
        clearAuth()
      } finally {
        setAuthLoading(false)
      }
    }

    init()

    // Setup automatic token refresh
    const cleanupRefresh = setupTokenRefresh()

    return () => {
      cleanupTheme?.()
      cleanupRefresh()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isAuthLoading) {
    return <LoadingOverlay message="Initializing..." />
  }

  return <>{children}</>
}
