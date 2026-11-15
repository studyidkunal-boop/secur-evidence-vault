const { GENESIS_HASH, computeAuditEntryHash, constantTimeCompare } = require('./src/utils/crypto');
const { verifyAuditLogChain } = require('./src/services/audit.service');

function runAuditUnitTests() {
  console.log('🧪 Starting Phase 4 Cryptographic Audit Log Unit Tests...\n');
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

  // 1. Build a synthetic valid 4-block chain
  const chain = [];

  // Block 1: Genesis Block
  const b1Timestamp = '2026-11-13T10:00:00.000Z';
  const b1Metadata = { event: 'GENESIS_INIT', version: '1.0.0' };
  const b1EntryHash = computeAuditEntryHash({
    prevHash: GENESIS_HASH,
    timestamp: b1Timestamp,
    userId: null,
    action: 'SYSTEM_GENESIS',
    evidenceId: null,
    metadata: b1Metadata,
  });

  chain.push({
    id: 1,
    timestamp: b1Timestamp,
    user_id: null,
    role: 'SYSTEM',
    action: 'SYSTEM_GENESIS',
    evidence_id: null,
    metadata: b1Metadata,
    prev_hash: GENESIS_HASH,
    entry_hash: b1EntryHash,
  });

  // Block 2: Inspector Login
  const b2Timestamp = '2026-11-13T10:05:00.000Z';
  const b2Metadata = { email: 'inspector@police.gov.in', badge: 'INSP-8492' };
  const b2EntryHash = computeAuditEntryHash({
    prevHash: b1EntryHash,
    timestamp: b2Timestamp,
    userId: 'u-inspector-1',
    action: 'LOGIN_SUCCESS',
    evidenceId: null,
    metadata: b2Metadata,
  });

  chain.push({
    id: 2,
    timestamp: b2Timestamp,
    user_id: 'u-inspector-1',
    role: 'INSPECTOR',
    action: 'LOGIN_SUCCESS',
    evidence_id: null,
    metadata: b2Metadata,
    prev_hash: b1EntryHash,
    entry_hash: b2EntryHash,
  });

  // Block 3: Evidence Upload
  const b3Timestamp = '2026-11-13T10:10:00.000Z';
  const b3Metadata = {
    case_number: 'CASE-2026-CR-01',
    sha256_hash: '3f518e2463e26...64hex',
    file_name: 'cctv_footage.mp4',
  };
  const b3EntryHash = computeAuditEntryHash({
    prevHash: b2EntryHash,
    timestamp: b3Timestamp,
    userId: 'u-inspector-1',
    action: 'EVIDENCE_UPLOAD',
    evidenceId: 'e-evidence-01',
    metadata: b3Metadata,
  });

  chain.push({
    id: 3,
    timestamp: b3Timestamp,
    user_id: 'u-inspector-1',
    role: 'INSPECTOR',
    action: 'EVIDENCE_UPLOAD',
    evidence_id: 'e-evidence-01',
    metadata: b3Metadata,
    prev_hash: b2EntryHash,
    entry_hash: b3EntryHash,
  });

  // Block 4: Inspector Logout
  const b4Timestamp = '2026-11-13T10:15:00.000Z';
  const b4Metadata = { reason: 'session_timeout' };
  const b4EntryHash = computeAuditEntryHash({
    prevHash: b3EntryHash,
    timestamp: b4Timestamp,
    userId: 'u-inspector-1',
    action: 'LOGOUT',
    evidenceId: null,
    metadata: b4Metadata,
  });

  chain.push({
    id: 4,
    timestamp: b4Timestamp,
    user_id: 'u-inspector-1',
    role: 'INSPECTOR',
    action: 'LOGOUT',
    evidence_id: null,
    metadata: b4Metadata,
    prev_hash: b3EntryHash,
    entry_hash: b4EntryHash,
  });

  // Test 1: Validate Untampered Chain
  const validResult = verifyAuditLogChain(chain);
  assert(validResult.verified === true, 'Untampered 4-block audit chain validates 100% successfully');
  assert(validResult.totalChecked === 4, 'All 4 audit blocks verified');
  assert(validResult.latestEntryHash === b4EntryHash, 'Latest entry hash matches final block');

  // Test 2: Tamper Detection (Modify payload in Block 3 without updating hash)
  const payloadTamperedChain = JSON.parse(JSON.stringify(chain));
  payloadTamperedChain[2].metadata.case_number = 'CASE-TAMPERED-MALICIOUS';
  const tamperResult1 = verifyAuditLogChain(payloadTamperedChain);
  assert(tamperResult1.verified === false, 'Tampered metadata is caught immediately');
  assert(tamperResult1.brokenAtId === 3, 'Verifier accurately identifies block ID 3 as altered');

  // Test 3: Tamper Detection (Modify hash linkage in Block 3)
  const linkTamperedChain = JSON.parse(JSON.stringify(chain));
  linkTamperedChain[2].prev_hash = '1'.repeat(64);
  const tamperResult2 = verifyAuditLogChain(linkTamperedChain);
  assert(tamperResult2.verified === false, 'Broken prev_hash link is caught immediately');
  assert(tamperResult2.brokenAtId === 3, 'Verifier accurately identifies block ID 3 link break');

  // Test 4: Tamper Detection (Silent Deletion: Attacker deletes Block 2 to hide login)
  const deletedChain = [chain[0], chain[2], chain[3]]; // Block 2 removed
  const tamperResult3 = verifyAuditLogChain(deletedChain);
  assert(tamperResult3.verified === false, 'Silent row deletion is detected immediately');
  assert(tamperResult3.brokenAtId === 3, 'Chain detects mismatch between Block 1 hash and Block 3 prev_hash');

  console.log(`\n📊 Results: ${passed}/${total} audit tests passed.\n`);
  if (passed === total) {
    console.log('🎉 Cryptographic Audit Chaining & Verification is fully operational!');
  } else {
    process.exit(1);
  }
}

runAuditUnitTests();

