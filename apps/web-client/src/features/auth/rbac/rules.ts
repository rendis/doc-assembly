// --- Roles de Sistema ---
export const SystemRole = {
  SUPERADMIN: 'SUPERADMIN',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN'
} as const;
export type SystemRole = typeof SystemRole[keyof typeof SystemRole];

// --- Roles de Tenant ---
export const TenantRole = {
  OWNER: 'TENANT_OWNER',
  ADMIN: 'TENANT_ADMIN'
} as const;
export type TenantRole = typeof TenantRole[keyof typeof TenantRole];

// --- Roles de Workspace ---
export const WorkspaceRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER'
} as const;
export type WorkspaceRole = typeof WorkspaceRole[keyof typeof WorkspaceRole];

// --- Definición de "Capacidades" (Permissions) ---
export const Permission = {
  // Workspace Management
  WORKSPACE_VIEW: 'workspace:view',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_ARCHIVE: 'workspace:archive',
  
  // Member Management
  MEMBERS_VIEW: 'members:view',
  MEMBERS_INVITE: 'members:invite',
  MEMBERS_REMOVE: 'members:remove',
  MEMBERS_UPDATE_ROLE: 'members:update_role',

  // Content Management
  CONTENT_VIEW: 'content:view',
  CONTENT_CREATE: 'content:create',
  CONTENT_EDIT: 'content:edit',
  CONTENT_DELETE: 'content:delete',
  
  // Template Versioning
  VERSION_VIEW: 'version:view',
  VERSION_CREATE: 'version:create',
  VERSION_EDIT_DRAFT: 'version:edit_draft',
  VERSION_DELETE_DRAFT: 'version:delete_draft',
  VERSION_PUBLISH: 'version:publish',
  
  // Tenant Management
  TENANT_CREATE: 'tenant:create',
  TENANT_MANAGE_SETTINGS: 'tenant:manage_settings',
  TENANT_MANAGE_WORKSPACES: 'tenant:manage_workspaces'
} as const;
export type Permission = typeof Permission[keyof typeof Permission];

// --- Reglas de Negocio (Matriz de Autorización) ---

const COMMON_CONTENT_READ: Permission[] = [
  Permission.WORKSPACE_VIEW,
  Permission.MEMBERS_VIEW,
  Permission.CONTENT_VIEW,
  Permission.VERSION_VIEW
];

export const WORKSPACE_RULES: Record<WorkspaceRole, Permission[]> = {
  [WorkspaceRole.OWNER]: [
    ...COMMON_CONTENT_READ,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_ARCHIVE,
    Permission.MEMBERS_INVITE,
    Permission.MEMBERS_REMOVE,
    Permission.MEMBERS_UPDATE_ROLE,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_EDIT,
    Permission.CONTENT_DELETE,
    Permission.VERSION_CREATE,
    Permission.VERSION_EDIT_DRAFT,
    Permission.VERSION_DELETE_DRAFT,
    Permission.VERSION_PUBLISH
  ],
  [WorkspaceRole.ADMIN]: [
    ...COMMON_CONTENT_READ,
    Permission.WORKSPACE_UPDATE,
    Permission.MEMBERS_INVITE,
    Permission.MEMBERS_REMOVE,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_EDIT,
    Permission.CONTENT_DELETE,
    Permission.VERSION_CREATE,
    Permission.VERSION_EDIT_DRAFT,
    Permission.VERSION_DELETE_DRAFT,
    Permission.VERSION_PUBLISH
  ],
  [WorkspaceRole.EDITOR]: [
    ...COMMON_CONTENT_READ,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_EDIT,
    Permission.VERSION_CREATE,
    Permission.VERSION_EDIT_DRAFT
  ],
  [WorkspaceRole.OPERATOR]: [
    ...COMMON_CONTENT_READ
  ],
  [WorkspaceRole.VIEWER]: [
    ...COMMON_CONTENT_READ
  ]
};

export const TENANT_RULES: Record<TenantRole, Permission[]> = {
  [TenantRole.OWNER]: [
    Permission.TENANT_MANAGE_SETTINGS, 
    Permission.TENANT_MANAGE_WORKSPACES
  ],
  [TenantRole.ADMIN]: [
    Permission.TENANT_MANAGE_WORKSPACES
  ]
};
