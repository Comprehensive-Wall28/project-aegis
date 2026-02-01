/**
 * Type definitions for the Parity Checker tool
 */

export interface ComparisonOptions {
  module?: string;
  json: boolean;
  html: boolean;
  all: boolean;
}

// Route Information
export interface RouteInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  fullPath: string; // includes prefix
  handlerName: string;
  controllerName: string;
  fileName: string;
  middleware: string[];
  guards: string[];
  parameters: {
    path: string[];
    query: string[];
    body: string | null;
  };
  hasAuth: boolean;
  hasCsrf: boolean;
}

// Service Method Information
export interface ServiceMethodInfo {
  name: string;
  className: string;
  fileName: string;
  parameters: ParameterInfo[];
  returnType: string;
  hasAuditLogging: boolean;
  auditActions: string[];
  validations: string[];
  repositoryMethodsCalled: string[];
  isAsync: boolean;
}

export interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
}

// Repository Method Information
export interface RepositoryMethodInfo {
  name: string;
  className: string;
  fileName: string;
  parameters: ParameterInfo[];
  returnType: string;
  queryPattern: 'safe-filter' | 'direct' | 'aggregation' | 'unknown';
  usesTransaction: boolean;
  modelName: string;
}

// Controller Method Information
export interface ControllerMethodInfo {
  name: string;
  className: string;
  fileName: string;
  httpMethod: string;
  path: string;
  decorators: string[];
  parameters: ParameterInfo[];
  returnType: string;
  guards: string[];
  hasAuth: boolean;
}

// Schema/Model Information
export interface SchemaInfo {
  name: string;
  fileName: string;
  fields: FieldInfo[];
  indexes: string[];
  virtuals: string[];
}

export interface FieldInfo {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  ref?: string;
  enum?: string[];
}

// Parsed Backend Data
export interface ParsedBackendData {
  routes: RouteInfo[];
  controllers: ControllerMethodInfo[];
  services: ServiceMethodInfo[];
  repositories: RepositoryMethodInfo[];
  schemas: SchemaInfo[];
  utils: UtilInfo[];
  middleware: MiddlewareInfo[];
}

export interface UtilInfo {
  name: string;
  fileName: string;
  exports: string[];
  functions: string[];
}

export interface MiddlewareInfo {
  name: string;
  fileName: string;
  type: 'function' | 'class';
}

// Comparison Results
export interface RouteComparison {
  matched: MatchedRoute[];
  missingInNest: RouteInfo[];
  extraInNest: RouteInfo[];
  methodMismatch: MethodMismatchInfo[];
}

export interface MatchedRoute {
  express: RouteInfo;
  nest: RouteInfo;
  issues: string[];
}

export interface MethodMismatchInfo {
  path: string;
  expressMethod: string;
  nestMethod: string;
  expressHandler: string;
  nestHandler: string;
}

export interface ServiceComparison {
  matched: MatchedService[];
  missingInNest: ServiceMethodInfo[];
  extraInNest: ServiceMethodInfo[];
  signatureMismatch: SignatureMismatchInfo[];
}

export interface MatchedService {
  express: ServiceMethodInfo;
  nest: ServiceMethodInfo;
  issues: string[];
}

export interface SignatureMismatchInfo {
  methodName: string;
  serviceName: string;
  expressParams: ParameterInfo[];
  nestParams: ParameterInfo[];
  reason: string;
}

export interface RepositoryComparison {
  matched: MatchedRepository[];
  missingInNest: RepositoryMethodInfo[];
  extraInNest: RepositoryMethodInfo[];
}

export interface MatchedRepository {
  express: RepositoryMethodInfo;
  nest: RepositoryMethodInfo;
  issues: string[];
}

export interface AuditLoggingComparison {
  withAudit: ServiceMethodInfo[];
  missingAudit: MissingAuditInfo[];
}

export interface MissingAuditInfo {
  methodName: string;
  serviceName: string;
  expressAuditAction: string;
  fileName: string;
}

export interface SchemaComparison {
  matched: MatchedSchema[];
  missingInNest: SchemaInfo[];
  extraInNest: SchemaInfo[];
  fieldMismatch: FieldMismatchInfo[];
}

export interface MatchedSchema {
  express: SchemaInfo;
  nest: SchemaInfo;
  issues: string[];
}

export interface FieldMismatchInfo {
  schemaName: string;
  expressFields: string[];
  nestFields: string[];
  missingFields: string[];
  extraFields: string[];
}

// Parity Report
export interface ParityReport {
  timestamp: string;
  expressPath: string;
  nestPath: string;
  module?: string;
  routes: RouteComparison;
  services: ServiceComparison;
  repositories: RepositoryComparison;
  schemas: SchemaComparison;
  auditLogging: AuditLoggingComparison;
  utils: {
    matched: string[];
    missingInNest: string[];
  };
  middleware: {
    matched: string[];
    missingInNest: string[];
  };
  summary: ParitySummary;
  issues: ParityIssue[];
}

export interface ParitySummary {
  parityScore: number; // 0-100
  critical: number;
  warnings: number;
  info: number;
  totalExpressRoutes: number;
  totalNestRoutes: number;
  totalExpressServices: number;
  totalNestServices: number;
}

export interface ParityIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'route' | 'service' | 'repository' | 'schema' | 'audit' | 'util' | 'middleware';
  message: string;
  expressFile?: string;
  nestFile?: string;
  suggestion?: string;
}

// Module mapping for name normalization
export interface ModuleMapping {
  expressName: string;
  nestName: string;
  expressFiles: string[];
  nestFiles: string[];
}

export const MODULE_MAPPINGS: ModuleMapping[] = [
  {
    expressName: 'auth',
    nestName: 'auth',
    expressFiles: ['authController.ts', 'AuthService.ts'],
    nestFiles: ['auth.controller.ts', 'auth.service.ts'],
  },
  {
    expressName: 'task',
    nestName: 'tasks',
    expressFiles: ['taskController.ts', 'TaskService.ts', 'TaskRepository.ts'],
    nestFiles: ['tasks.controller.ts', 'tasks.service.ts', 'task.repository.ts'],
  },
  {
    expressName: 'note',
    nestName: 'notes',
    expressFiles: ['noteController.ts', 'NoteService.ts', 'NoteRepository.ts'],
    nestFiles: ['notes.controller.ts', 'notes.service.ts', 'note.repository.ts'],
  },
  {
    expressName: 'folder',
    nestName: 'folders',
    expressFiles: ['folderController.ts', 'FolderService.ts', 'FolderRepository.ts'],
    nestFiles: ['folders.controller.ts', 'folders.service.ts', 'folders.repository.ts'],
  },
  {
    expressName: 'calendar',
    nestName: 'calendar',
    expressFiles: ['calendarController.ts', 'CalendarService.ts', 'CalendarEventRepository.ts'],
    nestFiles: ['calendar.controller.ts', 'calendar.service.ts', 'calendar.repository.ts'],
  },
  {
    expressName: 'gpa',
    nestName: 'gpa',
    expressFiles: ['gpaController.ts', 'GPAService.ts', 'CourseRepository.ts'],
    nestFiles: ['gpa.controller.ts', 'gpa.service.ts', 'gpa.repository.ts'],
  },
  {
    expressName: 'vault',
    nestName: 'vault',
    expressFiles: ['vaultController.ts', 'VaultService.ts', 'FileMetadataRepository.ts'],
    nestFiles: ['vault.controller.ts', 'vault.service.ts', 'vault.repository.ts'],
  },
  {
    expressName: 'social',
    nestName: 'social',
    expressFiles: ['socialController.ts', 'social/*.ts'],
    nestFiles: ['social.controller.ts', 'social.service.ts'],
  },
  {
    expressName: 'share',
    nestName: 'share',
    expressFiles: ['shareController.ts', 'ShareService.ts', 'SharedFileRepository.ts', 'SharedLinkRepository.ts'],
    nestFiles: [], // Missing!
  },
  {
    expressName: 'publicShare',
    nestName: 'public-share',
    expressFiles: ['publicShareController.ts', 'PublicShareService.ts'],
    nestFiles: [], // Missing!
  },
  {
    expressName: 'activity',
    nestName: 'activity',
    expressFiles: ['activityController.ts', 'auditController.ts'],
    nestFiles: ['activity.controller.ts', 'activity.service.ts'],
  },
  {
    expressName: 'mention',
    nestName: 'mention',
    expressFiles: ['mentionController.ts', 'MentionService.ts'],
    nestFiles: [], // Missing controller, service exists in common
  },
];

// Method name mappings (Express -> NestJS naming conventions)
export const METHOD_NAME_MAPPINGS: Record<string, string> = {
  // CRUD operations
  getTasks: 'findAll',
  getTask: 'findOne',
  createTask: 'create',
  updateTask: 'update',
  deleteTask: 'remove',
  // Notes
  getNotes: 'findAll',
  getNote: 'findOne',
  createNote: 'create',
  updateNote: 'update',
  deleteNote: 'remove',
  // Folders
  getFolders: 'findAll',
  getFolder: 'findOne',
  createFolder: 'create',
  updateFolder: 'update',
  deleteFolder: 'remove',
  // Calendar
  getEvents: 'findAll',
  getEvent: 'findOne',
  createEvent: 'create',
  updateEvent: 'update',
  deleteEvent: 'remove',
  // Auth
  login: 'login',
  register: 'register',
  logout: 'logout',
  getProfile: 'getProfile',
  updateProfile: 'updateProfile',
  // Special
  reorderTasks: 'reorder',
  getUpcomingTasks: 'findUpcoming',
};
