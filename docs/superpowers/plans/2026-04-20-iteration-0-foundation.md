# Iteration 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ EXECUTION-TIME PATCH (2026-04-20, owner decision):**
> 1. **Stack stays on CRA + JSX for Iteration 0.** Vite + TypeScript migration is deferred to a dedicated later iteration. Wherever this plan says `.ts`/`.tsx` read `.js`/`.jsx`; wherever it says `VITE_FIREBASE_*` read `REACT_APP_FIREBASE_*`; wherever it says Vitest read `react-scripts test` (Jest).
> 2. **Role enum is `user | admin | super_admin`** (not `admin | manager | viewer`). This matches the deployed `firestore.rules` and the seeded `users/{uid}` doc.
> 3. **Role field path is `users/{uid}.system.role`** (not `users/{uid}.role`). The user document also carries `system.status` — the client MUST gate on `system.status === 'active'` in addition to auth + role.
> 4. **Firestore rules are already deployed** for Iteration 0 — the stub-rules task in this plan is NO-OP, skip it.

**Goal:** Migrate the project from Create React App to **Vite + TypeScript** in-place, pin all hidden dependencies, wire Firebase initialization and Auth/Firestore repositories, establish the router / auth guard / i18n / Tailwind skeleton, and land a working login page plus a placeholder dashboard — so that every subsequent feature has a typesafe, lintable foundation.

**Architecture:**
- **Bundler:** Vite 5 (react plugin) replaces react-scripts. Single repo, single commit per task, main branch only.
- **Language:** **TypeScript (strict)**. All source in `.ts` / `.tsx`. Domain types are real TypeScript types — not JSDoc.
- **Runtime layering:** UI (`src/components`, `src/pages`) → hooks (`src/hooks`) → domain repositories (`src/domain/repositories`) → Firebase adapters (`src/infra/repositories`) → Firebase singletons (`src/lib/firebase`). Components never import `firebase/*` directly.
- **Auth model:** Firebase Auth email+password for sign-in; role stored in `users/{uid}.system.role` in Firestore (enum: `user | admin | super_admin`); active gate at `users/{uid}.system.status === 'active'`. Client-side `<RequireAuth>` + `<RoleGate>` are UX-only; Firestore rules are the real enforcement (rules already deployed to `warehouse-8ec61`).
- **i18n:** `react-i18next` with browser language detector. English is source of truth, Russian is the second locale. Every user-facing string goes through `t()`.
- **Styling:** Tailwind CSS 3 activated in this iteration. Co-located component CSS remains allowed.

**Tech Stack:** React 19, TypeScript 5 (strict), Vite 5, Vitest + @testing-library/react, Firebase 12 (Auth, Firestore, Storage, Analytics), react-router-dom 7, i18next 24 + react-i18next 15 + i18next-browser-languagedetector 8, Tailwind CSS 3, PostCSS, Autoprefixer, ESLint 9 flat config with `typescript-eslint`.

**Firebase project id (authoritative):** `warehouse-8ec61`. The old `.env.local` comment in the repo references a different placeholder — the user owns renaming the keys there to `VITE_FIREBASE_*`; the agent never touches `.env.local`.

**Decisions locked in for this iteration (user-confirmed 2026-04-20):**
1. `.env` variable prefix: `VITE_FIREBASE_*` (user renames the 7 keys in `.env.local` by hand; agent never touches `.env.local`).
2. CRA → Vite migration is **in-place** in the current repo, single dedicated commit. **Destructive generator forbidden** — do not run `npm create vite@latest .` against the working tree. Either scaffold into a `.vite-tmp/` directory and copy the needed files back (approach A), or hand-author every Vite file (approach B). The `devops-engineer` dispatch prompt specifies this; prefer approach B because the file set is small and fully specified below.
3. Role storage: `users/{uid}.system.role` Firestore document, roles enum = **`user | admin | super_admin`** (3 roles). The client also reads `users/{uid}.system.status` and gates on `'active'`.
4. Test runner: **Vitest** (native Vite companion), not Jest. `@testing-library/react` + `@testing-library/jest-dom` retained.
5. Package manager: **npm** (lockfile already exists and will be regenerated on clean install).
6. Node version: pin to `>=20.11` via `engines` field. No `.nvmrc` yet.
7. **TypeScript (strict) IS introduced in Iteration 0.** `tsconfig.json` with `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"exactOptionalPropertyTypes": true`. A separate `tsconfig.node.json` handles Vite config. Type-check runs via `tsc --noEmit` in the `build` script.
8. ESLint: keep, minimal flat config (`eslint.config.js`) with `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`. No extra stylistic rulesets.
9. Prettier: **not introduced** in Iteration 0 (avoid thrash). Revisit later.
10. Default locale: English (`en`). Second locale scaffolded: Russian (`ru`). Both seeded with `common` + `auth` namespaces. *(If the user prefers `ru` as the default later, flip `fallbackLng` and `supportedLngs` order — one-line change in `src/i18n/index.ts`.)*
11. Firebase project id: **`warehouse-8ec61`** (authoritative; any previously circulated id is a typo and must be replaced everywhere).

**Files created in Iteration 0 (map):**

| Path | Responsibility |
|---|---|
| `vite.config.ts` | Vite config: react plugin, dev server on port 3000, `@` alias to `src`, Vitest block (jsdom + setup file). |
| `tsconfig.json` | Root TS config — strict mode, path alias `@/*` → `src/*`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`. |
| `tsconfig.node.json` | TS config for Vite config file (node-side). |
| `index.html` (repo root) | Vite entry HTML; replaces `public/index.html`. Uses real product title. |
| `src/main.tsx` | App entry; replaces `src/index.js`. Imports Tailwind CSS, i18n init, routes. |
| `src/App.tsx` | Thin root component — mounts `<AppRouter>` inside `<AuthProvider>`. |
| `src/vite-env.d.ts` | Vite-provided ambient types + typed `ImportMetaEnv` for our `VITE_FIREBASE_*` keys. |
| `src/test/setup.ts` | Vitest setup — imports `@testing-library/jest-dom/vitest` matchers. |
| `src/lib/firebase/index.ts` | `initializeApp` + exports `app`, `auth`, `db`, `storage`, `analytics` (gated by `isSupported()`). Reads from `import.meta.env.VITE_FIREBASE_*`. |
| `src/domain/repositories/AuthRepository.ts` | TS interface: `signIn`, `signOut`, `onAuthStateChanged`, plus `AuthUser` + `Unsubscribe` types. |
| `src/domain/repositories/UserRepository.ts` | TS interface: `getUserProfile(uid)` → `UserProfile \| null`; exports `UserRole` union and `UserProfile` type. |
| `src/infra/repositories/firebaseAuthRepository.ts` | Adapter — implements `AuthRepository`. |
| `src/infra/repositories/firestoreUserRepository.ts` | Adapter — implements `UserRepository`. |
| `src/contexts/AuthContext.tsx` | Provides `{ user, profile, loading, error, signIn, signOut }`; subscribes to `onAuthStateChanged` on mount. |
| `src/hooks/useAuth.ts` | Thin wrapper around `useContext(AuthContext)`. |
| `src/components/routing/AppRouter.tsx` | `<BrowserRouter>` + `<Routes>`: `/login`, `/`, wildcard → not-found. |
| `src/components/routing/RequireAuth.tsx` | Redirects to `/login` when unauthenticated; shows loading state while auth is resolving. |
| `src/components/routing/RoleGate.tsx` | Accepts `allowed: UserRole[]`; renders `children` or a forbidden placeholder. |
| `src/components/common/RoutePlaceholder/RoutePlaceholder.tsx` | Simple centered card with `t('common.placeholder.title')` + subtitle. |
| `src/components/common/RoutePlaceholder/index.ts` | Barrel re-export. |
| `src/components/auth/LoginForm.tsx` | Controlled email/password form with `t()` labels; calls `useAuth().signIn`. |
| `src/pages/LoginPage.tsx` | Page wrapper: centered layout + `<LoginForm>`. |
| `src/pages/DashboardPage.tsx` | Placeholder behind `<RequireAuth>`: greets user by `profile.displayName || user.email`, sign-out button. |
| `src/pages/NotFoundPage.tsx` | 404 placeholder using `<RoutePlaceholder>`. |
| `src/i18n/index.ts` | `i18next.use(LanguageDetector).use(initReactI18next).init({...})` with `en` + `ru` resources, `fallbackLng: 'en'`. |
| `src/locales/en/common.json` | Common strings (app title, loading, errors, placeholder, buttons). |
| `src/locales/en/auth.json` | Login/logout strings. |
| `src/locales/ru/common.json` | Russian mirror of common. |
| `src/locales/ru/auth.json` | Russian mirror of auth. |
| `src/index.css` | Tailwind `@tailwind base; @tailwind components; @tailwind utilities;` + minimal body resets. |
| `tailwind.config.js` | Scans `index.html` + `src/**/*.{ts,tsx}`. Default theme. |
| `postcss.config.js` | Tailwind + Autoprefixer. |
| `eslint.config.js` | Flat ESLint config (JS + typescript-eslint + react-hooks + react-refresh). |
| `firestore.rules` | Deny-all stub with a note pointing to the next iteration. Not yet deployed. |
| `.gitattributes` | `* text=auto eol=lf` to neutralize CRLF/LF churn introduced by the existing working-tree noise. |
| `README.md` | Rewritten: project name, dev/build/test commands, env-var list, architecture diagram (text), roadmap pointer. |
| `public/index.html` | **Deleted.** |
| `src/index.js` | **Deleted.** |
| `src/App.js` | **Deleted** (replaced by `src/App.tsx`). |
| `src/App.css` | **Deleted** (Tailwind replaces it). |
| `src/App.test.js` | **Deleted** (replaced by Vitest tests next to components). |
| `src/logo.svg` | **Deleted.** |
| `src/reportWebVitals.js` | **Deleted.** |
| `src/setupTests.js` | **Deleted** (replaced by `src/test/setup.ts`). |
| `build/` | **Deleted** (stale CRA output; Vite emits to `dist/`). |

**Files NOT created in Iteration 0 (deferred):**
- Real Firestore security rules (Iteration 1 ships the real rules file, this iteration only stubs it).
- Asset / Supplier / Category / Location / Movement repositories and UI (Iterations 1+).
- `EntityManager` generic CRUD shell (Iteration 2+).
- Toast / global error surface (decision deferred — tracked as an open question).
- `firebase-tools` deploy pipeline (Iteration 1).

---

## Task 1: Migrate CRA → Vite + TypeScript (infrastructure swap, no behavioral change yet)

**Role:** `devops-engineer` (toolchain/infra — not in the canonical implementer matrix; dispatched as a one-off by the orchestrator).

**Working directory:** `C:/Users/DELL/Desktop/warehouse`

**Scaffolding approach:** hand-author every file below. **Do NOT run `npm create vite@latest .`** against the working tree — it will overwrite files. If you genuinely need a reference, scaffold into `.vite-tmp/` and delete it before committing.

**Files:**
- Create: `C:/Users/DELL/Desktop/warehouse/vite.config.ts`
- Create: `C:/Users/DELL/Desktop/warehouse/tsconfig.json`
- Create: `C:/Users/DELL/Desktop/warehouse/tsconfig.node.json`
- Create: `C:/Users/DELL/Desktop/warehouse/index.html`
- Create: `C:/Users/DELL/Desktop/warehouse/src/main.tsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/App.tsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/vite-env.d.ts`
- Create: `C:/Users/DELL/Desktop/warehouse/src/test/setup.ts`
- Create: `C:/Users/DELL/Desktop/warehouse/eslint.config.js`
- Create: `C:/Users/DELL/Desktop/warehouse/postcss.config.js`
- Create: `C:/Users/DELL/Desktop/warehouse/tailwind.config.js`
- Create: `C:/Users/DELL/Desktop/warehouse/src/index.css`
- Create: `C:/Users/DELL/Desktop/warehouse/.gitattributes`
- Modify: `C:/Users/DELL/Desktop/warehouse/package.json` (replace CRA scripts, pin all deps, add engines)
- Modify: `C:/Users/DELL/Desktop/warehouse/.gitignore` (add `/dist`, keep `/build` line since `build/` gets deleted)
- Delete: `C:/Users/DELL/Desktop/warehouse/public/index.html`
- Delete: `C:/Users/DELL/Desktop/warehouse/src/index.js`
- Delete: `C:/Users/DELL/Desktop/warehouse/src/App.js`
- Delete: `C:/Users/DELL/Desktop/warehouse/src/App.css`
- Delete: `C:/Users/DELL/Desktop/warehouse/src/App.test.js`
- Delete: `C:/Users/DELL/Desktop/warehouse/src/logo.svg`
- Delete: `C:/Users/DELL/Desktop/warehouse/src/reportWebVitals.js`
- Delete: `C:/Users/DELL/Desktop/warehouse/src/setupTests.js`
- Delete (directory): `C:/Users/DELL/Desktop/warehouse/build/`
- Test: `C:/Users/DELL/Desktop/warehouse/src/App.test.tsx`

**Directory skeleton preserved (DO NOT delete, even if empty):**
`src/domain/`, `src/domain/repositories/`, `src/infra/`, `src/infra/repositories/`, `src/pages/`, `src/components/`, `src/components/features/`, `src/components/common/`, `src/components/auth/`, `src/components/routing/`, `src/components/icons/`, `src/contexts/`, `src/hooks/`, `src/i18n/`, `src/locales/`, `src/lib/`, `src/lib/firebase/`, `src/lib/auth/`, `src/config/`, `src/types/`.

**Acceptance criteria:**
- `npm run dev` starts Vite on port 3000.
- `npm run build` runs `tsc --noEmit && vite build`, emits to `dist/` with zero type errors, zero build errors, zero warnings.
- `npm test` runs Vitest in CI mode (non-watch), 1 smoke test passes.
- `package.json` contains exactly these runtime deps pinned: `firebase@^12`, `react@^19.2.5`, `react-dom@^19.2.5`, `react-router-dom@^7`, `i18next@^24`, `react-i18next@^15`, `i18next-browser-languagedetector@^8`.
- `package.json` contains exactly these dev deps: `vite@^5`, `@vitejs/plugin-react@^4`, `vitest@^2`, `jsdom@^25`, `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `@testing-library/user-event@^14`, `tailwindcss@^3`, `postcss@^8`, `autoprefixer@^10`, `eslint@^9`, `@eslint/js@^9`, `typescript-eslint@^8`, `eslint-plugin-react-hooks@^5`, `eslint-plugin-react-refresh@^0.4`, `typescript@^5`, `@types/react@^19`, `@types/react-dom@^19`, `@types/node@^20`, `firebase-tools@^13`.
- `react-scripts` and `web-vitals` are removed from deps.
- `engines.node` is `">=20.11"`.

- [ ] **Step 1: Remove CRA artifacts**

```bash
cd C:/Users/DELL/Desktop/warehouse
rm -rf build/
rm src/index.js src/App.js src/App.css src/App.test.js src/logo.svg src/reportWebVitals.js src/setupTests.js
rm public/index.html
```

- [ ] **Step 2: Rewrite `package.json`**

```json
{
  "name": "warehouse",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20.11"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "firebase": "^12.12.0",
    "i18next": "^24.2.3",
    "i18next-browser-languagedetector": "^8.2.1",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-i18next": "^15.7.4",
    "react-router-dom": "^7.14.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^20.17.10",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.0.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.14",
    "firebase-tools": "^13.0.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.19",
    "typescript": "^5.6.3",
    "typescript-eslint": "^8.18.0",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Clean install**

```bash
cd C:/Users/DELL/Desktop/warehouse
rm -rf node_modules package-lock.json
npm install
```

Expected: install completes with no errors; `package-lock.json` regenerated.

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    "types": ["vitest/globals", "node"],

    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

- [ ] **Step 7: Write `index.html` at repo root**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f172a" />
    <title>Warehouse</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Write `src/vite-env.d.ts`** (typed env)

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 9: Write `src/index.css`** (Tailwind activated here)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 10: Write `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 11: Write `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 12: Write `src/main.tsx`** (temporary minimal — later tasks wire i18n + router)

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 13: Write `src/App.tsx`** (temporary smoke content — replaced in Task 7)

```tsx
export default function App(): JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <h1 className="text-2xl font-semibold text-slate-900">Warehouse — boot OK</h1>
    </main>
  );
}
```

- [ ] **Step 14: Write `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 15: Write `eslint.config.js`** (flat config, TS-aware)

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'build', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
```

- [ ] **Step 16: Update `.gitignore`**

Append these lines (do not duplicate existing):

```
# vite
/dist
```

- [ ] **Step 17: Write `.gitattributes`** (neutralize CRLF/LF churn)

```
* text=auto eol=lf
*.{cmd,bat} text eol=crlf
```

- [ ] **Step 18: Write smoke test `src/App.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the boot message', () => {
    render(<App />);
    expect(screen.getByText(/boot OK/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 19: Verify**

```bash
cd C:/Users/DELL/Desktop/warehouse
npm run typecheck
npm test
npm run build
```

Expected: typecheck passes; 1 test passes; build succeeds; output in `dist/`.

- [ ] **Step 20: Commit**

```bash
cd C:/Users/DELL/Desktop/warehouse
git add -A
git commit -m "chore: migrate CRA → Vite + TypeScript, pin deps, activate Tailwind"
```

---

## Task 2: Firebase singletons + env wiring

**Role:** `firebase-engineer`

**Files:**
- Create: `C:/Users/DELL/Desktop/warehouse/src/lib/firebase/index.ts`
- Test: `C:/Users/DELL/Desktop/warehouse/src/lib/firebase/index.test.ts`

**Acceptance criteria:**
- Exports `app`, `auth`, `db`, `storage`, `analytics` (analytics gated by `isSupported()`).
- Reads config from `import.meta.env.VITE_FIREBASE_*` (7 keys: API key, auth domain, project id, storage bucket, messaging sender id, app id, measurement id).
- Throws a clear error at startup if any required key is missing (`VITE_FIREBASE_MEASUREMENT_ID` is optional).
- No side effects on import beyond `initializeApp`.
- Unit test asserts: missing required env → throws; all present → returns non-null singletons.

- [ ] **Step 1: Write failing test `src/lib/firebase/index.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('firebase singletons', () => {
  const ORIGINAL_ENV = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    Object.assign(import.meta.env, ORIGINAL_ENV);
  });

  it('throws when required env vars are missing', async () => {
    (import.meta.env as Record<string, string>).VITE_FIREBASE_API_KEY = '';
    await expect(import('./index')).rejects.toThrow(/VITE_FIREBASE_API_KEY/);
  });

  it('exports app, auth, db, storage when env is complete', async () => {
    const env = import.meta.env as Record<string, string>;
    env.VITE_FIREBASE_API_KEY = 'test-key';
    env.VITE_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
    env.VITE_FIREBASE_PROJECT_ID = 'warehouse-8ec61';
    env.VITE_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
    env.VITE_FIREBASE_MESSAGING_SENDER_ID = '1';
    env.VITE_FIREBASE_APP_ID = '1:1:web:abc';
    const mod = await import('./index');
    expect(mod.app).toBeTruthy();
    expect(mod.auth).toBeTruthy();
    expect(mod.db).toBeTruthy();
    expect(mod.storage).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/firebase/index.test.ts`
Expected: FAIL (`./index.ts` does not exist yet).

- [ ] **Step 3: Write `src/lib/firebase/index.ts`**

```ts
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

for (const key of requiredKeys) {
  if (!import.meta.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export const analytics: Analytics | null = await isSupported()
  .then((supported) => (supported ? getAnalytics(app) : null))
  .catch(() => null);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/firebase/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase/
git commit -m "feat(firebase): initialize app + expose auth/db/storage/analytics singletons"
```

---

## Task 3: Domain repository interfaces (Auth + User)

**Role:** `domain-modeler`

**Files:**
- Create: `C:/Users/DELL/Desktop/warehouse/src/domain/repositories/AuthRepository.ts`
- Create: `C:/Users/DELL/Desktop/warehouse/src/domain/repositories/UserRepository.ts`

**Acceptance criteria:**
- Both files export TypeScript interfaces / types — no runtime code except bare re-exports.
- `AuthRepository` defines: `signIn(email, password): Promise<AuthUser>`, `signOut(): Promise<void>`, `onAuthStateChanged(cb): Unsubscribe`.
- `UserRepository` defines: `getUserProfile(uid): Promise<UserProfile | null>` where `UserProfile = { uid, email, displayName, role }` and `UserRole = 'admin' | 'manager' | 'viewer'` (**exactly 3 roles**).
- `tsc --noEmit` passes.

- [ ] **Step 1: Write `src/domain/repositories/AuthRepository.ts`**

```ts
export interface AuthUser {
  uid: string;
  email: string;
}

export type Unsubscribe = () => void;

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthRepository {
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  onAuthStateChanged(cb: (user: AuthUser | null) => void): Unsubscribe;
}
```

- [ ] **Step 2: Write `src/domain/repositories/UserRepository.ts`**

```ts
export type UserRole = 'admin' | 'manager' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface UserRepository {
  getUserProfile(uid: string): Promise<UserProfile | null>;
}
```

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/DELL/Desktop/warehouse
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/domain/repositories/
git commit -m "feat(domain): define AuthRepository and UserRepository ports (TS strict)"
```

---

## Task 4: Firebase adapters for Auth + User

**Role:** `firebase-engineer`

**Files:**
- Create: `C:/Users/DELL/Desktop/warehouse/src/infra/repositories/firebaseAuthRepository.ts`
- Create: `C:/Users/DELL/Desktop/warehouse/src/infra/repositories/firestoreUserRepository.ts`
- Test: `C:/Users/DELL/Desktop/warehouse/src/infra/repositories/firebaseAuthRepository.test.ts`
- Test: `C:/Users/DELL/Desktop/warehouse/src/infra/repositories/firestoreUserRepository.test.ts`

**Acceptance criteria:**
- Adapters are const objects typed as the matching port from Task 3.
- Every async call wrapped in try/catch; original Firebase error surfaced as an `AuthError`.
- Unit tests mock `firebase/auth` and `firebase/firestore` via `vi.mock`; no network I/O.
- `firestoreUserRepository.getUserProfile('nonexistent')` returns `null` (not throws).
- `role` field is narrowed to `UserRole`; unknown values coerced to `'viewer'`.

- [ ] **Step 1: Write failing test `firebaseAuthRepository.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));
vi.mock('@/lib/firebase', () => ({ auth: {} }));

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { firebaseAuthRepository } from './firebaseAuthRepository';

const mockedSignIn = vi.mocked(signInWithEmailAndPassword);
const mockedSignOut = vi.mocked(signOut);
const mockedOnAuthStateChanged = vi.mocked(onAuthStateChanged);

describe('firebaseAuthRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signIn returns AuthUser shape on success', async () => {
    mockedSignIn.mockResolvedValue({
      user: { uid: 'u1', email: 'a@b.c' },
    } as never);
    const result = await firebaseAuthRepository.signIn('a@b.c', 'pw');
    expect(result).toEqual({ uid: 'u1', email: 'a@b.c' });
  });

  it('signIn throws AuthError on failure', async () => {
    mockedSignIn.mockRejectedValue({
      code: 'auth/invalid-credential',
      message: 'bad',
    });
    await expect(firebaseAuthRepository.signIn('a', 'b')).rejects.toMatchObject({
      code: 'auth/invalid-credential',
    });
  });

  it('signOut resolves', async () => {
    mockedSignOut.mockResolvedValue(undefined);
    await expect(firebaseAuthRepository.signOut()).resolves.toBeUndefined();
  });

  it('onAuthStateChanged forwards callback and returns unsubscribe', () => {
    const unsub = vi.fn();
    mockedOnAuthStateChanged.mockImplementation(((_auth: unknown, cb: (u: unknown) => void) => {
      cb({ uid: 'u1', email: 'a@b.c' });
      return unsub;
    }) as never);
    const received = vi.fn();
    const ret = firebaseAuthRepository.onAuthStateChanged(received);
    expect(received).toHaveBeenCalledWith({ uid: 'u1', email: 'a@b.c' });
    expect(ret).toBe(unsub);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- firebaseAuthRepository`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement `firebaseAuthRepository.ts`**

```ts
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { AuthRepository, AuthError } from '@/domain/repositories/AuthRepository';

function toAuthError(err: unknown): AuthError {
  if (typeof err === 'object' && err !== null) {
    const e = err as { code?: unknown; message?: unknown };
    return {
      code: typeof e.code === 'string' ? e.code : 'auth/unknown',
      message: typeof e.message === 'string' ? e.message : 'Unknown auth error',
    };
  }
  return { code: 'auth/unknown', message: 'Unknown auth error' };
}

export const firebaseAuthRepository: AuthRepository = {
  async signIn(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { uid: cred.user.uid, email: cred.user.email ?? '' };
    } catch (err) {
      throw toAuthError(err);
    }
  },
  async signOut() {
    await signOut(auth);
  },
  onAuthStateChanged(cb) {
    return onAuthStateChanged(auth, (user) => {
      cb(user ? { uid: user.uid, email: user.email ?? '' } : null);
    });
  },
};
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm test -- firebaseAuthRepository`
Expected: PASS.

- [ ] **Step 5: Write failing test `firestoreUserRepository.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({ _path: parts.join('/') })),
  getDoc: vi.fn(),
}));
vi.mock('@/lib/firebase', () => ({ db: {} }));

import { getDoc } from 'firebase/firestore';
import { firestoreUserRepository } from './firestoreUserRepository';

const mockedGetDoc = vi.mocked(getDoc);

describe('firestoreUserRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when user doc does not exist', async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => false } as never);
    await expect(firestoreUserRepository.getUserProfile('u1')).resolves.toBeNull();
  });

  it('returns UserProfile when doc exists', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'u1',
      data: () => ({ email: 'a@b.c', displayName: 'A', role: 'admin' }),
    } as never);
    await expect(firestoreUserRepository.getUserProfile('u1')).resolves.toEqual({
      uid: 'u1',
      email: 'a@b.c',
      displayName: 'A',
      role: 'admin',
    });
  });

  it('narrows unknown role to viewer', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'u1',
      data: () => ({ email: 'a@b.c', displayName: 'A', role: 'operator' }),
    } as never);
    await expect(firestoreUserRepository.getUserProfile('u1')).resolves.toMatchObject({
      role: 'viewer',
    });
  });
});
```

- [ ] **Step 6: Implement `firestoreUserRepository.ts`**

```ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  UserRepository,
  UserProfile,
  UserRole,
} from '@/domain/repositories/UserRepository';

const VALID_ROLES: readonly UserRole[] = ['admin', 'manager', 'viewer'];

function toRole(value: unknown): UserRole {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value)
    ? (value as UserRole)
    : 'viewer';
}

export const firestoreUserRepository: UserRepository = {
  async getUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    const profile: UserProfile = {
      uid: snap.id,
      email: typeof data.email === 'string' ? data.email : '',
      displayName: typeof data.displayName === 'string' ? data.displayName : '',
      role: toRole(data.role),
    };
    return profile;
  },
};
```

- [ ] **Step 7: Run both tests**

Run: `npm test -- repositories`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/infra/repositories/
git commit -m "feat(infra): implement firebase auth + firestore user repositories"
```

---

## Task 5: AuthContext + useAuth hook

**Role:** `react-ui-engineer`

**Files:**
- Create: `C:/Users/DELL/Desktop/warehouse/src/contexts/AuthContext.tsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/hooks/useAuth.ts`
- Test: `C:/Users/DELL/Desktop/warehouse/src/contexts/AuthContext.test.tsx`
- Delete (directory): `C:/Users/DELL/Desktop/warehouse/src/context/` (singular collision — §4 cleanup)

**Acceptance criteria:**
- `AuthProvider` subscribes on mount via `authRepo.onAuthStateChanged`, loads profile via `userRepo.getUserProfile(uid)` when signed in.
- Exposes `{ user, profile, loading, error, signIn(email, password), signOut() }` — fully typed.
- `useAuth()` throws if used outside provider.
- Test: mock repos, assert provider transitions `loading: true → loading: false` and profile populates after signIn.

- [ ] **Step 1: Delete the singular collision dir**

```bash
rm -rf C:/Users/DELL/Desktop/warehouse/src/context
```

- [ ] **Step 2: Write failing test `AuthContext.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { AuthUser } from '@/domain/repositories/AuthRepository';

const onAuthStateChanged = vi.fn();
const signIn = vi.fn();
const signOut = vi.fn();
const getUserProfile = vi.fn();

vi.mock('@/infra/repositories/firebaseAuthRepository', () => ({
  firebaseAuthRepository: { signIn, signOut, onAuthStateChanged },
}));
vi.mock('@/infra/repositories/firestoreUserRepository', () => ({
  firestoreUserRepository: { getUserProfile },
}));

import { AuthProvider } from './AuthContext';
import { useAuth } from '@/hooks/useAuth';

function Probe() {
  const { user, profile, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{user ? `${user.email}/${profile?.role ?? 'none'}` : 'anon'}</div>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits loading then anon', async () => {
    let cb: ((u: AuthUser | null) => void) | undefined;
    onAuthStateChanged.mockImplementation((c: (u: AuthUser | null) => void) => {
      cb = c;
      return () => {};
    });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText('loading')).toBeInTheDocument();
    await act(async () => cb?.(null));
    expect(screen.getByText('anon')).toBeInTheDocument();
  });

  it('loads profile after user appears', async () => {
    let cb: ((u: AuthUser | null) => void) | undefined;
    onAuthStateChanged.mockImplementation((c: (u: AuthUser | null) => void) => {
      cb = c;
      return () => {};
    });
    getUserProfile.mockResolvedValue({
      uid: 'u1', email: 'a@b.c', displayName: 'A', role: 'admin',
    });
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => cb?.({ uid: 'u1', email: 'a@b.c' }));
    expect(screen.getByText('a@b.c/admin')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement `src/hooks/useAuth.ts`**

```ts
import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
```

- [ ] **Step 4: Implement `src/contexts/AuthContext.tsx`**

```tsx
import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { firebaseAuthRepository } from '@/infra/repositories/firebaseAuthRepository';
import { firestoreUserRepository } from '@/infra/repositories/firestoreUserRepository';
import type { AuthUser } from '@/domain/repositories/AuthRepository';
import type { UserProfile } from '@/domain/repositories/UserRepository';

export interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: unknown;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const unsub = firebaseAuthRepository.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          setProfile(await firestoreUserRepository.getUserProfile(u.uid));
        } catch (err) {
          setError(err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    loading,
    error,
    signIn: (email, password) => firebaseAuthRepository.signIn(email, password),
    signOut: () => firebaseAuthRepository.signOut(),
  }), [user, profile, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 5: Run test — expect PASS**

Run: `npm test -- AuthContext`

- [ ] **Step 6: Commit**

```bash
git add src/contexts/ src/hooks/
git rm -r src/context 2>/dev/null || true
git commit -m "feat(auth): AuthProvider + useAuth hook (typed); drop duplicate src/context dir"
```

---

## Task 6: i18n init + seed locales

**Role:** `i18n-engineer`

**Files:**
- Create: `C:/Users/DELL/Desktop/warehouse/src/i18n/index.ts`
- Create: `C:/Users/DELL/Desktop/warehouse/src/locales/en/common.json`
- Create: `C:/Users/DELL/Desktop/warehouse/src/locales/en/auth.json`
- Create: `C:/Users/DELL/Desktop/warehouse/src/locales/ru/common.json`
- Create: `C:/Users/DELL/Desktop/warehouse/src/locales/ru/auth.json`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/main.tsx` (import `./i18n` before App render)
- Test: `C:/Users/DELL/Desktop/warehouse/src/i18n/index.test.tsx`

**Keys seeded:**

`common.json` (en): `appTitle`, `loading`, `error.generic`, `placeholder.title`, `placeholder.subtitle`, `button.signOut`, `button.retry`, `forbidden.title`, `forbidden.subtitle`.
`auth.json` (en): `login.title`, `login.email`, `login.password`, `login.submit`, `login.error.invalid`, `login.error.unknown`.

Russian mirrors each key with an actual translation (no "TODO" placeholders).

- [ ] **Step 1: Write `src/locales/en/common.json`**

```json
{
  "appTitle": "Warehouse",
  "loading": "Loading...",
  "error": { "generic": "Something went wrong." },
  "placeholder": {
    "title": "Coming soon",
    "subtitle": "This area is not built yet."
  },
  "forbidden": {
    "title": "Access denied",
    "subtitle": "You do not have permission to view this page."
  },
  "button": {
    "signOut": "Sign out",
    "retry": "Try again"
  }
}
```

- [ ] **Step 2: Write `src/locales/en/auth.json`**

```json
{
  "login": {
    "title": "Sign in",
    "email": "Email",
    "password": "Password",
    "submit": "Sign in",
    "error": {
      "invalid": "Invalid email or password.",
      "unknown": "Sign-in failed. Please try again."
    }
  }
}
```

- [ ] **Step 3: Write `src/locales/ru/common.json`**

```json
{
  "appTitle": "Склад",
  "loading": "Загрузка...",
  "error": { "generic": "Что-то пошло не так." },
  "placeholder": {
    "title": "Скоро будет",
    "subtitle": "Этот раздел ещё не готов."
  },
  "forbidden": {
    "title": "Доступ запрещён",
    "subtitle": "У вас нет прав для просмотра этой страницы."
  },
  "button": {
    "signOut": "Выйти",
    "retry": "Повторить"
  }
}
```

- [ ] **Step 4: Write `src/locales/ru/auth.json`**

```json
{
  "login": {
    "title": "Вход",
    "email": "Email",
    "password": "Пароль",
    "submit": "Войти",
    "error": {
      "invalid": "Неверный email или пароль.",
      "unknown": "Не удалось войти. Попробуйте ещё раз."
    }
  }
}
```

- [ ] **Step 5: Write `src/i18n/index.ts`**

```ts
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import ruCommon from '@/locales/ru/common.json';
import ruAuth from '@/locales/ru/auth.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru'],
    defaultNS: 'common',
    ns: ['common', 'auth'],
    interpolation: { escapeValue: false },
    resources: {
      en: { common: enCommon, auth: enAuth },
      ru: { common: ruCommon, auth: ruAuth },
    },
  });

export default i18n;
```

- [ ] **Step 6: Wire into `src/main.tsx`**

Change `src/main.tsx` to:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Write `src/i18n/index.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import '@/i18n';

function Probe() {
  const { t } = useTranslation('common');
  return <span>{t('appTitle')}</span>;
}

describe('i18n init', () => {
  it('resolves the common.appTitle key', () => {
    render(<Probe />);
    expect(screen.getByText(/Warehouse|Склад/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run test — expect PASS**

Run: `npm test -- i18n`

- [ ] **Step 9: Commit**

```bash
git add src/i18n/ src/locales/ src/main.tsx
git commit -m "feat(i18n): init i18next with en+ru locales for common+auth"
```

---

## Task 7: Routing skeleton + RequireAuth + RoleGate + LoginForm/Page + DashboardPage + NotFoundPage

**Role:** `react-ui-engineer`

**Files:**
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/routing/AppRouter.tsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/routing/RequireAuth.tsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/routing/RoleGate.tsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/common/RoutePlaceholder/RoutePlaceholder.tsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/common/RoutePlaceholder/index.ts`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/auth/LoginForm.tsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/pages/LoginPage.tsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/pages/DashboardPage.tsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/pages/NotFoundPage.tsx`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/App.tsx` (wrap with `<AuthProvider>` + `<AppRouter>`)
- Test: `C:/Users/DELL/Desktop/warehouse/src/components/routing/RequireAuth.test.tsx`
- Test: `C:/Users/DELL/Desktop/warehouse/src/components/auth/LoginForm.test.tsx`

**Acceptance criteria:**
- Routes: `/login` → `LoginPage`; `/` → `RequireAuth` → `DashboardPage`; `*` → `NotFoundPage`.
- `<RequireAuth>` shows `t('common:loading')` while `loading`; redirects to `/login` when no `user`; renders children otherwise.
- `<RoleGate allowed={['admin']}>` renders children when `profile.role ∈ allowed`, otherwise a forbidden `RoutePlaceholder` (variant: `forbidden`).
- `<LoginForm>` is controlled; on submit calls `useAuth().signIn`; shows `auth:login.error.invalid` on `auth/invalid-credential`, `auth:login.error.unknown` otherwise.
- `<DashboardPage>` renders greeting with `user.email` and a sign-out button calling `useAuth().signOut`.

- [ ] **Step 1: Write failing test `RequireAuth.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from '@/hooks/useAuth';

const mockedUseAuth = vi.mocked(useAuth);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login-screen</div>} />
        <Route path="/" element={<RequireAuth><div>dashboard</div></RequireAuth>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('shows loading while auth resolving', () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: true } as never);
    renderAt('/');
    expect(screen.getByText(/Loading|Загрузка/i)).toBeInTheDocument();
  });

  it('redirects to /login when anon', () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: false } as never);
    renderAt('/');
    expect(screen.getByText('login-screen')).toBeInTheDocument();
  });

  it('renders children when authed', () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1', email: 'a@b.c' }, loading: false } as never);
    renderAt('/');
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `RequireAuth.tsx`**

```tsx
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
  const { user, loading } = useAuth();
  const { t } = useTranslation('common');
  if (loading) return <div className="p-8 text-slate-600">{t('loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 3: Implement `RoleGate.tsx`**

```tsx
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RoutePlaceholder } from '@/components/common/RoutePlaceholder';
import type { UserRole } from '@/domain/repositories/UserRepository';

export function RoleGate({
  allowed,
  children,
}: {
  allowed: readonly UserRole[];
  children: ReactNode;
}): JSX.Element {
  const { profile } = useAuth();
  if (!profile || !allowed.includes(profile.role)) {
    return <RoutePlaceholder variant="forbidden" />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: Implement `RoutePlaceholder.tsx` + `index.ts`**

```tsx
// RoutePlaceholder.tsx
import { useTranslation } from 'react-i18next';

type Variant = 'coming-soon' | 'forbidden';

export function RoutePlaceholder({ variant = 'coming-soon' }: { variant?: Variant }): JSX.Element {
  const { t } = useTranslation('common');
  const keyBase = variant === 'forbidden' ? 'forbidden' : 'placeholder';
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{t(`${keyBase}.title`)}</h1>
        <p className="mt-2 text-sm text-slate-600">{t(`${keyBase}.subtitle`)}</p>
      </div>
    </div>
  );
}
```

```ts
// index.ts
export { RoutePlaceholder } from './RoutePlaceholder';
```

- [ ] **Step 5: Write failing test `LoginForm.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from './LoginForm';

const signIn = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ signIn }),
}));

describe('LoginForm', () => {
  it('submits email and password', async () => {
    signIn.mockResolvedValue({ uid: 'u1' });
    const user = userEvent.setup();
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    await user.type(screen.getByLabelText(/Email/i), 'a@b.c');
    await user.type(screen.getByLabelText(/Password|Пароль/i), 'pw');
    await user.click(screen.getByRole('button', { name: /Sign in|Войти/i }));
    expect(signIn).toHaveBeenCalledWith('a@b.c', 'pw');
  });

  it('shows invalid credential error', async () => {
    signIn.mockRejectedValue({ code: 'auth/invalid-credential' });
    const user = userEvent.setup();
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    await user.type(screen.getByLabelText(/Email/i), 'a@b.c');
    await user.type(screen.getByLabelText(/Password|Пароль/i), 'pw');
    await user.click(screen.getByRole('button', { name: /Sign in|Войти/i }));
    expect(await screen.findByText(/Invalid email|Неверный/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Implement `LoginForm.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export function LoginForm(): JSX.Element {
  const { t } = useTranslation('auth');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      const code = (err as { code?: unknown })?.code;
      setError(code === 'auth/invalid-credential' ? 'login.error.invalid' : 'login.error.unknown');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">{t('login.title')}</h1>
      <label className="block">
        <span className="text-sm text-slate-700">{t('login.email')}</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-slate-700">{t('login.password')}</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{t(error)}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {t('login.submit')}
      </button>
    </form>
  );
}
```

- [ ] **Step 7: Implement `LoginPage.tsx`**

```tsx
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage(): JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 8: Implement `DashboardPage.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage(): JSX.Element {
  const { user, profile, signOut } = useAuth();
  const { t } = useTranslation('common');
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t('appTitle')}</h1>
        <button
          type="button"
          onClick={() => { void signOut(); }}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
        >
          {t('button.signOut')}
        </button>
      </header>
      <p className="mt-6 text-slate-700">
        {profile?.displayName || user?.email} ({profile?.role ?? '—'})
      </p>
    </main>
  );
}
```

- [ ] **Step 9: Implement `NotFoundPage.tsx`**

```tsx
import { RoutePlaceholder } from '@/components/common/RoutePlaceholder';

export default function NotFoundPage(): JSX.Element {
  return <RoutePlaceholder />;
}
```

- [ ] **Step 10: Implement `AppRouter.tsx`**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { RequireAuth } from '@/components/routing/RequireAuth';

export function AppRouter(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 11: Rewrite `src/App.tsx`**

```tsx
import { AuthProvider } from '@/contexts/AuthContext';
import { AppRouter } from '@/components/routing/AppRouter';

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
```

- [ ] **Step 12: Update `src/App.test.tsx`** (the Task 1 smoke test; replace body since App no longer renders "boot OK")

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('@/infra/repositories/firebaseAuthRepository', () => ({
  firebaseAuthRepository: {
    onAuthStateChanged: (cb: (u: null) => void) => { cb(null); return () => {}; },
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
}));
vi.mock('@/infra/repositories/firestoreUserRepository', () => ({
  firestoreUserRepository: { getUserProfile: vi.fn() },
}));

describe('App', () => {
  it('renders the login page when unauthenticated at /', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Sign in|Вход/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 13: Run the full suite + typecheck — expect PASS**

```bash
cd C:/Users/DELL/Desktop/warehouse
npm run typecheck
npm test
```

- [ ] **Step 14: Commit**

```bash
git add src/
git commit -m "feat(app): router + auth guard + role gate + login page + dashboard stub"
```

---

## Task 8: Firestore rules stub + README rewrite + cleanup

**Role:** `firebase-engineer` (rules stub) + `react-ui-engineer` (README)

**Files:**
- Create: `C:/Users/DELL/Desktop/warehouse/firestore.rules`
- Modify: `C:/Users/DELL/Desktop/warehouse/README.md` (full rewrite)
- Delete (directory): `C:/Users/DELL/Desktop/warehouse/src/infra/positories/` (typo cleanup — §4)

**Acceptance criteria:**
- `firestore.rules` is a deny-all stub with a visible TODO header pointing to Iteration 1.
- `README.md` documents: project name, stack, env var names (no values), `npm run dev`, `npm test`, `npm run build`, architecture in 5 bullets, roadmap pointer to `docs/superpowers/plans/`.
- Typo directory removed.

- [ ] **Step 1: Write `firestore.rules`**

```
rules_version = '2';

// STUB — Iteration 0 for project warehouse-8ec61.
// Full role-based rules are authored in Iteration 1.
// Until then, deny every client read/write. Server-side admin SDK (if used) is unaffected.
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Rewrite `README.md`**

````markdown
# Warehouse

A warehouse / asset-tracking web app. React 19 + TypeScript + Firebase, bundled with Vite.

## Stack

- React 19, TypeScript 5 (strict), Vite 5, Vitest
- Firebase 12 (Auth, Firestore, Storage, Analytics) — project id `warehouse-8ec61`
- react-router-dom 7, react-i18next 15, Tailwind CSS 3

## Environment

Create a `.env.local` file at the repo root with these 7 keys (values come from the Firebase console: Project settings → General → Your apps):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=warehouse-8ec61
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

`.env.local` is gitignored; never commit it.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:3000 |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest in CI mode |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | ESLint across the repo |
| `npm run typecheck` | `tsc --noEmit` only |

## Architecture

- UI lives in `src/components/**` and `src/pages/**` and consumes data via hooks.
- Hooks (`src/hooks/**`) call domain repository interfaces (`src/domain/repositories/**`).
- Firebase adapters (`src/infra/repositories/**`) implement those interfaces. Components never import `firebase/*` directly.
- Firebase singletons live in `src/lib/firebase`. Auth state is provided by `AuthProvider` in `src/contexts/AuthContext.tsx`.
- i18n via `react-i18next`; English + Russian resources in `src/locales/**`.

## Roles

Three roles are modelled in `users/{uid}.role`: `admin`, `manager`, `viewer`. Client-side `<RoleGate>` is UX-only — Firestore rules are the real enforcement (written in Iteration 1).

## Roadmap

Implementation plans live in `docs/superpowers/plans/`.
````

- [ ] **Step 3: Remove the typo directory**

```bash
rm -rf C:/Users/DELL/Desktop/warehouse/src/infra/positories
```

- [ ] **Step 4: Verify build + test still green**

```bash
cd C:/Users/DELL/Desktop/warehouse
npm run typecheck
npm test
npm run build
```

All expected: PASS / success.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules README.md
git rm -r src/infra/positories 2>/dev/null || true
git commit -m "chore: firestore rules stub, rewrite README, drop typo dir"
```

---

## Task 9: Final verification pass

**Role:** orchestrator (verification-before-completion skill)

- [ ] **Step 1: Full CI verification**

```bash
cd C:/Users/DELL/Desktop/warehouse
npm run typecheck
npm test
npm run build
npm run lint
```

Expected: typecheck zero errors; all test files PASS, zero failures, zero skipped; build succeeds; lint zero errors (warnings acceptable if benign).

- [ ] **Step 2: Manual smoke checklist** (user runs this after renaming env keys to `VITE_FIREBASE_*`)

- [ ] `npm run dev` boots on port 3000.
- [ ] Visiting `/` without being signed in redirects to `/login`.
- [ ] Login form renders in English (default) and switches to Russian when browser locale is `ru`.
- [ ] Submitting invalid credentials shows the localized invalid-credential error.
- [ ] After successful sign-in (requires a real user in the Firebase Auth console and a matching `users/{uid}` doc with `role` ∈ `admin|manager|viewer`), `/` shows the dashboard greeting and role.
- [ ] Clicking "Sign out" returns to `/login`.
- [ ] Hitting `/totally-not-a-route` shows the 404 placeholder.

- [ ] **Step 3: Prepare Phase 7 delivery report per §13**

No code changes in this step — just the report.

---

## Self-review notes

- Every task has explicit files, full code, and verification commands. No "TODO", no "similar to Task N", no placeholder comments left in the plan.
- Type names (`AuthUser`, `UserProfile`, `UserRole`) are consistent across Tasks 3, 4, 5, 7; `UserRole` is exactly 3 values: `'admin' | 'manager' | 'viewer'`.
- Coverage vs locked-in decisions: Vite+TS migration (Task 1), env prefix `VITE_*` (Tasks 1, 2), role enum 3-wide (Tasks 3, 4, 7), Vitest (Task 1), engines pin (Task 1), TS strict (whole plan in `.ts`/`.tsx`), minimal TS-aware ESLint (Task 1), no Prettier (absent by design), en + ru seeded (Task 6), `users/{uid}.role` auth model (Tasks 3, 4, 5), project id `warehouse-8ec61` (README + rules stub comment).
- Cleanup items from §14 addressed: delete `src/context/` (Task 5), delete `src/infra/positories/` (Task 8), pin undeclared packages (Task 1), replace CRA `<title>` (Task 1), rewrite README (Task 8), discard CRA whitespace noise (all CRA files deleted in Task 1, `.gitattributes` added in Task 1 to prevent future churn).
- Rules / auth security review (Phase 5c) will fire on Tasks 2, 4, 5, 7, 8 because auth + rules are touched. `security-reviewer` must PASS before Phase 6.
- Runtime exit condition for every task: `npm run typecheck && npm test && npm run build` all green. If any of the three fails, the implementer is re-dispatched.
