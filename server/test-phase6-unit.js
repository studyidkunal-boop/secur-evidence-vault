const crypto = require('crypto');
const sharp = require('sharp');
const { computeSHA256, constantTimeCompare } = require('./src/utils/crypto');
const { watermarkImage, watermarkText } = require('./src/utils/watermark');

async function runPhase6UnitTests() {
  console.log('🧪 Starting Phase 6 Verification & Judge Watermark Unit Tests...\n');
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

  // 1. Internal Stored File Verification Logic
  const originalFileContent = Buffer.from('Official CCTV Log - Entrance North 2026-11-14T06:00:00Z', 'utf-8');
  const sealedDbHash = computeSHA256(originalFileContent);

  // Untampered download
  const downloadedBuffer = Buffer.from(originalFileContent);
  const recomputedHash = computeSHA256(downloadedBuffer);
  const isMatch = constantTimeCompare(recomputedHash, sealedDbHash);
  assert(isMatch === true, 'Untampered file returns MATCH with identical SHA-256 hash');

  // Tampered download (Attacker flipped 1 character)
  const tamperedBuffer = Buffer.from('Official CCTV Log - Entrance North 2026-11-14T06:00:01Z', 'utf-8');
  const tamperedRecomputedHash = computeSHA256(tamperedBuffer);
  const isTamperedMatch = constantTimeCompare(tamperedRecomputedHash, sealedDbHash);
  assert(isTamperedMatch === false, 'Tampered file (1-sec timestamp modification) triggers TAMPERED detection');

  // 2. External Copy Verification Logic
  const judgeHeldCopy = Buffer.from(originalFileContent);
  const externalHash = computeSHA256(judgeHeldCopy);
  const isExternalMatch = constantTimeCompare(externalHash, sealedDbHash);
  assert(isExternalMatch === true, 'Judge external copy matches sealed vault record');

  const alteredExternalCopy = Buffer.from('Official CCTV Log - Altered by Defense', 'utf-8');
  const alteredExternalHash = computeSHA256(alteredExternalCopy);
  const isAlteredExternalMatch = constantTimeCompare(alteredExternalHash, sealedDbHash);
  assert(isAlteredExternalMatch === false, 'Altered external copy is detected and rejected');

  // 3. Text Watermarking
  const textBuffer = Buffer.from('Log Entry: Case 8841 verified.', 'utf-8');
  const watermarkedText = watermarkText(textBuffer, {
    userName: "Hon'ble Judge Rajeshwar Rao",
    badgeId: 'JUDGE-0071',
    timestamp: '2026-11-14T06:30:00.000Z',
    caseNumber: 'CASE-2026-CR-8841',
    sha256Hash: sealedDbHash,
  });

  const watermarkedString = watermarkedText.toString('utf-8');
  assert(watermarkedString.includes("Hon'ble Judge Rajeshwar Rao"), 'Text watermark embeds Judge name');
  assert(watermarkedString.includes('JUDGE-0071'), 'Text watermark embeds Judge badge ID');
  assert(watermarkedString.includes('CASE-2026-CR-8841'), 'Text watermark embeds case reference');
  assert(watermarkedString.includes(sealedDbHash), 'Text watermark embeds cryptographic SHA-256 sealed hash');
  assert(watermarkedString.includes('Log Entry: Case 8841 verified.'), 'Text watermark retains original payload');

  // 4. Image Dynamic Watermarking via Sharp
  const sampleImage = await sharp({
    create: {
      width: 600,
      height: 400,
      channels: 4,
      background: { r: 30, g: 41, b: 59, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const watermarkedImageBuffer = await watermarkImage(sampleImage, {
    userName: "Hon'ble Judge Rajeshwar Rao",
    badgeId: 'JUDGE-0071',
    timestamp: '2026-11-14T06:30:00.000Z',
    caseNumber: 'CASE-2026-CR-8841',
  });

  assert(Buffer.isBuffer(watermarkedImageBuffer), 'Image watermarking returns valid Buffer');
  assert(watermarkedImageBuffer.length > 0, 'Watermarked image buffer has valid length');

  const watermarkedMeta = await sharp(watermarkedImageBuffer).metadata();
  assert(watermarkedMeta.width === 600 && watermarkedMeta.height === 400, 'Watermarked image preserves exact original dimensions');

  console.log(`\n📊 Results: ${passed}/${total} tests passed.\n`);
  if (passed === total) {
    console.log('🎉 Phase 6 Verification & Judge Watermarking logic is 100% operational!');
  } else {
    process.exit(1);
  }
}

runPhase6UnitTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

