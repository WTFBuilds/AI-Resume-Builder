#!/bin/bash
# Cloudinary driver smoke test — runs as the airesume service user.
set -a
source /opt/airesume/.env
set +a
cd /opt/airesume
pnpm --filter @airesume/worker exec tsx -e "
import { getStorage, storageKind } from '@airesume/storage';
(async () => {
  const s = getStorage();
  console.log('driver:', storageKind());
  await s.put('exports/smoke-test.pdf', Buffer.from('%PDF-1.4 airesume smoke test'), 'application/pdf');
  console.log('upload: ok');
  const url = await s.downloadUrl('exports/smoke-test.pdf');
  console.log('signed url:', url.slice(0, 110));
  const buf = await s.get('exports/smoke-test.pdf');
  console.log('read-back:', buf.length, 'bytes');
  await s.delete('exports/smoke-test.pdf');
  console.log('delete: ok — Cloudinary driver verified end to end');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
"
