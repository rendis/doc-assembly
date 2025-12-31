interface Integration {
  name: string
  status: 'connected' | 'disconnected' | 'pending'
}

interface IntegrationsStatusProps {
  integrations?: Integration[]
}

const defaultIntegrations: Integration[] = [
  { name: 'Salesforce Connected', status: 'connected' },
  { name: 'DocuSign Active', status: 'connected' },
]

export function IntegrationsStatus({
  integrations = defaultIntegrations,
}: IntegrationsStatusProps) {
  return (
    <div className="border-t border-border pt-8">
      <h3 className="mb-4 font-display text-lg font-semibold">Integrations</h3>
      <div className="space-y-3">
        {integrations.map((integration, i) => (
          <div
            key={i}
            className="flex items-center gap-3 font-mono text-xs text-muted-foreground"
          >
            <div
              className={`h-1.5 w-1.5 ${
                integration.status === 'connected'
                  ? 'bg-green-500'
                  : integration.status === 'pending'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
            />
            {integration.name}
          </div>
        ))}
      </div>
    </div>
  )
}
