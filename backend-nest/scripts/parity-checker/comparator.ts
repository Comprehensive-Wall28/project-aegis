/**
 * Parity Comparator
 *
 * Compares parsed Express and NestJS backend data to identify
 * parity issues, missing functionality, and mismatches.
 */

import type {
  ParsedBackendData,
  ParityReport,
  RouteComparison,
  ServiceComparison,
  RepositoryComparison,
  SchemaComparison,
  AuditLoggingComparison,
  MatchedRoute,
  MatchedService,
  MatchedRepository,
  MatchedSchema,
  MethodMismatchInfo,
  SignatureMismatchInfo,
  MissingAuditInfo,
  FieldMismatchInfo,
  ParityIssue,
  RouteInfo,
  ServiceMethodInfo,
  RepositoryMethodInfo,
  SchemaInfo,
} from './types';
import { METHOD_NAME_MAPPINGS } from './types';

export class ParityComparator {
  compare(express: ParsedBackendData, nest: ParsedBackendData): ParityReport {
    const timestamp = new Date().toISOString();

    const routes = this.compareRoutes(express.routes, nest.routes);
    const services = this.compareServices(express.services, nest.services);
    const repositories = this.compareRepositories(express.repositories, nest.repositories);
    const schemas = this.compareSchemas(express.schemas, nest.schemas);
    const auditLogging = this.compareAuditLogging(express.services, nest.services);
    const utils = this.compareUtils(express.utils, nest.utils);
    const middleware = this.compareMiddleware(express.middleware, nest.middleware);

    // Collect all issues
    const issues = this.collectIssues(routes, services, repositories, schemas, auditLogging, utils, middleware);

    // Calculate summary
    const summary = this.calculateSummary(express, nest, routes, services, repositories, issues);

    return {
      timestamp,
      expressPath: 'backend/src',
      nestPath: 'backend-nest/src',
      routes,
      services,
      repositories,
      schemas,
      auditLogging,
      utils,
      middleware,
      summary,
      issues,
    };
  }

  private compareRoutes(expressRoutes: RouteInfo[], nestRoutes: RouteInfo[]): RouteComparison {
    const matched: MatchedRoute[] = [];
    const missingInNest: RouteInfo[] = [];
    const extraInNest: RouteInfo[] = [...nestRoutes];
    const methodMismatch: MethodMismatchInfo[] = [];

    for (const expRoute of expressRoutes) {
      // Find matching route by path (normalize paths)
      const normalizedExpPath = this.normalizePath(expRoute.fullPath);
      
      const nestMatch = nestRoutes.find((nr) => {
        const normalizedNestPath = this.normalizePath(nr.fullPath);
        return normalizedExpPath === normalizedNestPath;
      });

      if (nestMatch) {
        // Remove from extra list
        const extraIndex = extraInNest.findIndex((r) => r === nestMatch);
        if (extraIndex >= 0) {
          extraInNest.splice(extraIndex, 1);
        }

        // Check for method mismatch
        if (expRoute.method !== nestMatch.method) {
          methodMismatch.push({
            path: expRoute.fullPath,
            expressMethod: expRoute.method,
            nestMethod: nestMatch.method,
            expressHandler: expRoute.handlerName,
            nestHandler: nestMatch.handlerName,
          });
        }

        // Check for other issues
        const issues: string[] = [];
        
        if (expRoute.hasAuth && !nestMatch.hasAuth) {
          issues.push('Missing auth guard in NestJS');
        }
        if (expRoute.hasCsrf && !nestMatch.hasCsrf) {
          issues.push('Missing CSRF guard in NestJS');
        }
        if (expRoute.parameters.path.length !== nestMatch.parameters.path.length) {
          issues.push(`Path param count mismatch: Express(${expRoute.parameters.path.length}) vs Nest(${nestMatch.parameters.path.length})`);
        }

        matched.push({
          express: expRoute,
          nest: nestMatch,
          issues,
        });
      } else {
        // Try to find by similar path (might be different prefix)
        const similarNest = nestRoutes.find((nr) => {
          const expPathEnd = expRoute.path;
          const nestPathEnd = nr.path;
          return expPathEnd === nestPathEnd && expRoute.method === nr.method;
        });

        if (similarNest) {
          const extraIndex = extraInNest.findIndex((r) => r === similarNest);
          if (extraIndex >= 0) {
            extraInNest.splice(extraIndex, 1);
          }

          matched.push({
            express: expRoute,
            nest: similarNest,
            issues: [`Path prefix differs: ${expRoute.fullPath} vs ${similarNest.fullPath}`],
          });
        } else {
          missingInNest.push(expRoute);
        }
      }
    }

    return { matched, missingInNest, extraInNest, methodMismatch };
  }

  private compareServices(
    expressServices: ServiceMethodInfo[],
    nestServices: ServiceMethodInfo[]
  ): ServiceComparison {
    const matched: MatchedService[] = [];
    const missingInNest: ServiceMethodInfo[] = [];
    const extraInNest: ServiceMethodInfo[] = [...nestServices];
    const signatureMismatch: SignatureMismatchInfo[] = [];

    // Group by service class
    const expressGrouped = this.groupByClass(expressServices);
    const nestGrouped = this.groupByClass(nestServices);

    for (const [className, expMethods] of Object.entries(expressGrouped)) {
      // Find matching service in NestJS (handle naming differences)
      const nestClassName = this.mapServiceName(className);
      const nestMethods = nestGrouped[nestClassName] || [];

      for (const expMethod of expMethods) {
        // Find matching method (handle naming differences)
        const mappedName = METHOD_NAME_MAPPINGS[expMethod.name] || expMethod.name;
        
        const nestMatch = nestMethods.find(
          (nm) => nm.name === mappedName || nm.name === expMethod.name || this.similarMethodName(expMethod.name, nm.name)
        );

        if (nestMatch) {
          // Remove from extra list
          const extraIndex = extraInNest.findIndex((m) => m === nestMatch);
          if (extraIndex >= 0) {
            extraInNest.splice(extraIndex, 1);
          }

          const issues: string[] = [];

          // Check parameter count (allow for slight differences due to DI)
          const expParamCount = expMethod.parameters.filter(
            (p) => !['req', 'res', 'next'].includes(p.name.toLowerCase())
          ).length;
          const nestParamCount = nestMatch.parameters.filter(
            (p) => !['req', 'request'].includes(p.name.toLowerCase())
          ).length;

          if (Math.abs(expParamCount - nestParamCount) > 1) {
            signatureMismatch.push({
              methodName: expMethod.name,
              serviceName: className,
              expressParams: expMethod.parameters,
              nestParams: nestMatch.parameters,
              reason: `Parameter count differs: Express(${expParamCount}) vs Nest(${nestParamCount})`,
            });
          }

          // Check audit logging
          if (expMethod.hasAuditLogging && !nestMatch.hasAuditLogging) {
            issues.push('Missing audit logging in NestJS');
          }

          matched.push({
            express: expMethod,
            nest: nestMatch,
            issues,
          });
        } else {
          missingInNest.push(expMethod);
        }
      }
    }

    return { matched, missingInNest, extraInNest, signatureMismatch };
  }

  private compareRepositories(
    expressRepos: RepositoryMethodInfo[],
    nestRepos: RepositoryMethodInfo[]
  ): RepositoryComparison {
    const matched: MatchedRepository[] = [];
    const missingInNest: RepositoryMethodInfo[] = [];
    const extraInNest: RepositoryMethodInfo[] = [...nestRepos];

    const expressGrouped = this.groupByClass(expressRepos);
    const nestGrouped = this.groupByClass(nestRepos);

    for (const [className, expMethods] of Object.entries(expressGrouped)) {
      const nestClassName = this.mapRepositoryName(className);
      const nestMethods = nestGrouped[nestClassName] || [];

      for (const expMethod of expMethods) {
        const nestMatch = nestMethods.find(
          (nm) => nm.name === expMethod.name || this.similarMethodName(expMethod.name, nm.name)
        );

        if (nestMatch) {
          const extraIndex = extraInNest.findIndex((m) => m === nestMatch);
          if (extraIndex >= 0) {
            extraInNest.splice(extraIndex, 1);
          }

          const issues: string[] = [];

          if (expMethod.queryPattern !== nestMatch.queryPattern && expMethod.queryPattern !== 'unknown') {
            issues.push(`Query pattern differs: Express(${expMethod.queryPattern}) vs Nest(${nestMatch.queryPattern})`);
          }

          if (expMethod.usesTransaction && !nestMatch.usesTransaction) {
            issues.push('Missing transaction support in NestJS');
          }

          matched.push({
            express: expMethod,
            nest: nestMatch,
            issues,
          });
        } else {
          missingInNest.push(expMethod);
        }
      }
    }

    return { matched, missingInNest, extraInNest };
  }

  private compareSchemas(expressSchemas: SchemaInfo[], nestSchemas: SchemaInfo[]): SchemaComparison {
    const matched: MatchedSchema[] = [];
    const missingInNest: SchemaInfo[] = [];
    const extraInNest: SchemaInfo[] = [...nestSchemas];
    const fieldMismatch: FieldMismatchInfo[] = [];

    for (const expSchema of expressSchemas) {
      const nestMatch = nestSchemas.find(
        (ns) =>
          ns.name.toLowerCase() === expSchema.name.toLowerCase() ||
          ns.name.toLowerCase().replace('schema', '') === expSchema.name.toLowerCase()
      );

      if (nestMatch) {
        const extraIndex = extraInNest.findIndex((s) => s === nestMatch);
        if (extraIndex >= 0) {
          extraInNest.splice(extraIndex, 1);
        }

        const issues: string[] = [];
        const expFields = expSchema.fields.map((f) => f.name);
        const nestFields = nestMatch.fields.map((f) => f.name);

        const missingFields = expFields.filter((f) => !nestFields.includes(f));
        const extraFields = nestFields.filter((f) => !expFields.includes(f));

        if (missingFields.length > 0 || extraFields.length > 0) {
          fieldMismatch.push({
            schemaName: expSchema.name,
            expressFields: expFields,
            nestFields: nestFields,
            missingFields,
            extraFields,
          });
        }

        matched.push({
          express: expSchema,
          nest: nestMatch,
          issues,
        });
      } else {
        missingInNest.push(expSchema);
      }
    }

    return { matched, missingInNest, extraInNest, fieldMismatch };
  }

  private compareAuditLogging(
    expressServices: ServiceMethodInfo[],
    nestServices: ServiceMethodInfo[]
  ): AuditLoggingComparison {
    const withAudit: ServiceMethodInfo[] = [];
    const missingAudit: MissingAuditInfo[] = [];

    // Find Express services that have audit logging
    const expressWithAudit = expressServices.filter((s) => s.hasAuditLogging);

    for (const expService of expressWithAudit) {
      // Find matching NestJS service method
      const nestMatch = nestServices.find(
        (ns) =>
          this.similarMethodName(expService.name, ns.name) ||
          ns.name === METHOD_NAME_MAPPINGS[expService.name]
      );

      if (nestMatch) {
        if (nestMatch.hasAuditLogging) {
          withAudit.push(nestMatch);
        } else {
          missingAudit.push({
            methodName: expService.name,
            serviceName: expService.className,
            expressAuditAction: expService.auditActions[0] || 'UNKNOWN',
            fileName: expService.fileName,
          });
        }
      }
    }

    return { withAudit, missingAudit };
  }

  private compareUtils(
    expressUtils: { name: string; fileName: string; exports: string[] }[],
    nestUtils: { name: string; fileName: string; exports: string[] }[]
  ) {
    const matched: string[] = [];
    const missingInNest: string[] = [];

    const nestUtilNames = nestUtils.map((u) => u.name.toLowerCase());

    for (const expUtil of expressUtils) {
      const normalizedName = expUtil.name.toLowerCase().replace('utils', '').replace('util', '');
      
      if (
        nestUtilNames.includes(expUtil.name.toLowerCase()) ||
        nestUtilNames.some((n) => n.includes(normalizedName) || normalizedName.includes(n))
      ) {
        matched.push(expUtil.name);
      } else {
        missingInNest.push(expUtil.name);
      }
    }

    return { matched, missingInNest };
  }

  private compareMiddleware(
    expressMiddleware: { name: string; fileName: string }[],
    nestMiddleware: { name: string; fileName: string }[]
  ) {
    const matched: string[] = [];
    const missingInNest: string[] = [];

    const middlewareMapping: Record<string, string[]> = {
      authMiddleware: ['jwt-auth.guard', 'jwt.strategy'],
      customCsrf: ['csrf.guard', 'csrf-token.decorator'],
      errorHandler: ['all-exceptions.filter'],
      controllerWrapper: [], // Built into NestJS
    };

    for (const expMw of expressMiddleware) {
      const mappedNames = middlewareMapping[expMw.name];
      
      if (mappedNames && mappedNames.length === 0) {
        // Built into NestJS
        matched.push(expMw.name);
      } else if (mappedNames) {
        const hasMatch = mappedNames.some((mn) =>
          nestMiddleware.some((nm) => nm.name.toLowerCase().includes(mn.toLowerCase().replace('.', '')))
        );
        if (hasMatch) {
          matched.push(expMw.name);
        } else {
          missingInNest.push(expMw.name);
        }
      } else {
        // Try direct match
        const hasMatch = nestMiddleware.some(
          (nm) =>
            nm.name.toLowerCase().includes(expMw.name.toLowerCase()) ||
            expMw.name.toLowerCase().includes(nm.name.toLowerCase())
        );
        if (hasMatch) {
          matched.push(expMw.name);
        } else {
          missingInNest.push(expMw.name);
        }
      }
    }

    return { matched, missingInNest };
  }

  private collectIssues(
    routes: RouteComparison,
    services: ServiceComparison,
    repositories: RepositoryComparison,
    schemas: SchemaComparison,
    auditLogging: AuditLoggingComparison,
    utils: { matched: string[]; missingInNest: string[] },
    middleware: { matched: string[]; missingInNest: string[] }
  ): ParityIssue[] {
    const issues: ParityIssue[] = [];

    // Route issues
    for (const missing of routes.missingInNest) {
      issues.push({
        severity: 'critical',
        category: 'route',
        message: `Missing route in NestJS: ${missing.method} ${missing.fullPath}`,
        expressFile: missing.fileName,
        suggestion: `Create endpoint ${missing.method} ${missing.path} in appropriate NestJS controller`,
      });
    }

    for (const mismatch of routes.methodMismatch) {
      issues.push({
        severity: 'critical',
        category: 'route',
        message: `HTTP method mismatch for ${mismatch.path}: Express uses ${mismatch.expressMethod}, NestJS uses ${mismatch.nestMethod}`,
        suggestion: `Change NestJS method from ${mismatch.nestMethod} to ${mismatch.expressMethod}`,
      });
    }

    for (const match of routes.matched) {
      for (const issue of match.issues) {
        issues.push({
          severity: issue.includes('auth') || issue.includes('CSRF') ? 'critical' : 'warning',
          category: 'route',
          message: `${match.express.fullPath}: ${issue}`,
          expressFile: match.express.fileName,
          nestFile: match.nest.fileName,
        });
      }
    }

    // Service issues
    for (const missing of services.missingInNest) {
      issues.push({
        severity: 'warning',
        category: 'service',
        message: `Missing service method in NestJS: ${missing.className}.${missing.name}`,
        expressFile: missing.fileName,
        suggestion: `Add method ${missing.name} to corresponding NestJS service`,
      });
    }

    for (const mismatch of services.signatureMismatch) {
      issues.push({
        severity: 'warning',
        category: 'service',
        message: `Signature mismatch: ${mismatch.serviceName}.${mismatch.methodName} - ${mismatch.reason}`,
      });
    }

    // Repository issues
    for (const missing of repositories.missingInNest) {
      issues.push({
        severity: 'warning',
        category: 'repository',
        message: `Missing repository method in NestJS: ${missing.className}.${missing.name}`,
        expressFile: missing.fileName,
      });
    }

    // Schema issues
    for (const missing of schemas.missingInNest) {
      issues.push({
        severity: 'critical',
        category: 'schema',
        message: `Missing schema in NestJS: ${missing.name}`,
        expressFile: missing.fileName,
        suggestion: `Create ${missing.name} schema in appropriate NestJS module`,
      });
    }

    for (const mismatch of schemas.fieldMismatch) {
      if (mismatch.missingFields.length > 0) {
        issues.push({
          severity: 'warning',
          category: 'schema',
          message: `Missing fields in NestJS schema ${mismatch.schemaName}: ${mismatch.missingFields.join(', ')}`,
        });
      }
    }

    // Audit logging issues
    for (const missing of auditLogging.missingAudit) {
      issues.push({
        severity: 'critical',
        category: 'audit',
        message: `Missing audit logging in NestJS: ${missing.serviceName}.${missing.methodName} (action: ${missing.expressAuditAction})`,
        expressFile: missing.fileName,
        suggestion: `Add auditService.logAction('${missing.expressAuditAction}', ...) to NestJS method`,
      });
    }

    // Util issues
    for (const missing of utils.missingInNest) {
      issues.push({
        severity: 'info',
        category: 'util',
        message: `Missing utility in NestJS: ${missing}`,
      });
    }

    // Middleware issues
    for (const missing of middleware.missingInNest) {
      issues.push({
        severity: 'warning',
        category: 'middleware',
        message: `Missing middleware/guard in NestJS: ${missing}`,
      });
    }

    return issues;
  }

  private calculateSummary(
    express: ParsedBackendData,
    nest: ParsedBackendData,
    routes: RouteComparison,
    services: ServiceComparison,
    repositories: RepositoryComparison,
    issues: ParityIssue[]
  ) {
    const critical = issues.filter((i) => i.severity === 'critical').length;
    const warnings = issues.filter((i) => i.severity === 'warning').length;
    const info = issues.filter((i) => i.severity === 'info').length;

    // Calculate parity score
    const totalExpressItems =
      express.routes.length + express.services.length + express.repositories.length + express.schemas.length;
    const matchedItems =
      routes.matched.length + services.matched.length + repositories.matched.length;
    
    const parityScore = totalExpressItems > 0 
      ? Math.round((matchedItems / totalExpressItems) * 100) 
      : 100;

    return {
      parityScore,
      critical,
      warnings,
      info,
      totalExpressRoutes: express.routes.length,
      totalNestRoutes: nest.routes.length,
      totalExpressServices: express.services.length,
      totalNestServices: nest.services.length,
    };
  }

  // Helper methods

  private normalizePath(path: string): string {
    return path
      .toLowerCase()
      .replace(/\/+/g, '/')
      .replace(/\/$/, '')
      .replace(/:(\w+)/g, ':param');
  }

  private groupByClass<T extends { className: string }>(items: T[]): Record<string, T[]> {
    const grouped: Record<string, T[]> = {};
    for (const item of items) {
      if (!grouped[item.className]) {
        grouped[item.className] = [];
      }
      grouped[item.className].push(item);
    }
    return grouped;
  }

  private mapServiceName(expressName: string): string {
    const mappings: Record<string, string> = {
      TaskService: 'TasksService',
      NoteService: 'NotesService',
      FolderService: 'FoldersService',
      GPAService: 'GpaService',
      AuthService: 'AuthService',
      CalendarService: 'CalendarService',
      VaultService: 'VaultService',
      ShareService: 'ShareService',
      PublicShareService: 'PublicShareService',
    };
    return mappings[expressName] || expressName;
  }

  private mapRepositoryName(expressName: string): string {
    const mappings: Record<string, string> = {
      TaskRepository: 'TaskRepository',
      NoteRepository: 'NoteRepository',
      FolderRepository: 'FoldersRepository',
      CourseRepository: 'GpaRepository',
      CalendarEventRepository: 'CalendarRepository',
      FileMetadataRepository: 'VaultRepository',
    };
    return mappings[expressName] || expressName;
  }

  private similarMethodName(name1: string, name2: string): boolean {
    // Handle common naming pattern differences
    const normalize = (name: string) =>
      name
        .toLowerCase()
        .replace('get', '')
        .replace('fetch', '')
        .replace('find', '')
        .replace('all', '')
        .replace('one', '')
        .replace('byid', '');

    return normalize(name1) === normalize(name2);
  }
}
