import type { SignerRole } from '../types'

const mockSignerRoles: SignerRole[] = [
  { id: '1', name: 'Sender', type: 'sender', email: 'admin@company.com' },
  { id: '2', name: 'Recipient', type: 'recipient' },
]

export function SignerRolesSidebar() {
  return (
    <div className="shrink-0 bg-muted/30 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Signer Roles
        </h2>
      </div>
      <div className="space-y-4">
        {mockSignerRoles.map((role) => (
          <div key={role.id} className="group relative">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    role.type === 'sender' ? 'bg-foreground' : 'border border-muted-foreground'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    role.type === 'sender' ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {role.name}
                </span>
              </div>
            </div>
            <div className="ml-1 border-l border-border pl-4">
              <div className="text-[10px] text-muted-foreground">
                {role.email || <span className="italic">Undefined</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
