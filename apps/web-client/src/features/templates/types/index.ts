// ============================================================================
// Template Types
// ============================================================================

export type VersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Template {
  id: string;
  workspaceId: string;
  folderId?: string;
  title: string;
  isPublicLibrary: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface TemplateListItem {
  id: string;
  workspaceId: string;
  folderId?: string;
  title: string;
  isPublicLibrary: boolean;
  hasPublishedVersion: boolean;
  tags?: Tag[];
  createdAt: string;
  updatedAt?: string;
}

export interface TemplateWithDetails {
  id: string;
  workspaceId: string;
  folderId?: string;
  title: string;
  isPublicLibrary: boolean;
  folder?: Folder;
  tags?: Tag[];
  publishedVersion?: TemplateVersionDetail;
  createdAt: string;
  updatedAt?: string;
}

export interface TemplateWithAllVersions {
  id: string;
  workspaceId: string;
  folderId?: string;
  title: string;
  isPublicLibrary: boolean;
  folder?: Folder;
  tags?: Tag[];
  versions: TemplateVersionDetail[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTemplateRequest {
  title: string;
  folderId?: string;
  isPublicLibrary?: boolean;
  contentStructure?: Record<string, unknown>;
}

export interface UpdateTemplateRequest {
  title?: string;
  folderId?: string;
  isPublicLibrary?: boolean;
}

export interface CloneTemplateRequest {
  newTitle: string;
  targetFolderId?: string;
}

export interface TemplateCreateResponse {
  template: Template;
  initialVersion: TemplateVersion;
}

// ============================================================================
// Version Types
// ============================================================================

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  name: string;
  description?: string;
  status: VersionStatus;
  publishedAt?: string;
  publishedBy?: string;
  archivedAt?: string;
  archivedBy?: string;
  createdBy?: string;
  scheduledPublishAt?: string;
  scheduledArchiveAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TemplateVersionDetail extends TemplateVersion {
  // Supports both legacy byte array format and new JSON object format
  contentStructure?: number[] | Record<string, unknown>;
  injectables?: TemplateVersionInjectable[];
  signerRoles?: TemplateVersionSignerRole[];
}

export interface TemplateVersionInjectable {
  id: string;
  templateVersionId: string;
  definition: Injectable;
  isRequired: boolean;
  defaultValue?: string;
  createdAt: string;
}

export interface TemplateVersionSignerRole {
  id: string;
  templateVersionId: string;
  roleName: string;
  signerOrder: number;
  anchorString?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Injectable {
  id: string;
  workspaceId: string;
  key: string;
  label: string;
  dataType: InjectableDataType;
  description?: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type InjectableDataType = 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'IMAGE' | 'TABLE';

export interface CreateVersionRequest {
  name: string;
  description?: string;
}

export interface CreateVersionFromExistingRequest {
  name: string;
  sourceVersionId: string;
  description?: string;
}

export interface UpdateVersionRequest {
  name?: string;
  description?: string;
  contentStructure?: Record<string, unknown>;
}

export interface SchedulePublishRequest {
  scheduledAt: string;
}

export interface ScheduleArchiveRequest {
  scheduledAt: string;
}

// ============================================================================
// Folder Types
// ============================================================================

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
  name: string;
  parentId?: string;
}

export interface UpdateFolderRequest {
  name: string;
}

export interface MoveFolderRequest {
  newParentId?: string;
}

// ============================================================================
// Tag Types
// ============================================================================

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TagWithCount extends Tag {
  templateCount: number;
}

export interface CreateTagRequest {
  name: string;
  color: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

export interface AssignTagsRequest {
  tagIds: string[];
}

// ============================================================================
// List Response Types
// ============================================================================

export interface ListResponse<T> {
  data: T[];
  count: number;
}

export interface TemplateListParams {
  folderId?: string;
  hasPublishedVersion?: boolean;
  tagIds?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListTemplateVersionsResponse {
  items: TemplateVersion[];
}
