# QA local — branch `merge/security-and-seo-into-master`

Lista de problemas detectados y pendientes antes de pushear/desplegar a producción.

## Issues encontrados

### 1. Toggle ojo (mostrar/esconder password) no funciona en `/register`

- **Estado:** Lógica del componente OK ✅ — bug es environment-specific (browser).
- **Componente:** `src/components/ui/PasswordInput.tsx`
- **Diagnóstico hecho:**
  - HTML del SSR llega correcto (`type="password"`, `aria-pressed="false"`, button `type="button"`).
  - Todos los `<script>` Next.js tienen nonce — la CSP no está bloqueando.
  - Test unitario en `tests/components/PasswordInput.test.tsx` — **5/5 pasan**: toggle, aria, no submit del form.
  - Conclusión: el componente está bien programado.
- **Causas probables (browser-side):**
  1. **Password manager** (1Password, Bitwarden, Chrome built-in) puede estar interceptando el toggle.
  2. **Extension del browser** que bloquea cambios de `type` en inputs por seguridad.
  3. **Bug visual de un browser específico** (Safari tiene quirks).
- **Acciones de diagnóstico que tenés que hacer vos:**
  - [ ] Abrir DevTools → Console al hacer click en el ojo. ¿Errores?
  - [ ] Probar en **modo incógnito** (sin extensiones/managers).
  - [ ] Probar en otro browser (Chrome ↔ Firefox ↔ Safari).
  - [ ] DevTools → Elements → buscar el `<input>` y verificar manualmente si `type` cambia al hacer click. Si cambia pero el browser sigue mostrando dots → es el password manager.

### 2. Datos del pentest en MongoDB local — RESUELTO

- **Estado:** ✅ Re-seedeado.
- **Acción aplicada:** `scripts/seed.ts` arreglado (lee `MONGODB_URL` de env, limpia las 5 colecciones).
- **Pendiente:** commitear el fix al branch.

## Pre-deploy: cosas que faltan testear

### Auth flows (mucho cambió en security branch)
- [ ] `/signin` — login + lockout por email tras N intentos fallidos
- [ ] `/register` — registro + email de verificación (Ethereal en dev)
- [ ] `/verification/[id]` — auto-login post-verificación
- [ ] `/password-recovery` + `/password-recovery/[id]` — flujo recovery
- [ ] `/change-password/[token]` — cambio con token UUID validado
- [ ] Verificar que rate limiter (Mongo-backed) bloquea bien sin falsos positivos

### Authorization (security audit)
- [ ] `GET /api/users/[id]` sin sesión → 404 (no leak existencia)
- [ ] `GET /api/orders/[id]` ajeno → 404 (force seller filter)
- [ ] `GET /api/orders` lista sólo las del seller actual
- [ ] PII (email, phone) no aparece en respuestas públicas

### Search + listing
- [ ] `/search` — filtros city + group
- [ ] `/productlist`, `/productlist/seller`
- [ ] Index full-text funciona

### Product CRUD
- [ ] Crear anuncio en sección `offro` (con price)
- [ ] Crear anuncio en sección `cerco`/`propongo`/`avvisi`/`dono` (sin price — gateado)
- [ ] Editar — no se resetea el form mid-edit
- [ ] PurchaseCard se muestra correctamente

### Orders + on-chain
- [ ] Place order completo
- [ ] Pago on-chain (escrow)
- [ ] Deliver (release escrow al seller)
- [ ] `/orderlist` (buyer), `/orderlist/seller`, `/orderhistory`

### Newsletter + GDPR
- [ ] Subscribirse (PATCH toggle con switch UI)
- [ ] Unsubscribe via link en email (token)
- [ ] Right to erasure: `DELETE /api/users/me`
- [ ] Data portability: `GET /api/users/me/export`

### SEO (seo branch)
- [ ] `/sitemap.xml` — sin duplicados `?section=`
- [ ] `/robots.txt` — páginas privadas allowed (no disallow)
- [ ] `X-Robots-Tag: noindex, nofollow` solo en /profile, /cart, /checkout, etc. (verificar en Network DevTools)
- [ ] Redirect 308: `pagineazzurre.net/*` → `www.pagineazzurre.net/*`
- [ ] JSON-LD escapado en `/product/[id]`, `/seller/[id]`, `/tutti-noi`

### Headers de seguridad
- [ ] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- [ ] `Content-Security-Policy` con nonce único por request (NO `unsafe-inline` para scripts)
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`

### CSP — verificar que NO rompe la app
- [ ] React/Next.js scripts cargan (nonce inyectado por middleware)
- [ ] Wagmi/viem (web3) funciona
- [ ] PayPal/Google API embeds (si los usa)
- [ ] Storybook NO carga en prod (debería)
- [ ] Console del browser sin "Refused to execute inline script"

### Email (Mailtrap en prod / Ethereal en dev)
- [ ] Email de verificación llega
- [ ] Email de recovery llega
- [ ] Email de unsubscribe footer link funciona
- [ ] Templates con styling moderno se ven bien

### Uploads
- [ ] S3 upload funciona, devuelve URL region-aware
- [ ] No se setea ACL (security fix)

## Code-level cleanups recomendados (no bloqueantes)

- [ ] **Renombrar `nextjs/src/middleware.ts` → `proxy.ts`** (Next.js 16 deprecó la convención).
- [ ] **Borrar uno de los lockfiles**: hay `package-lock.json` en raíz y en `nextjs/`. El de raíz probablemente es obsoleto.
- [ ] **Actualizar `package.json` engines**: dice `"node": "20.x"`, conviene `">=20"` o `"20.x || 22.x"` (estás corriendo 22).
- [ ] **`apple-touch-icon.png`** ausente — agregar a `nextjs/public/` para silenciar 404s de iOS.

## Producción — variables de entorno en Vercel

Verificar en https://vercel.com/chococoins-projects/nextjs/settings/environment-variables:

- [ ] `MONGODB_URL` (Atlas, NO el local pentest)
- [ ] `NEXTAUTH_SECRET` (rotar si fue commiteado)
- [ ] `NEXTAUTH_URL` (https://www.pagineazzurre.net)
- [ ] `MAILTRAP_API_KEY` + `MAILTRAP_FROM`
- [ ] `EMAIL_PROVIDER=mailtrap` (o el que uses en prod)
- [ ] `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=eu-west-1`, `S3_BUCKET=pagineazzurre2`
- [ ] Blockchain: `RPC_URL` (https://pagine-azzurre-blockchain.fly.dev), `CONTRACT_ADDRESS`, `OWNER_PRIVATE_KEY`, `OWNER_ADDRESS`
- [ ] CSFLE: en prod NO se usa keyfile local — configurar AWS/GCP/Azure KMS según `docs/csfle-production-setup.md`.

## Seguridad — acciones críticas

### 🚨 Llaves de validador expuestas en remoto

`nextjs/blockchain-besu/keys/validator{,1,2,3,4}/key` están en la historia de:
- `origin/security/pentest-shannon-fixes`
- `origin/seo/deploy-indexing-fixes`

Aunque las saqué del merge a master, ya están publicadas. Acciones:

1. **Generar 4 nuevas llaves de validator** (Hyperledger Besu).
2. **Redesplegar Besu en Fly.io** (`pagine-azzurre-blockchain.fly.dev`) con las llaves nuevas.
3. **Actualizar `genesis.json` y `static-nodes.json`** con las direcciones nuevas (los enodes cambian).
4. **(Opcional)** Reescribir history de las branches con `git filter-repo` para eliminar las keys, o simplemente borrar las branches después del merge a master.

### Rotar otros secretos potencialmente expuestos

Si el `.env.local` o algún `.env` se commiteó alguna vez, rotar:
- `NEXTAUTH_SECRET`
- Mongo password de Atlas
- AWS access keys
- `OWNER_PRIVATE_KEY` del contrato

Ver `git log -p --all -- '*.env*'` para chequear historia.
