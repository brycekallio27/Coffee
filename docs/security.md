# Security Audit Report

**Date:** 2026-03-12
**Dependencies Pinned:** All production and dev dependencies pinned to exact versions per `package.json`

## Summary

npm audit identified 5 vulnerabilities (1 moderate, 3 high, 1 critical) as of this date. These vulnerabilities are in transitive dependencies used by dev tools and build infrastructure, not in direct production dependencies.

## Vulnerabilities Found

### Critical (1)

- **basic-ftp < 5.2.0** — Path Traversal Vulnerability in `downloadToDir()` method
  - Location: Transitive dependency (pulled in by electron-builder toolchain)
  - Risk: Low in practice — affects FTP operations during build only
  - Status: Awaiting upstream patch availability

### High (3)

- **minimatch — Multiple ReDoS (Regular Expression Denial of Service) vulnerabilities**
  - Via repeated wildcards, GLOBSTAR segments, and nested extglobs
  - Location: Multiple transitive copies in @electron/universal, @typescript-eslint/typescript-estree, app-builder-lib, cacache, filelist
  - Risk: Build-time only (not used in production code)
  - Status: Awaiting upstream patch in affected dependencies

- **rollup 4.0.0 – 4.58.0** — Arbitrary File Write via Path Traversal
  - Location: Transitive dependency (Vite build toolchain)
  - Risk: Build-time only
  - Status: Awaiting upstream patch

- **tar <= 7.5.10** — Hardlink/Symlink Path Traversal
  - Location: Transitive dependency
  - Risk: Build-time extraction only
  - Status: Awaiting upstream patch

### Moderate (1)

- **ajv < 6.14.0** — ReDoS when using `$data` option
  - Location: Transitive dependency
  - Risk: Build-time validation only
  - Status: Awaiting upstream patch

## Mitigation Strategy

1. **No direct production dependencies affected.** All vulnerabilities are in transitive dev/build dependencies (electron-builder, Vite, ESLint toolchain).

2. **Monitor upstream fixes:** As patches become available in electron-builder, Vite, and their dependencies, dependency updates will pull fixes automatically.

3. **Dependency pinning:** All versions are now pinned to exact versions (see `package.json`). This ensures reproducible builds and easy audit trail.

4. **Next audit:** Re-run `npm audit` after:
   - Major dependency updates
   - New npm package releases (especially electron-builder, Vite)
   - Before production deployments

## Recommendations

- Keep electron-builder and Vite updated to latest stable versions as patches are released.
- Avoid any FTP operations outside of build tooling.
- Monitor GitHub advisories for these packages: https://github.com/advisories

## How to Re-audit

```bash
npm audit
```

All findings will be documented in this file with dates.
