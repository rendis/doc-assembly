import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/audit')({
  component: AuditLog,
})

function AuditLog() {
  const logs = [
    { action: 'User Login', user: 'john@example.com', timestamp: '2 mins ago', details: 'Successful login from 192.168.1.1' },
    { action: 'Template Created', user: 'jane@example.com', timestamp: '1 hour ago', details: 'Created "NDA Standard v3"' },
    { action: 'Document Signed', user: 'bob@example.com', timestamp: '3 hours ago', details: 'Signed "Contract-2024-001"' },
    { action: 'User Added', user: 'admin@example.com', timestamp: 'Yesterday', details: 'Added user alice@example.com' },
    { action: 'Settings Changed', user: 'admin@example.com', timestamp: '2 days ago', details: 'Updated system security settings' },
  ]

  return (
    <div className="p-8">
      <h1 className="mb-8 font-display text-4xl font-light tracking-tight">
        Audit Log
      </h1>
      <div className="rounded-sm border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Action
              </th>
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                User
              </th>
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Details
              </th>
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-4 font-medium">{log.action}</td>
                <td className="p-4 font-mono text-sm text-muted-foreground">{log.user}</td>
                <td className="p-4 text-sm text-muted-foreground">{log.details}</td>
                <td className="p-4 font-mono text-sm text-muted-foreground">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
