# Workflow 10: Folders Module Migration

## Objective
Implement NestJS folders module passing all Workflow 09 tests.

## Prerequisites
- Workflow 09 completed

---

## Implementation Steps

1. **Create Folder Schema**
   - READ: `backend/src/models/Folder.ts`
   - Pay attention to parent reference for hierarchy

2. **Create FolderRepository**
   - READ: `backend/src/repositories/FolderRepository.ts`
   - Port tree traversal methods

3. **Create FolderService**
   - READ: `backend/src/services/folderService.ts`
   - Handle circular reference prevention

4. **Create FolderController**
   - Create DTOs

5. **Assemble FoldersModule**

---

## Hierarchical Considerations

**Circular reference prevention:**
```typescript
// When moving folder, check ancestry
async moveFolder(folderId: string, newParentId: string | null) {
  if (newParentId) {
    // Ensure newParentId is not a descendant of folderId
    const descendants = await this.getDescendants(folderId);
    if (descendants.includes(newParentId)) {
      throw new ServiceError('Cannot move folder into its own descendant', 400);
    }
  }
}
```

---

## Completion Checklist
- [ ] All Workflow 09 tests passing against NestJS
- [ ] Hierarchy logic preserved
- [ ] Code committed

## Next Workflow
Proceed to [11-notes-tests.md](./11-notes-tests.md)
