#!/bin/bash
set -e

# Reinstall dependencies after a merge.
npm install

# NOTE: we deliberately do NOT run `drizzle-kit push` here. A forced schema push on
# every merge can silently DROP production columns when the merged code's schema is
# momentarily behind the live database (e.g. an old checkpoint), destroying data.
# Apply schema changes deliberately and interactively instead:  npm run db:push
echo "[post-merge] Dependencies installed. Skipping automatic db:push (run 'npm run db:push' manually if the schema changed)."
