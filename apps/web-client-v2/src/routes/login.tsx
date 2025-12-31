import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Box } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setToken, setSystemRoles, setUserProfile } = useAuthStore()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock login - in production this would be handled by Keycloak
    setToken('mock-token')
    setSystemRoles([])
    setUserProfile({
      id: 'user-1',
      email: 'user@example.com',
      username: 'demo',
      firstName: 'Demo',
      lastName: 'User',
    })
    navigate({ to: '/select-tenant' })
  }

  return (
    <div className="flex min-h-screen flex-col justify-center overflow-hidden bg-background">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col justify-center px-6 md:px-12 lg:px-32">
        <div className="mb-16 max-w-2xl md:mb-20">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-foreground text-foreground">
              <Box size={16} fill="currentColor" />
            </div>
            <span className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              Doc-Assembly
            </span>
          </div>

          <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl">
            {t('login.title', 'Login to')}
            <br />
            <span className="font-semibold">{t('login.subtitle', 'workspace.')}</span>
          </h1>
        </div>

        <div className="w-full max-w-[400px]">
          <form className="space-y-12" onSubmit={handleLogin}>
            <div className="space-y-8">
              <div className="group">
                <label className="mb-2 block font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-foreground">
                  {t('login.email', 'Username / Email')}
                </label>
                <input
                  type="email"
                  defaultValue="user@domain.com"
                  className="w-full rounded-none border-0 border-b-2 border-border bg-transparent py-3 font-light text-xl text-foreground outline-none transition-all placeholder:text-muted focus:border-foreground focus:ring-0"
                />
              </div>
              <div className="group">
                <label className="mb-2 block font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-foreground">
                  {t('login.password', 'Password')}
                </label>
                <input
                  type="password"
                  defaultValue="password123"
                  className="w-full rounded-none border-0 border-b-2 border-border bg-transparent py-3 font-light text-xl text-foreground outline-none transition-all placeholder:text-muted focus:border-foreground focus:ring-0"
                />
              </div>
            </div>

            <div className="flex flex-col items-start gap-8 pt-4">
              <button
                type="submit"
                className="group flex h-14 w-full items-center justify-between gap-3 rounded-none bg-foreground px-8 text-sm font-medium tracking-wide text-background transition-colors hover:bg-foreground/90"
              >
                <span>{t('login.authenticate', 'AUTHENTICATE')}</span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              <a
                href="#"
                className="border-b border-transparent pb-0.5 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                {t('login.recover', 'Recover password access')}
              </a>
            </div>
          </form>
        </div>

        <div className="absolute bottom-12 left-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 md:left-12 lg:left-32">
          v2.4 — Secure Environment
        </div>
      </div>
    </div>
  )
}
