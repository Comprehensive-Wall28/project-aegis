# NestJS Migration TODO

## Next Session: Phase 5 - Deployment & CI/CD

- [ ] **Verify Docker Build** (Requires Docker environment)
    - Run `docker build -t aegis-nest .`
    - Verify Playwright browser installation in container
- [ ] **Configure CI/CD**
    - Set up GitHub Actions or GitLab CI
    - Ensure E2E tests run in CI
- [ ] **Parallel Running Validation**
    - deploy to staging
    - verify data consistency
- [ ] **Full Cutover**
    - switch DNS/Routing

## Notes
- `Dockerfile` has been updated with Playwright support (Node lts-slim)
- E2E tests for Calendar and Folders are passing
- Performance load test passed (~5600 RPS)
