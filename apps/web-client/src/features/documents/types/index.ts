// Folders
export interface Folder {
  id: string;
  workspaceId: string;
  parentId?: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FolderTree extends Folder {
  children?: FolderTree[];
}

export interface CreateFolderRequest {
  parentId?: string;
  name: string;
}

// Templates & Versions
export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  name: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  scheduledPublishAt?: string;
  scheduledArchiveAt?: string;
  publishedAt?: string;
  archivedAt?: string;
  publishedBy?: string;
  archivedBy?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TemplateVersionDetail extends TemplateVersion {
  contentStructure?: Record<string, unknown>; // JSON Content for editor
  injectables?: TemplateVersionInjectable[];
  signerRoles?: TemplateVersionSignerRole[];
}

export interface TemplateVersionInjectable {
  id: string;
  templateVersionId: string;
  isRequired: boolean;
  defaultValue?: string;
  definition?: Record<string, unknown>; // Define InjectableDefinition if needed
  createdAt: string;
}

export interface TemplateVersionSignerRole {
  id: string;
  templateVersionId: string;
  roleName: string;
  anchorString: string;
  signerOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateVersionRequest {
  name: string;
  description?: string;
}
