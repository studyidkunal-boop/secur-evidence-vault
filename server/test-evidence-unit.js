const crypto = require('crypto');
const { computeSHA256, constantTimeCompare } = require('./src/utils/crypto');
const storageService = require('./src/services/storage.service');
const { ALLOWED_MIME_TYPES } = require('./src/middleware/upload.middleware');

async function runUnitTests() {
  console.log('🧪 Starting Phase 3 Cryptographic and Upload Unit Tests...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // 1. SHA-256 Test Vector Check
  const testBuffer = Buffer.from('Forensic Evidence Log Buffer 2026', 'utf-8');
  const expectedHash = crypto.createHash('sha256').update(testBuffer).digest('hex').toLowerCase();
  const computed = computeSHA256(testBuffer);
  assert(computed === expectedHash, 'computeSHA256 returns exact NIST SHA-256 digest');
  assert(constantTimeCompare(computed, expectedHash), 'constantTimeCompare validates identical hashes safely');
  assert(!constantTimeCompare(computed, 'wrong_hash_string'), 'constantTimeCompare rejects tampered hash safely');

  // 2. MIME Whitelist Filtering Check
  assert(ALLOWED_MIME_TYPES.has('application/pdf'), 'PDF is allowed in evidence upload whitelist');
  assert(ALLOWED_MIME_TYPES.has('image/png'), 'PNG is allowed in evidence upload whitelist');
  assert(ALLOWED_MIME_TYPES.has('video/mp4'), 'MP4 is allowed in evidence upload whitelist');
  assert(!ALLOWED_MIME_TYPES.has('application/x-msdownload'), 'Windows executable (.exe) is rejected');
  assert(!ALLOWED_MIME_TYPES.has('application/javascript'), 'Raw JS scripts are rejected');

  // 3. Storage Service Ingestion & Retrieval Check
  const mockStoragePath = 'evidence/CASE-TEST-01/test-file.pdf';
  const uploadRes = await storageService.uploadFile(testBuffer, mockStoragePath, 'application/pdf');
  assert(uploadRes.storagePath === mockStoragePath, 'Storage service returns correct storage path');

  const downloadedBuffer = await storageService.downloadFile(mockStoragePath);
  assert(downloadedBuffer.equals(testBuffer), 'Storage service retrieves identical byte buffer');

  // 4. Download Re-hashing Verification
  const recomputedHash = computeSHA256(downloadedBuffer);
  assert(constantTimeCompare(computed, recomputedHash), 'Re-downloaded buffer hash matches original upload hash');

  console.log(`\n📊 Results: ${passed}/${total} tests passed.\n`);
  if (passed === total) {
    console.log('🎉 Phase 3 cryptographic and storage components are operating properly!');
  } else {
    process.exit(1);
  }
}

runUnitTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

