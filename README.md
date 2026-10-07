# Marketplace web (`marketplace-web`)

Web frontend for the Sri Lankan marketplace (prices in LKR). It talks only to the API gateway.
The backend contract is in [`docs/frontend-contract.md`](docs/frontend-contract.md) and is the source of truth.

Stack: Vite 7 + React 19 (SWC), Tailwind CSS 4, React Router 7, Redux Toolkit, Axios, lucide-react. JavaScript (JSX), no TypeScript.

## Requirements

- Node.js **20.19 or newer** (Vite 7 needs it). Check with `node -v`.
- The API gateway running on `http://localhost:8080` (or change `VITE_API_BASE_URL`).

## Run it on Ubuntu

```bash
# 1. Node 20.19+ (skip if `node -v` already shows 20.19+ or 22.x)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install dependencies
npm install

# 3. Environment (only needed once; .env.local is git-ignored)
cp .env.example .env.local
#    edit VITE_API_BASE_URL in .env.local if the gateway is not on localhost:8080

# 4. Start the dev server
npm run dev
# open http://localhost:5173
```

Other scripts:

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Dev server on port 5173 with hot reload       |
| `npm run lint`    | ESLint 9 (flat config)                        |
| `npm run build`   | Production build into `dist/`                 |
| `npm run preview` | Serves the production build on port 5173      |

## Run it in WebStorm

1. **File → Open** and pick this folder. WebStorm detects `package.json` and offers to run `npm install`; accept (or run it in the terminal).
2. **Settings → Languages & Frameworks → Node.js**: choose a Node interpreter 20.19+.
3. Create `.env.local` from `.env.example` (see above).
4. Open `package.json` and click the green ▶ next to `"dev"`, or add an **npm** run configuration with script `dev`.
5. **Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint**: choose *Automatic ESLint configuration* so lint errors show in the editor.
6. The `@/…` import alias (`@` = `src`) is defined in `vite.config.js`; WebStorm reads it from there.

## Port and CORS (important)

The gateway answers CORS only for `http://localhost:5173` and `http://localhost:3000`.
`vite.config.js` uses `port: 5173` with `strictPort: true`, so if 5173 is busy Vite **stops with an error** instead of
moving to 5174 (which would make every API call fail with a CORS error). Free the port (`lsof -i :5173`) and try again.

Requests never send cookies (`withCredentials: false`); authentication is a Bearer token.

## Simulated uploads

The backend has **no upload API**. Images, documents and attachments are just *storage keys* (strings like
`uploads/<uuid>/my-photo.jpg`). The file pickers in this app generate a valid key for each chosen file and send only the
key; the file itself never leaves the browser. The backend returns image URLs under `https://images.example.invalid/…`,
which never load, so every image uses a fallback tile (`SmartImage`). The UI says "Uploads are simulated" next to every
file picker.

## How the code is organised

```
src/
  api/              Axios client (auth header, refresh queue, error normalising) + one module per area
  app/              store, router, AppRoot (session restore, theme, cross-tab sync)
  config/           roles, permissions + route table, enums + badge colours, order rules, navigation, constants
  store/slices/     one Redux slice per resource (auth, ui, cart, categories, ...)
  store/factories/  createPagedResource: builds a slice for any paged list
  hooks/            usePermissions, useToast, useDebounce, useNow, useRetryAfter, ...
  components/ui/    UI kit (Button, Input, Modal, Table, Pagination, StatusBadge, FilePicker, ...)
  components/layout Public/Customer/Merchant/Admin/Auth layouts
  components/common ProtectedRoute, PermissionButton, StatusBanner, SmartImage, ...
  pages/            public, auth, customer, merchant, admin, shared (most are placeholders for now)
  utils/            jwt, format (LKR, Asia/Colombo dates), ids, storageKeys, validators
```

Rules we follow:

- Pages never call Axios or hard-code API paths; they call functions in `src/api/*` or Redux thunks.
- Business rules (who can do what, order states) live in `src/config/` and selectors, not in components.
- Money shown is always the server's number; the client never computes anything the server charges.
- Tokens are kept in `localStorage` under the `mp.` prefix (the backend only returns them in JSON). They are never logged,
  and `dangerouslySetInnerHTML` is banned by an ESLint rule.

## Production Content Security Policy (notes only)

Nothing below is applied in development (the Vite dev server needs inline scripts for hot reload).
For a production deployment, serve `dist/` with a CSP **response header** like:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'sha256-F3qJ+cASk2KUGPpcKZ/pmr+ObVQv+kQySYVipIjvLao=';
  style-src 'self';
  img-src 'self' data: blob: https://images.example.invalid;
  font-src 'self';
  connect-src 'self' https://<your-gateway-host>;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none'
```

- The `sha256-…` value allows only the small theme script in `index.html`. If you edit that script, recompute the hash:
  `node -e "const h=require('fs').readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];console.log(require('crypto').createHash('sha256').update(h).digest('base64'))"`
- `blob:` in `img-src` is needed for the local previews in file pickers.
- Prefer the HTTP header over a `<meta http-equiv>` tag (`frame-ancestors` does not work in a meta tag).
