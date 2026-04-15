# CSFLE production setup

**Scope:** this doc covers the migration path from the dev configuration
shipped in `security/pentest-shannon-fixes` — a local 96-byte keyfile —
to a managed KMS for production. The dev setup is convenient but leaves
the master key on the filesystem of whoever runs the app, which is
unacceptable for a production deployment.

---

## 1. What's in the dev branch today

| File | Purpose |
|---|---|
| `nextjs/secrets/csfle-master.key` | 96 random bytes, Customer Master Key (CMK) material. **Gitignored.** |
| `nextjs/secrets/mongo_crypt_v1.dylib` | MongoDB `crypt_shared` library for macOS arm64. Used by the driver to do automatic query analysis without the old `mongocryptd` daemon. **Gitignored** (116 MB). |
| `nextjs/src/lib/db/csfle.ts` | Config, key loading, schema map builder |
| `nextjs/src/lib/db/mongoose.ts` | Wires `autoEncryption` into `mongoose.connect()` when `CSFLE_ENABLED=true` |
| `nextjs/scripts/csfle-setup.ts` | Creates key vault index + the PII DEK. Idempotent. |
| `nextjs/scripts/csfle-migrate.ts` | One-shot re-encryption of existing rows. Idempotent. |

**Encrypted fields:**

- `users.email`, `users.cf`, `users.partitaIva` — deterministic (queryable)
- `users.phone`, `users.birthday`, `users.birthplace`, `users.city`, `users.zipCode` — random (not queryable)
- `orders.shippingAddress.{fullName,address,postalCode,city,country}` — random

Everything else (products, reviews, seller cards, etc.) is plaintext on
purpose.

**Environment variables:**

- `CSFLE_ENABLED=true` — turn on autoEncryption at connect time
- `CSFLE_LOCAL_KEY_PATH` — override the default master key path
- `CSFLE_CRYPT_SHARED_PATH` — override the default crypt_shared dylib path

---

## 2. Threat model coverage

The CSFLE we installed defends against **disclosure of DB content**:

| Scenario | Plaintext DB | With CSFLE |
|---|---|---|
| Leaked backup or snapshot | Full PII exposed | Ciphertext only |
| Atlas / hosting insider with read creds | Full PII | Ciphertext |
| Query log leak | Queries show plaintext literals | Queries show ciphertext |
| Mongo exposed on public internet | Dumpable | Ciphertext |

It does **not** defend against:

- App compromise (the app holds the DEK → can decrypt)
- Memory dump of the Node process (same)
- Outbound emails containing PII (Mailtrap SMTP, etc.)

---

## 3. Why dev is not acceptable for prod

The dev configuration stores the master key on local disk. In prod this
means:

- Anyone with SSH/container shell can read the key
- Every copy of the server has a copy of the key → key rotation is
  O(servers) not O(1)
- Backup of the server disk includes the key

Production MUST use a managed KMS. MongoDB CSFLE supports:

- **AWS KMS** (recommended on AWS / Vercel)
- **GCP KMS**
- **Azure Key Vault**
- **KMIP** (for on-prem HSMs)

The rest of this doc walks the AWS KMS path since it is the most common
Vercel/Heroku pairing.

---

## 4. AWS KMS migration steps

### 4.1 Provision the CMK

In AWS KMS, create a **symmetric** Customer Master Key in the same
region as your production workload. Give it an alias like
`alias/pagine-azzurre-csfle`. Grant the production IAM role these
actions on the CMK:

- `kms:Encrypt`
- `kms:Decrypt`
- `kms:DescribeKey`

Do **not** grant `kms:GenerateDataKey*` unless you plan to create
DEKs from production (the setup script only runs during bootstrap).

### 4.2 Provide credentials to the app

The AWS KMS provider needs either:

- An IAM role attached to the compute (Vercel → Vercel OIDC → AWS STS
  AssumeRoleWithWebIdentity, not trivial on Vercel hobby plan), OR
- Long-lived IAM access keys via env vars

Add to the production environment:

```
AWS_REGION=eu-south-1                    # whatever region you chose
AWS_KMS_ACCESS_KEY_ID=AKIA...
AWS_KMS_SECRET_ACCESS_KEY=...
AWS_KMS_CMK_ARN=arn:aws:kms:eu-south-1:...:key/abcd-...
CSFLE_ENABLED=true
CSFLE_CRYPT_SHARED_PATH=/var/lib/mongo_crypt_v1.so   # see §4.4
```

**Never commit these.** `nextjs/.env.local` is gitignored in this repo;
follow the same discipline for the production provider's secret store
(Vercel Environment Variables, Heroku Config Vars, AWS Parameter Store,
etc.).

### 4.3 Update `src/lib/db/csfle.ts`

Add an AWS KMS branch to `buildCsfleContext()`:

```ts
export function buildCsfleContext(): CsfleContext {
  if (process.env.CSFLE_KMS_PROVIDER === 'aws') {
    return {
      keyVaultNamespace: KEY_VAULT_NAMESPACE,
      kmsProviders: {
        aws: {
          accessKeyId: process.env.AWS_KMS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_KMS_SECRET_ACCESS_KEY!,
        },
      },
      dekAltName: DEK_ALT_NAME,
    };
  }
  // dev default: local keyfile
  return { /* existing */ };
}
```

### 4.4 Install crypt_shared on the production host

The driver needs the `crypt_shared` library at runtime. On Linux x64:

```
curl -sSLo /tmp/mongo_crypt.tgz \
  "https://downloads.mongodb.com/linux/mongo_crypt_shared_v1-linux-x86_64-enterprise-<VERSION>.tgz"
tar -xzf /tmp/mongo_crypt.tgz -C /tmp/
cp /tmp/lib/mongo_crypt_v1.so /var/lib/mongo_crypt_v1.so
```

Then set `CSFLE_CRYPT_SHARED_PATH=/var/lib/mongo_crypt_v1.so`.

**Vercel:** the library is too big (~100 MB) to fit in a serverless
function bundle. Options:

- Deploy to Vercel's Node.js container runtime with a large ephemeral
  disk and fetch the dylib at cold start.
- Package the dylib in an EFS mount (AWS) or a separate container
  (Render / Fly / Railway).
- Or: **don't deploy the app layer on Vercel functions** — run the API
  routes on a regular Node.js host and keep only the static frontend
  on Vercel.

### 4.5 Create the production DEK

Run the setup script once against production Mongo with the AWS KMS
credentials loaded:

```
CSFLE_KMS_PROVIDER=aws \
AWS_KMS_CMK_ARN=arn:aws:kms:... \
MONGODB_URL="mongodb+srv://prod-..." \
npx tsx scripts/csfle-setup.ts
```

You will need to tweak `scripts/csfle-setup.ts` to pass the AWS master
key ARN to `createDataKey`. The current local-provider call is:

```ts
await clientEncryption.createDataKey('local', {
  keyAltNames: [ctx.dekAltName],
});
```

For AWS, add a `masterKey`:

```ts
await clientEncryption.createDataKey('aws', {
  masterKey: {
    region: process.env.AWS_REGION!,
    key: process.env.AWS_KMS_CMK_ARN!,
  },
  keyAltNames: [ctx.dekAltName],
});
```

### 4.6 Migrate production rows

Before flipping `CSFLE_ENABLED=true` in production, run the migration
with the production connection string:

```
CSFLE_ENABLED=true \
CSFLE_KMS_PROVIDER=aws \
AWS_KMS_ACCESS_KEY_ID=... \
AWS_KMS_SECRET_ACCESS_KEY=... \
AWS_KMS_CMK_ARN=... \
MONGODB_URL="mongodb+srv://prod-..." \
npx tsx scripts/csfle-migrate.ts
```

Then flip `CSFLE_ENABLED=true` in the Vercel/Heroku env and redeploy.

### 4.7 Post-migration verification

1. Raw query via `mongosh` shows ciphertext:

   ```js
   db.users.findOne({}, { email: 1, cf: 1, partitaIva: 1 })
   // => email, cf, partitaIva are all BinData(6, ...)
   ```

2. App signin still works (the equality query is transparently
   ciphered by the driver).

3. `GET /api/users/me/export` still returns readable plaintext for the
   owner.

---

## 5. Operational notes

### 5.1 Key rotation

There are two kinds of rotation:

- **DEK rotation** (rewrap every row with a new DEK): run `csfle-setup`
  with a new `keyAltName` (e.g. `pagine_azzurre_pii_dek_v2`), update
  `DEK_ALT_NAME` in code, run a migration that decrypts with the old
  DEK and re-encrypts with the new one. Both DEKs live in the key vault
  during the transition.

- **CMK rotation** (rewrap the DEK without touching data): use the
  `ClientEncryption.rewrapManyDataKey` API:

  ```ts
  await clientEncryption.rewrapManyDataKey(
    { keyAltNames: DEK_ALT_NAME },
    { provider: 'aws', masterKey: { region, key: NEW_CMK_ARN } }
  );
  ```

  This is O(1), doesn't touch PII data, and should be run any time
  AWS rotates the CMK.

### 5.2 Backup handling

Backups of the key vault collection must be treated with the same
sensitivity as DEK material. A backup of just the `users`/`orders`
collections is useless without the key vault + CMK, but once all three
are together the attacker has everything.

Recommendation: do not back up the key vault. Re-create the DEK via
`csfle-setup` during restore, then run `csfle-migrate` to re-encrypt
all rows under the new DEK. This means backups are safe to store in
cheaper tiers.

### 5.3 Forgetting to set `CSFLE_ENABLED`

If production ever runs with `CSFLE_ENABLED=false` after the migration,
the app will **write new rows in plaintext** while reading old rows via
`BinData(6)` and silently displaying gibberish for the PII columns.
Tests and CI should gate on the env var being set.

---

## 6. Open follow-ups (out of scope for this branch)

1. **Automatic rotation cron** for CMK rewrapping.
2. **Encrypted backups** of the key vault to a separate, cold storage
   bucket.
3. **Keymaster service** — a thin microservice that holds the KMS
   credentials so the app process never sees them directly.
4. **Encryption of `User.accountKey`** (currently AES-GCM via
   `src/lib/crypto/accountKey.ts`) migrated to CSFLE for consistency.
   Not urgent: the app-level cipher already gives ciphertext-at-rest,
   and moving it into CSFLE means the KMS has to accept 64-byte
   plaintext which doesn't fit the deterministic-queryable pattern.
