export enum Screen {
  LOGIN = 'LOGIN',
  WORKSPACE_SELECT = 'WORKSPACE_SELECT',
  DASHBOARD = 'DASHBOARD',
  DOCUMENTS = 'DOCUMENTS',
  TEMPLATES = 'TEMPLATES',
  SETTINGS = 'SETTINGS',
  EDITOR = 'EDITOR'
}

export interface Workspace {
  id: string;
  name: string;
  lastAccessed: string;
  users: number;
}

export interface DocFile {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'doc';
  items?: number;
  size?: string;
  date: string;
  status?: 'Draft' | 'Finalized' | 'Signed';
}