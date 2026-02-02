# gaj-dash

A personal relationship management (PRM) platform for intentional networking and job application tracking.

## Local Development

```bash
npm install
npm run dev
```

### Required Environment Variables

Create a `.env.local` file:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |
| `npm run verify` | Preflight env check + build |

## Deploying to Netlify

1. Connect the repo to Netlify (via Git or `netlify-cli`).
2. Set the following environment variables in Netlify's site settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Build settings are configured via `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - SPA routing is handled by a catch-all redirect to `/index.html`.
