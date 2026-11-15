/**
 * Integration Test Script for Phase 3: Evidence Upload & Inspector Route
 *
 * Usage:
 *   Ensure the server is running (or DATABASE_URL is configured in .env)
 *   Run: node test-phase3-integration.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

async function runIntegrationTest() {
  console.log('🚀 Starting Phase 3 End-to-End Integration Test against:', BASE_URL);

  try {
    // 1. Authenticate as INSPECTOR
    console.log('\n1. Logging in as INSPECTOR (inspector@police.gov.in)...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'inspector@police.gov.in',
        password: 'Inspector@123',
      }),
    });

    const loginData = await loginRes.json();
    if (!loginData.success) {
      throw new Error(`Inspector login failed: ${JSON.stringify(loginData)}`);
    }

    const inspectorToken = loginData.token;
    console.log('   ✅ Inspector logged in successfully. Token acquired.');

    // 2. Prepare Sample Forensic File Buffer
    const sampleContent = `[FORENSIC EVIDENCE DUMP]\nDate: 2026-11-13\nDevice: CCTV-GATE-04\nPayload: Suspect vehicle spotted at 21:04 hrs. License Plate: DL-04-AB-1234\nEntropy: ${crypto.randomBytes(16).toString('hex')}`;
    const fileBuffer = Buffer.from(sampleContent, 'utf-8');
    const expectedSHA256 = crypto.createHash('sha256').update(fileBuffer).digest('hex').toLowerCase();

    // 3. Create multipart/form-data payload
    console.log('\n2. Uploading Evidence to /api/evidence/upload...');
    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
    
    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="case_number"\r\n\r\nCASE-2026-CR-8812\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="title"\r\n\r\nCCTV Surveillance Gate 04\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="description"\r\n\r\nForensic dump of exit perimeter log.\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="cctv_log.txt"\r\n`;
    body += `Content-Type: text/plain\r\n\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(body, 'utf-8'),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8'),
    ]);

    const uploadRes = await fetch(`${BASE_URL}/evidence/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${inspectorToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });

    const uploadData = await uploadRes.json();
    console.log('   Response Status:', uploadRes.status);
    console.log('   Response Data:', uploadData);

    if (uploadRes.status !== 201 || !uploadData.success) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
    }

    console.log('   ✅ Evidence uploaded successfully. ID:', uploadData.evidence.id);
    console.log('   Server SHA-256:  ', uploadData.evidence.sha256_hash);
    console.log('   Expected SHA-256:', expectedSHA256);

    if (uploadData.evidence.sha256_hash === expectedSHA256) {
      console.log('   🔒 Cryptographic integrity check passed: Hashes match perfectly!');
    } else {
      throw new Error('Hash mismatch between client buffer and server record!');
    }

    // 4. Retrieve Inspector's "My Evidence"
    console.log('\n3. Retrieving Inspector My Evidence list from /api/evidence/my-evidence...');
    const listRes = await fetch(`${BASE_URL}/evidence/my-evidence`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${inspectorToken}`,
      },
    });

    const listData = await listRes.json();
    console.log('   Status:', listRes.status);
    console.log(`   Found ${listData.count} evidence item(s) for Inspector.`);

    const found = listData.evidence.find((e) => e.id === uploadData.evidence.id);
    if (found) {
      console.log('   ✅ Newly uploaded evidence successfully verified in Inspector list!');
    } else {
      throw new Error('Uploaded evidence was not found in Inspector list!');
    }

    // 5. RBAC Violation Test: Try uploading with Judge account
    console.log('\n4. Testing RBAC: Attempting evidence upload as JUDGE (judge@court.gov.in)...');
    const judgeLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'judge@court.gov.in',
        password: 'Judge@Bench2026',
      }),
    });
    const judgeData = await judgeLogin.json();
    const judgeToken = judgeData.token;

    const judgeUploadRes = await fetch(`${BASE_URL}/evidence/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${judgeToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });

    console.log('   Judge Upload Response Status:', judgeUploadRes.status);
    if (judgeUploadRes.status === 403) {
      console.log('   🛡️ RBAC Enforcement Confirmed: Judge blocked with 403 Forbidden!');
    } else {
      throw new Error(`Expected 403 Forbidden for Judge upload, got: ${judgeUploadRes.status}`);
    }

    console.log('\n🎉 ALL PHASE 3 INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('\n❌ Integration Test Error:', err.message);
  }
}

if (require.main === module) {
  runIntegrationTest();
}

