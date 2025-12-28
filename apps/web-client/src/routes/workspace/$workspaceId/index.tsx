import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$workspaceId/')({
  component: WorkspaceIndex,
})

function WorkspaceIndex() {
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Archivos y Carpetas</h3>
      <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">
        <p>Aquí irá el explorador de archivos (File Explorer)</p>
      </div>
    </div>
  )
}
