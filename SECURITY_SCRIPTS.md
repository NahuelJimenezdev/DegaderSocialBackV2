# ⚠️ SECURITY - Admin Scripts

## Scripts Folder Security

The `scripts/` and `src/scripts/` folders contain **SENSITIVE ADMINISTRATIVE SCRIPTS**.

These folders are **EXCLUDED from Git** via `.gitignore` for security reasons.

## What's in these folders?

- `seedFounder.js` - Creates Founder users (highest privilege)
- Other admin utilities

## ⚠️ CRITICAL SECURITY WARNINGS

1. **NEVER commit these folders to Git**
2. **NEVER share these scripts publicly**  
3. **ONLY run on secure local/production servers**
4. **KEEP BACKUPS in a secure location outside the repository**

## How to use (for authorized admins only)

```bash
# Create a Founder user
node scripts/seedFounder.js <email>
```

## Security Measures

✅ Folders added to `.gitignore`
✅ Duplicate scripts removed
✅ Only essential scripts kept

## Backup Location Recommendation

Store a secure backup of these scripts in:
- Encrypted external drive
- Secure cloud storage (private, encrypted)
- Password-protected archive

**DO NOT** rely solely on the project folder for these critical scripts.

---

For more details, see the README inside the scripts folder (local only, not in Git).
