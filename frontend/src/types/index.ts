export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'REVIEWER' | 'VIEWER';

export type DocumentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type DocumentType =
  | 'USER_GUIDE'
  | 'API_REFERENCE'
  | 'TUTORIAL'
  | 'TROUBLESHOOTING'
  | 'RELEASE_NOTE'
  | 'INSTALLATION_GUIDE'
  | 'CONFIGURATION_GUIDE'
  | 'CODE_SAMPLE'
  | 'GENERAL';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  projectId: string;
  categoryId: string | null;
  createdById: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  status: DocumentStatus;
  docType: DocumentType;
  tags: string[];
  sortOrder: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  path: string;
  timestamp: string;
}
