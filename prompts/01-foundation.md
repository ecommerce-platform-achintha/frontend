# Prompt 01: Foundation (scaffold, auth, API client, UI kit, shell)

Before anything else, read `docs/frontend-contract.md` completely. It is the source of truth for the backend. Do not invent endpoints, fields or enum values. If something you need is not in the contract, say so in your final report instead of guessing.

## Context

I am building the web frontend for an existing e-commerce marketplace (Sri Lanka, prices in LKR) that runs behind an API gateway. Roles: guest, customer, merchant (store owner), assistant (merchant staff with per-user permissions), admin and super admin. I am a beginner in frontend, so keep the code simple, consistent and commented where the reason is not obvious. Use JavaScript with JSX, no TypeScript.

## Stack (fixed)

- Vite 7 with `@vitejs/plugin-react-swc` (use `npm create vite@latest marketplace-web -- --template react-swc`), React 19
- Tailwind CSS 4 via `@tailwindcss/vite`, class-based dark mode (`dark` on `<html>`)
- `lucide-react` for icons
- `react-router-dom` 7, nested routes under layouts that render `<Outlet />`
- Redux Toolkit and `react-redux`: one slice per resource, `createAsyncThunk` for API calls, exported selectors
- Axios instance with a Bearer interceptor and a refresh queue
- ESLint 9 flat config
- Do not add other runtime dependencies without telling me why in the final report.

Node must be 20.19 or newer for Vite 7. Check `node -v` first and tell me if it is too old.

## Tasks

1. **Scaffold** the project in the current empty folder `marketplace-web`.
    - `vite.config.js`: plugins `react()` and `tailwindcss()`, alias `@` to `src`, `server: { port: 5173, strictPort: true }` (the gateway only allows origins `localhost:5173` and `localhost:3000`; any other port breaks CORS).
    - `.env.example` and `.env.local` with `VITE_API_BASE_URL=http://localhost:8080`. `.gitignore` must exclude `.env.local`.
    - Tailwind 4 setup in `src/index.css`: `@import "tailwindcss";`, `@custom-variant dark (&:where(.dark, .dark *));` and `@theme` tokens for brand colours (primary: indigo, success: emerald, warning: amber, danger: rose, neutrals: slate), radius and shadows.
    - A small inline script in `index.html` that applies the saved theme (or the OS preference) to `<html>` before React loads, to avoid a flash.
    - Production CSP notes in the README only; do not break the Vite dev server.
2. **Folder structure** (adjust only with a reason): `src/api`, `src/app` (store, router), `src/config`, `src/store/slices`, `src/store/factories`, `src/hooks`, `src/components/ui`, `src/components/layout`, `src/components/common`, `src/pages/{public,auth,customer,merchant,admin}`, `src/utils`.
3. **API layer** (`src/api/client.js` and one module per area: `auth`, `users`, `stores`, `catalog`, `orders`, `admin`).
    - One Axios instance, `baseURL` from `import.meta.env.VITE_API_BASE_URL`, `withCredentials: false`, `paramsSerializer: { indexes: null }` so array params become `status=A&status=B`.
    - Request interceptor: attach `Authorization: Bearer <accessToken>` EXCEPT for `/api/public/**`, `/api/auth/login`, `/api/auth/refresh` and `/api/users/register/**` (contract section 3).
    - Response interceptor: on 401 for any other URL, run one single-flight refresh, then replay the request once. Queue concurrent 401s behind the same refresh promise. Wrap the refresh in `navigator.locks.request('mp-refresh', ...)` and re-read the stored tokens after acquiring the lock (a refresh token is single use; reuse kills the session). Persist the new tokens before releasing the lock. If refresh fails, clear the session and redirect to `/login` with a "session expired" message. Never refresh for `/api/auth/*` URLs.
    - Normalise every error to `{ status, code, message, fieldErrors, retryAfter }` (handle `Retry-After`, network errors and non-JSON bodies). Export a helper `fieldErrorsToMap(error)` for forms.
    - Export `newIdempotencyKey()` (crypto.randomUUID) and a way to pass the `Idempotency-Key` header per request.
    - Do not use a hard-coded path outside these modules; pages call functions or thunks.
4. **Utilities**: `utils/jwt.js` (decode payload with base64url and UTF-8 handling, no library; return `{ sub, pid, role, status, storeId, perms, exp }`), `utils/format.js` (LKR money, dates in `Asia/Colombo`, relative time, `maskNic`), `utils/ids.js` (public id regex and validator), `utils/storageKeys.js` (generate a valid simulated storage key from a file name; sanitise to the regex in contract section 6), `utils/validators.js` (phone, NIC, password policy with a rule-by-rule result, email).
5. **Redux**
    - `store/factories/createPagedResource.js`: a factory that produces a slice for a paged list (items, page info, status, error, query) with a thunk that takes `{ page, size, sort, ...filters }`, so list screens do not repeat boilerplate. Use it later for orders, products, users and so on. Still follow "one slice per resource".
    - Slices now: `auth` (tokens, decoded claims, profile from `/api/users/me`, `mustChangePassword`, status and reason), `ui` (theme, toasts, global banners). Persist tokens in `localStorage` under the `mp.` prefix and restore on load (if the access token is expired, refresh before rendering protected pages; show a splash screen meanwhile).
    - Exported selectors for everything the components read.
6. **Permissions and routing**
    - `config/permissions.js`: the role names, the nine assistant permissions, and a route table mapping each feature to the roles and permissions from contract section 4.
    - `hooks/usePermissions.js`: `hasRole`, `hasPerm(p)` (true for the merchant role), `hasAnyPerm`, `isOwner`, `isAdmin`, `isSuperAdmin`, `isBanned`, `canActAsCustomer`.
    - `ProtectedRoute` (props: `roles`, `perms`, `anyPerms`): not signed in goes to `/login?next=...`; wrong role or permission goes to a friendly 403 page; `mustChangePassword` goes to `/change-password`.
    - `PermissionButton`: hides or disables with a tooltip explaining why.
    - Router with layouts: `PublicLayout` (header with logo, search box, categories menu, cart badge for customers, account menu, theme toggle), `CustomerLayout` (account area), `MerchantLayout` (sidebar built from the permissions the user holds, owner-only items shown only to the merchant), `AdminLayout` (sidebar, super-admin items shown only to the super admin). Mobile: sidebars become a drawer. Create a placeholder page for every route below so navigation works end to end; later prompts replace the placeholders.
    - Landing after login: customer to `/`, merchant to `/merchant`, assistant to the first page its permissions allow, admin and super admin to `/admin`. Merchant with status `REJECTED` lands on `/merchant/application`.
    - Route skeleton: public (`/`, `/search`, `/products/:publicId`, `/stores`, `/stores/:publicId`, `/login`, `/register`, `/register/merchant`), customer (`/cart`, `/checkout`, `/orders`, `/orders/:publicId`, `/account/profile`, `/account/addresses`, `/complaints`, `/complaints/:publicId`), merchant (`/merchant`, `/merchant/application`, `/merchant/orders`, `/merchant/orders/:publicId`, `/merchant/complaints`, `/merchant/products`, `/merchant/products/new`, `/merchant/products/:publicId`, `/merchant/discounts`, `/merchant/reviews`, `/merchant/customer-blocks`, `/merchant/store`, `/merchant/bank-accounts`, `/merchant/shipping`, `/merchant/assistants`, `/merchant/metrics`), admin (`/admin`, `/admin/merchants/pending`, `/admin/users`, `/admin/users/:publicId`, `/admin/stores`, `/admin/stores/:publicId`, `/admin/at-risk`, `/admin/orders`, `/admin/orders/:publicId`, `/admin/complaints`, `/admin/flagged-references`, `/admin/cod-objections`, `/admin/categories`, `/admin/reviews`, `/admin/banks`, `/admin/couriers`, `/admin/admins`, `/admin/settings`, `/admin/holidays`, `/admin/credits`), shared (`/change-password`, `/403`, `*` not found). The last five admin entries after `/admin/couriers` are super-admin only.
7. **UI kit** in `components/ui` (Tailwind only, accessible, dark-mode aware, keyboard friendly): Button (variants, sizes, loading), IconButton, Input, PasswordInput (with live policy checklist), Textarea, Select, Checkbox, Switch, FormField (label, hint, error), Modal, ConfirmDialog (optional required reason textarea, 1 to 500 characters, used for every ban, reject, hide and resolve action), Drawer, Tabs, Card, Badge and `StatusBadge` (one colour map for every enum in contract section 5), Table (turns into stacked cards on small screens), server-side Pagination (page, size options, total), SearchInput (debounced), EmptyState, ErrorState (retry), Skeleton, Spinner, Toast, Tooltip, Breadcrumbs, PriceTag (shows list price struck through when discounted), RatingStars, QuantityStepper, Countdown (to `deadlineAt`, no drift), Stepper (order progress), CopyButton, MoneyInput, FilePicker (picks files, generates simulated keys, shows the "uploads are simulated" notice, image `onError` fallback).
8. **Auth pages**: login, customer registration, merchant registration (two steps: account and business details with 1 to 10 simulated document keys), forced change-password page, logout, profile loading. Show server `fieldErrors` under the right inputs and `message` for everything else. Handle 429 with a countdown from `Retry-After`. After registration go to login with a success message (merchants: explain approval is pending).
9. **Status banner** component used by all layouts: customer `BANNED` (reason, checkout disabled), merchant `PENDING_APPROVAL`, `REJECTED`, `BANNED`. Never mention or infer a silent ban grace period.
10. **Quality**: ESLint 9 flat config clean (`npm run lint`), `npm run build` passes, no `dangerouslySetInnerHTML`, no tokens in `console.log`, no secrets in the repo. Write a README with the run steps for Ubuntu and WebStorm (install, `.env.local`, `npm run dev`), the port and CORS note, and a "Simulated uploads" note.

## Design direction

Modern marketplace feel: lots of white space, rounded-xl cards, soft shadows, one primary colour, clear hierarchy, big tap targets, mobile-first, skeleton loaders instead of spinners on lists, friendly empty states with a next action, toasts for success, inline errors for forms, dark mode that is designed (not inverted). All UI text in English, short and plain. Use `lucide-react` icons consistently.

## Do not

- Do not call any backend path that is not in the contract.
- Do not put business rules in components. Order and permission rules live in `config/` and selectors.
- Do not compute prices or totals for anything the server charges.
- Do not attach the Authorization header to the excluded URLs.

## Final report (keep it short)

List what was created, the exact commands I should run to start it, any contract gap you hit, and anything you were unsure about. Confirm that `npm run lint` and `npm run build` pass, and show their output summary.