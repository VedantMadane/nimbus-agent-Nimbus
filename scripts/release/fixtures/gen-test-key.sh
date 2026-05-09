#!/usr/bin/env bash
# Generates a scratch GPG keyring + test key at $1 (target dir).
# Used by nimbus-verify.test.ts; also callable manually for debugging.
set -euo pipefail

TARGET="${1:?usage: $0 <target-dir>}"
mkdir -p "$TARGET"
chmod 700 "$TARGET"

export GNUPGHOME="$TARGET"

# Mirror production GPG hygiene from docs/release/v0.1.0-prerequisites.md §1.2:
# certify-only master + sign subkey. gpg --detach-sign auto-picks the subkey,
# so this fixture exercises the same VALIDSIG primary/subkey distinction the
# release pipeline produces. A flat single-key fixture passes the verify script
# trivially and hides the master-vs-subkey trust comparison bug.
cat > "$TARGET/gen-key.batch" <<EOF
%no-protection
Key-Type: EDDSA
Key-Curve: ed25519
Key-Usage: cert
Subkey-Type: EDDSA
Subkey-Curve: ed25519
Subkey-Usage: sign
Name-Real: Nimbus Test Signing
Name-Email: test@nimbus.local
Expire-Date: 1y
%commit
EOF

gpg --batch --generate-key "$TARGET/gen-key.batch" 2>/dev/null
rm -f "$TARGET/gen-key.batch"

# Print the PRIMARY (master) fingerprint — caller adds it to TRUSTED_FINGERPRINTS.
# `--list-keys --with-colons` emits the primary fpr first, before any subkey fprs.
gpg --list-keys --with-colons | awk -F: '/^fpr:/ { print $10; exit }'
