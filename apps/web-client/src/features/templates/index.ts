// API exports
export { templatesApi } from './api/templates-api';
export { versionsApi } from './api/versions-api';
export { foldersApi } from './api/folders-api';
export { tagsApi } from './api/tags-api';

// Component exports
export { TemplatesPage } from './components/TemplatesPage';
export { TemplateRow } from './components/TemplateRow';
export { TemplateExpandedContent } from './components/TemplateExpandedContent';
export { CreateVersionDialog } from './components/CreateVersionDialog';
export { StatusBadge } from './components/StatusBadge';
export { TagBadge, TagBadgeList } from './components/TagBadge';
export { FolderTree as FolderTreeComponent } from './components/FolderTree';
export { FilterBar } from './components/FilterBar';
export { Breadcrumb } from './components/Breadcrumb';

// Hook exports
export { useTemplates } from './hooks/useTemplates';
export { useFolders } from './hooks/useFolders';
export { useTags, TAG_COLORS } from './hooks/useTags';

// Type exports
export type {
  // Templates
  Template,
  TemplateListItem,
  TemplateWithDetails,
  TemplateWithAllVersions,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CloneTemplateRequest,
  TemplateCreateResponse,
  TemplateListParams,
  // Versions
  VersionStatus,
  TemplateVersion,
  TemplateVersionDetail,
  TemplateVersionInjectable,
  TemplateVersionSignerRole,
  Injectable,
  InjectableDataType,
  CreateVersionRequest,
  CreateVersionFromExistingRequest,
  UpdateVersionRequest,
  SchedulePublishRequest,
  ScheduleArchiveRequest,
  ListTemplateVersionsResponse,
  // Folders
  Folder,
  FolderTree,
  CreateFolderRequest,
  UpdateFolderRequest,
  MoveFolderRequest,
  // Tags
  Tag,
  TagWithCount,
  CreateTagRequest,
  UpdateTagRequest,
  AssignTagsRequest,
  // Common
  ListResponse,
} from './types';
