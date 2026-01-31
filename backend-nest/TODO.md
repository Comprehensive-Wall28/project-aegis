# NestJS Migration TODO

## Next Session: Phase 5 - Deployment & Cutover

### Priority 1: Docker Verification
> [!IMPORTANT]
> The `docker` command was not available in the agent environment. Manual verification is required.
- [ ] **Run Local Build**: `docker build -t aegis-nest .`
- [ ] **Verify Container**: Ensure Playwright browser installs correctly during build.

### Priority 2: Deployment
- [ ] **Push to Staging**: Trigger the new CI/CD pipeline by pushing to `backend/nest`.
- [ ] **Parallel Running**: Deploy alongside existing backend and verify 1:1 parity.
- [ ] **Cutover**: Switch DNS/Routing to new instance.

### Status
- **CI/CD**: Configured in `.github/workflows/ci.yml` (Triggers on `main` and `backend/**`)
- **Tests**: All Passing (Unit, Integration, E2E)
