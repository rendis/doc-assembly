interface MemberManagementSectionProps {
  allowGuestAccess: boolean
  onGuestAccessChange: (value: boolean) => void
  adminContact: string
  onAdminContactChange: (value: string) => void
}

export function MemberManagementSection({
  allowGuestAccess,
  onGuestAccessChange,
  adminContact,
  onAdminContactChange,
}: MemberManagementSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-8 border-b border-border py-12 lg:grid-cols-12">
      <div className="pr-8 lg:col-span-4">
        <h3 className="mb-2 font-display text-xl font-medium text-foreground">
          Member Management
        </h3>
        <p className="font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
          Configure how new users interact with this workspace.
        </p>
      </div>
      <div className="space-y-12 lg:col-span-8">
        {/* Guest Access Toggle */}
        <label className="group flex cursor-pointer items-center justify-between">
          <div className="flex-1 pr-8">
            <span className="mb-1 block text-lg font-light text-foreground transition-colors group-hover:text-muted-foreground">
              Allow Guest Access
            </span>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Permit view-only access via shared links
            </p>
          </div>
          <div className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={allowGuestAccess}
              onChange={(e) => onGuestAccessChange(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-8 w-14 rounded-none border border-border bg-muted transition-colors duration-300 peer-checked:border-foreground peer-checked:bg-foreground" />
            <div className="absolute left-1 top-1 h-6 w-6 border border-border bg-background transition-transform duration-300 peer-checked:translate-x-6 peer-checked:border-foreground" />
          </div>
        </label>

        {/* Admin Contact */}
        <div className="group">
          <label
            htmlFor="admin_contact"
            className="mb-2 block font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-foreground"
          >
            Primary Admin Contact
          </label>
          <input
            type="email"
            id="admin_contact"
            value={adminContact}
            onChange={(e) => onAdminContactChange(e.target.value)}
            className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-xl font-light text-foreground outline-none transition-all placeholder:text-muted focus-visible:border-foreground focus-visible:ring-0"
          />
        </div>
      </div>
    </div>
  )
}
