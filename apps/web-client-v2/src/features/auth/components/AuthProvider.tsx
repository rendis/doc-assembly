import { useEffect, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import {
  initKeycloak,
  useMockAuth,
  getToken,
  getUserProfile,
} from '@/lib/keycloak'
import { initializeTheme } from '@/stores/theme-store'
import { LoadingOverlay } from '@/components/common/LoadingSpinner'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitializing, setIsInitializing] = useState(true)
  const { setToken, setUserProfile, setAllRoles } = useAuthStore()

  useEffect(() => {
    // Initialize theme system
    const cleanupTheme = initializeTheme()

    const init = async () => {
      try {
        if (useMockAuth) {
          // Mock authentication
          setToken('mock-token')
          setUserProfile({
            id: 'mock-user-id',
            email: 'admin@doc-assembly.io',
            firstName: 'John',
            lastName: 'Doe',
            username: 'admin',
          })
          // Mock roles - give superadmin for development
          setAllRoles([
            { type: 'SYSTEM', role: 'SUPERADMIN', resourceId: null },
          ])
        } else {
          // Real Keycloak authentication
          const authenticated = await initKeycloak()

          if (authenticated) {
            const token = getToken()
            if (token) {
              setToken(token)
            }

            const profile = await getUserProfile()
            if (profile) {
              setUserProfile({
                id: profile.id || '',
                email: profile.email || '',
                firstName: profile.firstName,
                lastName: profile.lastName,
                username: profile.username,
              })
            }

            // TODO: Fetch roles from API
            // const roles = await fetchUserRoles()
            // setAllRoles(roles)
          }
        }
      } catch (error) {
        console.error('[Auth] Initialization failed:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    init()

    return () => {
      cleanupTheme?.()
    }
  }, [setToken, setUserProfile, setAllRoles])

  if (isInitializing) {
    return <LoadingOverlay message="Initializing..." />
  }

  return <>{children}</>
}
