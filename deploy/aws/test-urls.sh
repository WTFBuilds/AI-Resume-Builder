#!/bin/bash
set -a
source /opt/airesume/.env
set +a
cd /opt/airesume
pnpm --filter @airesume/worker exec tsx -e "
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
(async () => {
  const u1 = cloudinary.utils.private_download_url('exports/smoke-test.pdf', 'pdf', { resource_type: 'raw', expires_at: Math.floor(Date.now()/1000)+600 });
  const u2 = cloudinary.utils.private_download_url('exports/smoke-test.pdf', 'pdf', { resource_type: 'raw', type: 'authenticated', expires_at: Math.floor(Date.now()/1000)+600 });
  console.log('default-url:', u1);
  console.log('typed-url:', u2);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
"
