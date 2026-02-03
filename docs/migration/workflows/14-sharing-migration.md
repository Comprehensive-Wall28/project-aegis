# Workflow 14: Sharing Module Migration

## Objective
Implement NestJS sharing module passing all Workflow 13 tests.

## Prerequisites
- Workflow 13 completed

---

## Implementation Steps

1. **Create Schemas**
   - `shared-link.schema.ts`
   - `shared-file.schema.ts`

2. **Create Repositories**
   - `shared-link.repository.ts`
   - `shared-file.repository.ts`

3. **Create Services**
   - `share.service.ts` - authenticated sharing logic
   - `public-share.service.ts` - token validation, public access

4. **Create Controllers**
   - `share.controller.ts` - `/api/share/*`
   - `public-share.controller.ts` - `/api/public/*` (no auth guard)

5. **Assemble Module**

---

## Public Routes Note

Public routes should NOT have auth guards:

```typescript
@Controller('api/public')
export class PublicShareController {
  @Get('share/:token')
  // No @UseGuards(JwtAuthGuard)
  async getSharedContent(@Param('token') token: string) {
    // ...
  }
}
```

---

## Completion Checklist
- [ ] All Workflow 13 tests passing
- [ ] Public routes accessible without auth
- [ ] Token validation working
- [ ] Code committed

## Next Workflow
Proceed to [15-vault-tests.md](./15-vault-tests.md)
