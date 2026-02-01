/**
 * NestJS Backend Parser
 *
 * Parses NestJS backend structure to extract routes, controllers,
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

export class NestParser {
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

    // Parse modules directory
    const modulesDir = path.join(this.basePath, 'modules');
    if (fs.existsSync(modulesDir)) {
      const modules = fs.readdirSync(modulesDir).filter((f) => {
        const fullPath = path.join(modulesDir, f);
        return fs.statSync(fullPath).isDirectory();
      });

      for (const moduleName of modules) {
        if (moduleFilter && !moduleName.toLowerCase().includes(moduleFilter.toLowerCase())) {
          continue;
        }

        const moduleData = await this.parseModule(moduleName);
        data.routes.push(...moduleData.routes);
        data.controllers.push(...moduleData.controllers);
        data.services.push(...moduleData.services);
        data.repositories.push(...moduleData.repositories);
        data.schemas.push(...moduleData.schemas);
      }
    }

    // Parse common directory
    const commonDir = path.join(this.basePath, 'common');
    if (fs.existsSync(commonDir)) {
      const commonData = await this.parseCommon();
      data.utils.push(...commonData.utils);
      data.middleware.push(...commonData.middleware);
      data.services.push(...commonData.services);
      data.repositories.push(...commonData.repositories);
    }

    return data;
  }

  private async parseModule(moduleName: string): Promise<ParsedBackendData> {
    const modulePath = path.join(this.basePath, 'modules', moduleName);
    const data: ParsedBackendData = {
      routes: [],
      controllers: [],
      services: [],
      repositories: [],
      schemas: [],
      utils: [],
      middleware: [],
    };

    // Find controller files
    const controllerFiles = this.findFiles(modulePath, '.controller.ts');
    for (const file of controllerFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const routes = this.extractRoutes(content, file, moduleName);
      const methods = this.extractControllerMethods(content, file);
      data.routes.push(...routes);
      data.controllers.push(...methods);
    }

    // Find service files
    const serviceFiles = this.findFiles(modulePath, '.service.ts');
    for (const file of serviceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const methods = this.extractServiceMethods(content, file);
      data.services.push(...methods);
    }

    // Find repository files
    const repoFiles = this.findFiles(modulePath, '.repository.ts');
    for (const file of repoFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const methods = this.extractRepositoryMethods(content, file);
      data.repositories.push(...methods);
    }

    // Find schema files
    const schemaFiles = this.findFiles(modulePath, '.schema.ts');
    for (const file of schemaFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const schema = this.extractSchema(content, file);
      if (schema) {
        data.schemas.push(schema);
      }
    }

    return data;
  }

  private async parseCommon(): Promise<ParsedBackendData> {
    const commonPath = path.join(this.basePath, 'common');
    const data: ParsedBackendData = {
      routes: [],
      controllers: [],
      services: [],
      repositories: [],
      schemas: [],
      utils: [],
      middleware: [],
    };

    // Parse utils
    const utilsDir = path.join(commonPath, 'utils');
    if (fs.existsSync(utilsDir)) {
      const utilFiles = fs.readdirSync(utilsDir).filter((f) => f.endsWith('.ts'));
      for (const file of utilFiles) {
        const filePath = path.join(utilsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        data.utils.push(this.extractUtil(content, file));
      }
    }

    // Parse services
    const servicesDir = path.join(commonPath, 'services');
    if (fs.existsSync(servicesDir)) {
      const serviceFiles = fs.readdirSync(servicesDir).filter((f) => f.endsWith('.ts'));
      for (const file of serviceFiles) {
        const filePath = path.join(servicesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const methods = this.extractServiceMethods(content, filePath);
        data.services.push(...methods);
      }
    }

    // Parse repositories
    const reposDir = path.join(commonPath, 'repositories');
    if (fs.existsSync(reposDir)) {
      const repoFiles = fs.readdirSync(reposDir).filter((f) => f.endsWith('.ts'));
      for (const file of repoFiles) {
        const filePath = path.join(reposDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const methods = this.extractRepositoryMethods(content, filePath);
        data.repositories.push(...methods);
      }
    }

    // Parse middleware
    const middlewareDir = path.join(commonPath, 'middleware');
    if (fs.existsSync(middlewareDir)) {
      const middlewareFiles = fs.readdirSync(middlewareDir).filter((f) => f.endsWith('.ts'));
      for (const file of middlewareFiles) {
        const filePath = path.join(middlewareDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        data.middleware.push({
          name: file.replace('.ts', ''),
          fileName: file,
          type: content.includes('implements NestMiddleware') ? 'class' : 'function',
        });
      }
    }

    // Parse guards
    const guardsDir = path.join(commonPath, 'guards');
    if (fs.existsSync(guardsDir)) {
      const guardFiles = fs.readdirSync(guardsDir).filter((f) => f.endsWith('.ts'));
      for (const file of guardFiles) {
        data.middleware.push({
          name: file.replace('.ts', ''),
          fileName: file,
          type: 'class',
        });
      }
    }

    // Parse filters
    const filtersDir = path.join(commonPath, 'filters');
    if (fs.existsSync(filtersDir)) {
      const filterFiles = fs.readdirSync(filtersDir).filter((f) => f.endsWith('.ts'));
      for (const file of filterFiles) {
        data.middleware.push({
          name: file.replace('.ts', ''),
          fileName: file,
          type: 'class',
        });
      }
    }

    return data;
  }

  private findFiles(dir: string, suffix: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.findFiles(fullPath, suffix));
      } else if (item.endsWith(suffix)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private extractRoutes(content: string, filePath: string, moduleName: string): RouteInfo[] {
    const routes: RouteInfo[] = [];
    const fileName = path.basename(filePath);

    // Extract controller decorator path
    const controllerMatch = content.match(/@Controller\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/);
    const controllerPrefix = controllerMatch ? controllerMatch[1] : moduleName;

    // Extract class name
    const classMatch = content.match(/class\s+(\w+Controller)/);
    const controllerName = classMatch ? classMatch[1] : fileName.replace('.ts', '');

    // Check for class-level guards
    const hasClassAuth = /@UseGuards\([^)]*JwtAuthGuard[^)]*\)/.test(content) || /@UseGuards\([^)]*AuthGuard\(['"`]jwt['"`]\)[^)]*\)/.test(content);
    const hasClassCsrf = /@UseGuards\([^)]*CsrfGuard[^)]*\)/.test(content);

    // Extract route methods
    const methodPatterns = [
      /@(Get|Post|Put|Patch|Delete)\s*\(\s*['"`]?([^'"`)\s]*)['"`]?\s*\)/g,
      /@(Get|Post|Put|Patch|Delete)\s*\(\s*\)/g,
    ];

    for (const pattern of methodPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const [fullMatch, method, routePath = ''] = match;

        // Find the method name after the decorator
        const afterDecorator = content.substring(match.index + fullMatch.length);
        const methodNameMatch = afterDecorator.match(/^\s*(?:async\s+)?(\w+)\s*\(/);
        const handlerName = methodNameMatch ? methodNameMatch[1] : 'unknown';

        // Check for method-level guards
        const contextStart = Math.max(0, match.index - 200);
        const methodContext = content.substring(contextStart, match.index + 300);
        const methodHasAuth = /@UseGuards\([^)]*JwtAuthGuard[^)]*\)/.test(methodContext) || hasClassAuth;
        const methodHasCsrf = /@UseGuards\([^)]*CsrfGuard[^)]*\)/.test(methodContext) || hasClassCsrf;

        // Extract guards from context
        const guardsMatch = methodContext.match(/@UseGuards\(([^)]+)\)/g);
        const guards = guardsMatch
          ? guardsMatch.flatMap((g) => {
            const inner = g.match(/@UseGuards\(([^)]+)\)/);
            return inner ? inner[1].split(',').map((s) => s.trim()) : [];
          })
          : [];

        // Extract path parameters
        const pathParams = (routePath.match(/:(\w+)/g) || []).map((p) => p.substring(1));

        // Extract query parameters from @Query decorators
        const queryParams: string[] = [];
        const queryMatches = content.match(/@Query\s*\(\s*['"`](\w+)['"`]\s*\)/g);
        if (queryMatches) {
          queryParams.push(
            ...queryMatches.map((q) => {
              const m = q.match(/@Query\s*\(\s*['"`](\w+)['"`]\s*\)/);
              return m ? m[1] : '';
            }).filter(Boolean)
          );
        }

        routes.push({
          method: method.toUpperCase() as RouteInfo['method'],
          path: routePath || '/',
          fullPath: `/api/${controllerPrefix}${routePath ? (routePath.startsWith('/') ? routePath : '/' + routePath) : ''}`,
          handlerName,
          controllerName,
          fileName,
          middleware: [],
          guards,
          parameters: {
            path: pathParams,
            query: queryParams,
            body: ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) ? 'DTO' : null,
          },
          hasAuth: methodHasAuth,
          hasCsrf: methodHasCsrf,
        });
      }
    }

    return routes;
  }

  private extractControllerMethods(content: string, filePath: string): ControllerMethodInfo[] {
    const methods: ControllerMethodInfo[] = [];
    const fileName = path.basename(filePath);

    // Extract class name
    const classMatch = content.match(/class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : fileName.replace('.ts', '');

    // Check for class-level guards
    const hasClassAuth = content.includes('@UseGuards(JwtAuthGuard)');

    // Match methods with HTTP decorators
    const methodPattern = /@(Get|Post|Put|Patch|Delete)\s*\([^)]*\)\s*(?:@\w+\([^)]*\)\s*)*(?:async\s+)?(\w+)\s*\(([^)]*)\)/g;

    let match;
    while ((match = methodPattern.exec(content)) !== null) {
      const [fullMatch, httpMethod, name, paramsStr] = match;

      // Extract decorators before the method
      const beforeMethod = content.substring(Math.max(0, match.index - 500), match.index);
      const decorators: string[] = [];
      const decoratorMatches = beforeMethod.match(/@(\w+)\([^)]*\)/g);
      if (decoratorMatches) {
        decorators.push(...decoratorMatches.map((d) => d.split('(')[0]));
      }

      // Check for guards
      const guards: string[] = [];
      const guardsMatch = beforeMethod.match(/@UseGuards\(([^)]+)\)/);
      if (guardsMatch) {
        guards.push(...guardsMatch[1].split(',').map((s) => s.trim()));
      }

      methods.push({
        name,
        className,
        fileName,
        httpMethod: httpMethod.toUpperCase(),
        path: '', // Would need to parse decorator
        decorators: decorators.slice(-5), // Last 5 decorators before method
        parameters: this.parseParameters(paramsStr),
        returnType: 'Promise<unknown>',
        guards,
        hasAuth: hasClassAuth || guards.some((g) => g.includes('Auth') || g.includes('Jwt')),
      });
    }

    return methods;
  }

  private extractServiceMethods(content: string, filePath: string): ServiceMethodInfo[] {
    const methods: ServiceMethodInfo[] = [];
    const fileName = path.basename(filePath);

    // Extract class name
    const classMatch = content.match(/class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : fileName.replace('.ts', '');

    // Match async methods
    const methodPattern = /async\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*Promise<([^>]+)>)?\s*\{/g;

    let match;
    while ((match = methodPattern.exec(content)) !== null) {
      const [, name, paramsStr, returnType] = match;

      // Find method body
      const methodStart = match.index;
      const methodBody = this.extractMethodBody(content, methodStart);

      // Check for audit logging
      const hasAuditLogging =
        methodBody.includes('auditService') ||
        methodBody.includes('this.auditService') ||
        methodBody.includes('logAction') ||
        methodBody.includes('logAudit');

      // Extract audit actions
      const auditActions: string[] = [];
      const actionMatches = methodBody.match(/['"`](\w+_\w+)['"`]/g);
      if (actionMatches) {
        auditActions.push(
          ...actionMatches
            .map((a) => a.replace(/['"`]/g, ''))
            .filter((a) => a.includes('_') && a === a.toUpperCase())
        );
      }

      // Extract repository method calls
      const repoCalls: string[] = [];
      const repoMatches = methodBody.match(/this\.(\w+Repository|\w+Repo)\.\w+/g);
      if (repoMatches) {
        repoCalls.push(...repoMatches);
      }

      methods.push({
        name,
        className,
        fileName,
        parameters: this.parseParameters(paramsStr),
        returnType: returnType || 'unknown',
        hasAuditLogging,
        auditActions,
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

    // Handle NestJS decorator parameters
    // @Param('id') id: string, @Body() dto: CreateDto, @Request() req
    const paramPattern = /(?:@\w+\([^)]*\)\s*)*(\w+)\s*(?:\?)?:\s*([^,)]+)/g;

    let match;
    while ((match = paramPattern.exec(paramsStr)) !== null) {
      const [, name, type] = match;
      const isOptional = paramsStr.includes(`${name}?:`);

      params.push({
        name: name.trim(),
        type: type.trim(),
        isOptional,
      });
    }

    return params;
  }

  private extractRepositoryMethods(content: string, filePath: string): RepositoryMethodInfo[] {
    const methods: RepositoryMethodInfo[] = [];
    const fileName = path.basename(filePath);

    // Extract class name
    const classMatch = content.match(/class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : fileName.replace('.ts', '');

    // Extract model name from injection
    const modelMatch = content.match(/@InjectModel\s*\(\s*(\w+)\.name\s*\)/);
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
      } else if (methodBody.includes('sanitize') || methodBody.includes('safeFilter')) {
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

  private extractSchema(content: string, filePath: string): SchemaInfo | null {
    const fileName = path.basename(filePath);

    // Extract schema class name
    const classMatch = content.match(/@Schema[^)]*\)\s*export\s+class\s+(\w+)/);
    const schemaName = classMatch ? classMatch[1] : fileName.replace('.schema.ts', '');

    // Extract fields with @Prop decorator
    const fields: FieldInfo[] = [];

    // More robust pattern that handles:
    // 1. Multiline @Prop({ ... }) with nested braces
    // 2. Both ! and ? after field name
    // 3. Array decorators like @Prop([...])
    // 4. Simple @Prop() without options

    // Find all @Prop occurrences and extract field info
    const propRegex = /@Prop\s*\(/g;
    let propMatch;

    while ((propMatch = propRegex.exec(content)) !== null) {
      const startIdx = propMatch.index;

      // Find the matching closing paren for @Prop(...)
      const afterProp = content.substring(startIdx + propMatch[0].length);
      const propEndIdx = this.findMatchingParen(afterProp, '(', ')');

      if (propEndIdx === -1) continue;

      const propOptions = afterProp.substring(0, propEndIdx);
      const afterOptions = content.substring(startIdx + propMatch[0].length + propEndIdx + 1);

      // Extract field name and type after @Prop(...)
      // Pattern: fieldName!: Type or fieldName?: Type or fieldName: Type
      const fieldMatch = afterOptions.match(/^\s*(\w+)\s*([!?])?\s*:\s*([^;]+)/);

      if (fieldMatch) {
        const [, fieldName, modifier, fieldType] = fieldMatch;

        // Parse options to get required, ref, enum
        const required = modifier === '!' || propOptions.includes('required: true') || propOptions.includes('required:true');
        const isOptional = modifier === '?';
        const refMatch = propOptions.match(/ref\s*:\s*['"`](\w+)['"`]/);
        const enumMatch = propOptions.match(/enum\s*:\s*(\[[^\]]+\]|['"`][^'"`]+['"`]|\w+)/);
        const defaultMatch = propOptions.match(/default\s*:\s*([^,}\]]+)/);

        fields.push({
          name: fieldName,
          type: fieldType.trim().replace(/;$/, ''),
          required: required && !isOptional,
          ref: refMatch ? refMatch[1] : undefined,
          enum: enumMatch ? [enumMatch[1].replace(/[\[\]'"`]/g, '')] : undefined,
          default: defaultMatch ? defaultMatch[1].trim() : undefined,
        });
      }
    }

    // Extract indexes
    const indexes: string[] = [];
    const indexMatches = content.match(/@Index\s*\(\s*(\{[^}]+\})/g);
    if (indexMatches) {
      indexes.push(...indexMatches);
    }

    // Also extract SchemaFactory indexes
    const schemaIndexMatches = content.match(/Schema\.index\s*\(\s*\{[^}]+\}/g);
    if (schemaIndexMatches) {
      indexes.push(...schemaIndexMatches);
    }

    return {
      name: schemaName,
      fileName,
      fields,
      indexes,
      virtuals: [],
    };
  }

  /**
   * Find the matching closing bracket/paren, handling nested brackets
   */
  private findMatchingParen(str: string, open: string, close: string): number {
    let depth = 1;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const prevChar = i > 0 ? str[i - 1] : '';

      // Handle string literals
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) continue;

      if (char === open || (open === '(' && char === '[') || (open === '(' && char === '{')) {
        depth++;
      } else if (char === close || (close === ')' && char === ']') || (close === ')' && char === '}')) {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  private extractUtil(content: string, fileName: string): UtilInfo {
    const exports: string[] = [];
    const functions: string[] = [];

    // Extract exports
    const exportMatches = content.match(/export\s+(const|function|class|async function)\s+(\w+)/g);
    if (exportMatches) {
      exports.push(
        ...exportMatches.map((m) => {
          const match = m.match(/export\s+(const|function|class|async function)\s+(\w+)/);
          return match ? match[2] : '';
        }).filter(Boolean)
      );
    }

    // Extract function names
    const funcMatches = content.match(/(async\s+)?function\s+(\w+)/g);
    if (funcMatches) {
      functions.push(
        ...funcMatches.map((m) => {
          const match = m.match(/(async\s+)?function\s+(\w+)/);
          return match ? match[2] : '';
        }).filter(Boolean)
      );
    }

    return {
      name: fileName.replace('.ts', ''),
      fileName,
      exports,
      functions,
    };
  }
}
