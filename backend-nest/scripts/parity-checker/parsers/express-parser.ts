/**
 * Express Backend Parser
 *
 * Parses Express backend structure to extract routes, controllers,
 * services, repositories, and other components for comparison.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ParsedBackendData,
  RouteInfo,
  ControllerMethodInfo,
  ServiceMethodInfo,
  RepositoryMethodInfo,
  SchemaInfo,
  UtilInfo,
  MiddlewareInfo,
  ParameterInfo,
  FieldInfo,
} from '../types';

export class ExpressParser {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async parse(moduleFilter?: string): Promise<ParsedBackendData> {
    const data: ParsedBackendData = {
      routes: [],
      controllers: [],
      services: [],
      repositories: [],
      schemas: [],
      utils: [],
      middleware: [],
    };

    // Parse routes
    data.routes = await this.parseRoutes(moduleFilter);

    // Parse controllers
    data.controllers = await this.parseControllers(moduleFilter);

    // Parse services
    data.services = await this.parseServices(moduleFilter);

    // Parse repositories
    data.repositories = await this.parseRepositories(moduleFilter);

    // Parse schemas/models
    data.schemas = await this.parseSchemas(moduleFilter);

    // Parse utils
    data.utils = await this.parseUtils();

    // Parse middleware
    data.middleware = await this.parseMiddleware();

    return data;
  }

  private async parseRoutes(moduleFilter?: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const routesDir = path.join(this.basePath, 'routes');

    if (!fs.existsSync(routesDir)) {
      return routes;
    }

    const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith('.ts'));

    for (const file of routeFiles) {
      if (moduleFilter && !file.toLowerCase().includes(moduleFilter.toLowerCase())) {
        continue;
      }

      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileRoutes = this.extractRoutesFromFile(content, file);
      routes.push(...fileRoutes);
    }

    return routes;
  }

  private extractRoutesFromFile(content: string, fileName: string): RouteInfo[] {
    const routes: RouteInfo[] = [];

    // Extract route prefix from router.use or the file name
    const prefixMatch = content.match(/router\s*=.*Router\(\)/);
    const moduleName = fileName.replace('Routes.ts', '').toLowerCase();

    // Check for global middleware
    const hasProtect = content.includes('router.use(protect)') || content.includes('protect,');
    const hasCsrf =
      content.includes('router.use(csrfProtection)') || content.includes('csrfProtection,');

    // Extract route definitions
    const routePatterns = [
      /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/gi,
    ];

    for (const pattern of routePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const [, method, routePath, handlers] = match;

        // Extract handler name (last item in the chain)
        const handlerParts = handlers.split(',').map((h) => h.trim());
        const handlerName = handlerParts[handlerParts.length - 1].replace(/[()]/g, '');

        // Check for route-specific middleware
        const routeHasAuth = hasProtect || handlers.includes('protect') || handlers.includes('withAuth');
        const routeHasCsrf = hasCsrf || handlers.includes('csrfProtection');

        // Extract path parameters
        const pathParams = (routePath.match(/:(\w+)/g) || []).map((p) => p.substring(1));

        routes.push({
          method: method.toUpperCase() as RouteInfo['method'],
          path: routePath,
          fullPath: `/api/${moduleName}${routePath === '/' ? '' : routePath}`,
          handlerName,
          controllerName: `${moduleName}Controller`,
          fileName,
          middleware: handlerParts.slice(0, -1),
          guards: [],
          parameters: {
            path: pathParams,
            query: [], // Would need deeper analysis
            body: method.toLowerCase() === 'post' || method.toLowerCase() === 'put' ? 'unknown' : null,
          },
          hasAuth: routeHasAuth,
          hasCsrf: routeHasCsrf,
        });
      }
    }

    return routes;
  }

  private async parseControllers(moduleFilter?: string): Promise<ControllerMethodInfo[]> {
    const methods: ControllerMethodInfo[] = [];
    const controllersDir = path.join(this.basePath, 'controllers');

    if (!fs.existsSync(controllersDir)) {
      return methods;
    }

    const files = fs.readdirSync(controllersDir).filter((f) => f.endsWith('.ts'));

    for (const file of files) {
      if (moduleFilter && !file.toLowerCase().includes(moduleFilter.toLowerCase())) {
        continue;
      }

      const filePath = path.join(controllersDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileMethods = this.extractControllerMethods(content, file);
      methods.push(...fileMethods);
    }

    return methods;
  }

  private extractControllerMethods(content: string, fileName: string): ControllerMethodInfo[] {
    const methods: ControllerMethodInfo[] = [];
    const className = fileName.replace('.ts', '');

    // Match exported const functions (Express pattern)
    const funcPattern =
      /export\s+const\s+(\w+)\s*=\s*(withAuth|catchAsync)?\s*\(\s*async\s*\(\s*req[^)]*\)\s*(?::\s*[^=]+)?\s*=>/g;

    let match;
    while ((match = funcPattern.exec(content)) !== null) {
      const [, name, wrapper] = match;

      methods.push({
        name,
        className,
        fileName,
        httpMethod: this.inferHttpMethod(name),
        path: this.inferPath(name),
        decorators: [],
        parameters: [
          { name: 'req', type: 'AuthRequest | Request', isOptional: false },
          { name: 'res', type: 'Response', isOptional: false },
        ],
        returnType: 'Promise<void>',
        guards: wrapper === 'withAuth' ? ['AuthGuard'] : [],
        hasAuth: wrapper === 'withAuth' || content.includes('req.user'),
      });
    }

    return methods;
  }

  private inferHttpMethod(funcName: string): string {
    if (funcName.startsWith('get') || funcName.startsWith('fetch')) return 'GET';
    if (funcName.startsWith('create') || funcName.startsWith('add')) return 'POST';
    if (funcName.startsWith('update') || funcName.startsWith('edit') || funcName.startsWith('reorder'))
      return 'PUT';
    if (funcName.startsWith('delete') || funcName.startsWith('remove')) return 'DELETE';
    return 'POST';
  }

  private inferPath(funcName: string): string {
    // Common patterns
    if (funcName.includes('ById') || funcName.match(/get\w+$/)) return '/:id';
    if (funcName.startsWith('getAll') || funcName.startsWith('list')) return '/';
    return '/';
  }

  private async parseServices(moduleFilter?: string): Promise<ServiceMethodInfo[]> {
    const methods: ServiceMethodInfo[] = [];
    const servicesDir = path.join(this.basePath, 'services');

    if (!fs.existsSync(servicesDir)) {
      return methods;
    }

    // Get top-level service files
    const files = fs.readdirSync(servicesDir).filter((f) => f.endsWith('.ts') && !f.startsWith('index'));

    for (const file of files) {
      if (moduleFilter && !file.toLowerCase().includes(moduleFilter.toLowerCase())) {
        continue;
      }

      const filePath = path.join(servicesDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileMethods = this.extractServiceMethods(content, file);
        methods.push(...fileMethods);
      }
    }

    // Check subdirectories (e.g., social/)
    const subdirs = fs.readdirSync(servicesDir).filter((f) => {
      const fullPath = path.join(servicesDir, f);
      return fs.statSync(fullPath).isDirectory();
    });

    for (const subdir of subdirs) {
      if (moduleFilter && !subdir.toLowerCase().includes(moduleFilter.toLowerCase())) {
        continue;
      }

      const subdirPath = path.join(servicesDir, subdir);
      const subFiles = fs.readdirSync(subdirPath).filter((f) => f.endsWith('.ts') && !f.startsWith('index'));

      for (const file of subFiles) {
        const filePath = path.join(subdirPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileMethods = this.extractServiceMethods(content, `${subdir}/${file}`);
        methods.push(...fileMethods);
      }
    }

    return methods;
  }

  private extractServiceMethods(content: string, fileName: string): ServiceMethodInfo[] {
    const methods: ServiceMethodInfo[] = [];

    // Extract class name
    const classMatch = content.match(/class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : fileName.replace('.ts', '');

    // Match async methods in class
    const methodPattern =
      /async\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*Promise<([^>]+)>)?\s*\{/g;

    let match;
    while ((match = methodPattern.exec(content)) !== null) {
      const [fullMatch, name, paramsStr, returnType] = match;

      // Find the method body to check for audit logging
      const methodStart = match.index;
      const methodBody = this.extractMethodBody(content, methodStart);

      const hasAuditLogging =
        methodBody.includes('logAction') ||
        methodBody.includes('auditLogger') ||
        methodBody.includes('this.logAction');

      // Extract audit actions
      const auditActions: string[] = [];
      const auditMatch = methodBody.match(/['"`](\w+_\w+)['"`]/g);
      if (auditMatch) {
        auditActions.push(...auditMatch.map((a) => a.replace(/['"`]/g, '')));
      }

      // Extract repository method calls
      const repoCalls: string[] = [];
      const repoCallMatch = methodBody.match(/this\.(\w+Repository|\w+Repo)\.\w+/g);
      if (repoCallMatch) {
        repoCalls.push(...repoCallMatch);
      }

      methods.push({
        name,
        className,
        fileName,
        parameters: this.parseParameters(paramsStr),
        returnType: returnType || 'unknown',
        hasAuditLogging,
        auditActions: auditActions.filter((a) => a.includes('_')),
        validations: [],
        repositoryMethodsCalled: repoCalls,
        isAsync: true,
      });
    }

    return methods;
  }

  private extractMethodBody(content: string, startIndex: number): string {
    let braceCount = 0;
    let started = false;
    let bodyStart = startIndex;
    let bodyEnd = startIndex;

    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        if (!started) {
          started = true;
          bodyStart = i;
        }
        braceCount++;
      } else if (content[i] === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          bodyEnd = i;
          break;
        }
      }
    }

    return content.substring(bodyStart, bodyEnd + 1);
  }

  private parseParameters(paramsStr: string): ParameterInfo[] {
    if (!paramsStr.trim()) return [];

    const params: ParameterInfo[] = [];
    const paramParts = paramsStr.split(',');

    for (const part of paramParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const isOptional = trimmed.includes('?');
      const [nameWithOptional, type] = trimmed.split(':').map((s) => s.trim());
      const name = nameWithOptional.replace('?', '');

      params.push({
        name,
        type: type || 'unknown',
        isOptional,
      });
    }

    return params;
  }

  private async parseRepositories(moduleFilter?: string): Promise<RepositoryMethodInfo[]> {
    const methods: RepositoryMethodInfo[] = [];
    const reposDir = path.join(this.basePath, 'repositories');

    if (!fs.existsSync(reposDir)) {
      return methods;
    }

    const files = fs.readdirSync(reposDir).filter((f) => f.endsWith('.ts') && !f.startsWith('index') && !f.startsWith('base'));

    for (const file of files) {
      if (moduleFilter && !file.toLowerCase().includes(moduleFilter.toLowerCase())) {
        continue;
      }

      const filePath = path.join(reposDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileMethods = this.extractRepositoryMethods(content, file);
      methods.push(...fileMethods);
    }

    return methods;
  }

  private extractRepositoryMethods(content: string, fileName: string): RepositoryMethodInfo[] {
    const methods: RepositoryMethodInfo[] = [];

    // Extract class name
    const classMatch = content.match(/class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : fileName.replace('.ts', '');

    // Extract model name
    const modelMatch = content.match(/extends\s+BaseRepository<(\w+)>/);
    const modelName = modelMatch ? modelMatch[1] : 'unknown';

    // Match methods
    const methodPattern = /async\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*Promise<([^>]+)>)?\s*\{/g;

    let match;
    while ((match = methodPattern.exec(content)) !== null) {
      const [, name, paramsStr, returnType] = match;

      const methodStart = match.index;
      const methodBody = this.extractMethodBody(content, methodStart);

      // Determine query pattern
      let queryPattern: RepositoryMethodInfo['queryPattern'] = 'unknown';
      if (methodBody.includes('aggregate')) {
        queryPattern = 'aggregation';
      } else if (methodBody.includes('safeFilter') || methodBody.includes('this.sanitize')) {
        queryPattern = 'safe-filter';
      } else if (methodBody.includes('.find') || methodBody.includes('.findOne')) {
        queryPattern = 'direct';
      }

      const usesTransaction = methodBody.includes('session') || methodBody.includes('transaction');

      methods.push({
        name,
        className,
        fileName,
        parameters: this.parseParameters(paramsStr),
        returnType: returnType || 'unknown',
        queryPattern,
        usesTransaction,
        modelName,
      });
    }

    return methods;
  }

  private async parseSchemas(moduleFilter?: string): Promise<SchemaInfo[]> {
    const schemas: SchemaInfo[] = [];
    const modelsDir = path.join(this.basePath, 'models');

    if (!fs.existsSync(modelsDir)) {
      return schemas;
    }

    const files = fs.readdirSync(modelsDir).filter((f) => f.endsWith('.ts'));

    for (const file of files) {
      if (moduleFilter && !file.toLowerCase().includes(moduleFilter.toLowerCase())) {
        continue;
      }

      const filePath = path.join(modelsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const schema = this.extractSchema(content, file);
      if (schema) {
        schemas.push(schema);
      }
    }

    return schemas;
  }

  private extractSchema(content: string, fileName: string): SchemaInfo | null {
    const schemaName = fileName.replace('.ts', '');

    // Extract fields from schema definition
    const fields: FieldInfo[] = [];
    const fieldPattern = /(\w+)\s*:\s*\{([^}]+)\}/g;

    let match;
    while ((match = fieldPattern.exec(content)) !== null) {
      const [, fieldName, fieldDef] = match;

      if (['type', 'required', 'default', 'ref', 'enum'].some((k) => fieldDef.includes(k))) {
        const typeMatch = fieldDef.match(/type\s*:\s*(\w+)/);
        const requiredMatch = fieldDef.match(/required\s*:\s*(true|false)/);
        const refMatch = fieldDef.match(/ref\s*:\s*['"`](\w+)['"`]/);
        const enumMatch = fieldDef.match(/enum\s*:\s*\[([^\]]+)\]/);

        fields.push({
          name: fieldName,
          type: typeMatch ? typeMatch[1] : 'unknown',
          required: requiredMatch ? requiredMatch[1] === 'true' : false,
          ref: refMatch ? refMatch[1] : undefined,
          enum: enumMatch ? enumMatch[1].split(',').map((e) => e.trim().replace(/['"`]/g, '')) : undefined,
        });
      }
    }

    // Extract indexes
    const indexes: string[] = [];
    const indexMatch = content.match(/\.index\(\{([^}]+)\}/g);
    if (indexMatch) {
      indexes.push(...indexMatch);
    }

    return {
      name: schemaName,
      fileName,
      fields,
      indexes,
      virtuals: [],
    };
  }

  private async parseUtils(): Promise<UtilInfo[]> {
    const utils: UtilInfo[] = [];
    const utilsDir = path.join(this.basePath, 'utils');

    if (!fs.existsSync(utilsDir)) {
      return utils;
    }

    const files = fs.readdirSync(utilsDir).filter((f) => f.endsWith('.ts'));

    for (const file of files) {
      const filePath = path.join(utilsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract exports
      const exports: string[] = [];
      const exportMatches = content.match(/export\s+(const|function|class)\s+(\w+)/g);
      if (exportMatches) {
        exports.push(
          ...exportMatches.map((m) => {
            const match = m.match(/export\s+(const|function|class)\s+(\w+)/);
            return match ? match[2] : '';
          })
        );
      }

      // Extract function names
      const functions: string[] = [];
      const funcMatches = content.match(/(async\s+)?function\s+(\w+)/g);
      if (funcMatches) {
        functions.push(
          ...funcMatches.map((m) => {
            const match = m.match(/(async\s+)?function\s+(\w+)/);
            return match ? match[2] : '';
          })
        );
      }

      utils.push({
        name: file.replace('.ts', ''),
        fileName: file,
        exports: exports.filter(Boolean),
        functions: functions.filter(Boolean),
      });
    }

    return utils;
  }

  private async parseMiddleware(): Promise<MiddlewareInfo[]> {
    const middleware: MiddlewareInfo[] = [];
    const middlewareDir = path.join(this.basePath, 'middleware');

    if (!fs.existsSync(middlewareDir)) {
      return middleware;
    }

    const files = fs.readdirSync(middlewareDir).filter((f) => f.endsWith('.ts'));

    for (const file of files) {
      const filePath = path.join(middlewareDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      const isClass = content.includes('class ');

      middleware.push({
        name: file.replace('.ts', ''),
        fileName: file,
        type: isClass ? 'class' : 'function',
      });
    }

    return middleware;
  }
}
