# Injection False Positives Tracking

## INJ-VULN-01: Password Replacement NoSQL Injection

**Vulnerability ID**: INJ-VULN-01
**Endpoint**: POST /api/users/password-replacement
**File**: /Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/password-replacement/route.ts

### Why It's a False Positive

The analysis report identified this as a NoSQL injection vulnerability because user input from `req.body.id` is used directly in a MongoDB query without type validation:

```typescript
const { id, newData } = body;
const user = await UserModel.findOne({ recoveryPasswordId: id });
```

However, **line 31 contains a defensive check that prevents exploitation**:

```typescript
if (!user || user.recoveryPasswordId !== id) {
  return NextResponse.json(
    { message: 'Link di recupero non valido o scaduto' },
    { status: 404 }
  );
}
```

### Why the Defense Works

When an attacker sends `{"id": {"$ne": null}}`:
1. The MongoDB query `findOne({ recoveryPasswordId: {"$ne": null} })` executes successfully
2. It returns a user document where `recoveryPasswordId` is a string (e.g., "abc123...")
3. The strict comparison `user.recoveryPasswordId !== id` evaluates to `"abc123..." !== {"$ne": null}`
4. In JavaScript, `string !== object` is always `true`
5. The function returns 404 error before changing the password

### Exploitation Attempts

**Payload tested**:
```json
{
  "id": {"$ne": null},
  "newData": "HackerPassword123!"
}
```

**Result**:
```json
{
  "password_replacement": false,
  "loading": false,
  "message": "Password non sostituita"
}
```

**HTTP Status**: 500 (generic error, not 200 success)

### Conclusion

This is a **FALSE POSITIVE**. The vulnerability exists in the MongoDB query layer but is mitigated by application-level validation. The protection is **defensive but not intentional** - it's a byproduct of comparing the retrieved value against the input.

### Recommendation

While not exploitable, this code should be refactored to use explicit type validation:

```typescript
if (typeof id !== 'string') {
  return NextResponse.json({ message: 'Invalid input type' }, { status: 400 });
}
```

This would provide defense-in-depth and prevent future developers from accidentally removing the protective comparison.
