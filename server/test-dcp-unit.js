const { z } = require('zod');
const { authorize } = require('./src/middleware/auth.middleware');
const { computeAuditEntryHash, GENESIS_HASH } = require('./src/utils/crypto');

// Replicate Zod schema from controller for isolated testing
const reviewEvidenceSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: "Status must be either 'APPROVED' or 'REJECTED'." }),
  }),
  remarks: z
    .string()
    .min(5, 'Review remarks must be at least 5 characters long for forensic accountability.')
    .max(1000, 'Review remarks cannot exceed 1000 characters.')
    .trim(),
});

function runDCPUnitTests() {
  console.log('🧪 Starting Phase 5 DCP Workflow Unit Tests...\n');
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

  // 1. Zod Validation Tests for DCP Review Decisions
  const validApproval = reviewEvidenceSchema.safeParse({
    status: 'APPROVED',
    remarks: 'Forensic hashes verified against physical hash registry. Admissible in court.',
  });
  assert(validApproval.success === true, 'Valid approval payload with remarks passes validation');

  const validRejection = reviewEvidenceSchema.safeParse({
    status: 'REJECTED',
    remarks: 'Missing Chain of Custody form Annexure-B. Resubmission required.',
  });
  assert(validRejection.success === true, 'Valid rejection payload with remarks passes validation');

  const invalidStatus = reviewEvidenceSchema.safeParse({
    status: 'PENDING',
    remarks: 'Trying to set pending',
  });
  assert(invalidStatus.success === false, 'Cannot manually reset status to PENDING via review');

  const arbitraryStatus = reviewEvidenceSchema.safeParse({
    status: 'DELETED',
    remarks: 'Attempting invalid status transition',
  });
  assert(arbitraryStatus.success === false, 'Arbitrary status transition (e.g. DELETED) is rejected');

  const tooShortRemarks = reviewEvidenceSchema.safeParse({
    status: 'APPROVED',
    remarks: 'ok',
  });
  assert(tooShortRemarks.success === false, 'Remarks shorter than 5 characters are rejected');

  // 2. RBAC Middleware Enforcement Tests
  const dcpAuthMiddleware = authorize(['DCP']);

  // Test 2a: INSPECTOR Role blocked
  let inspectorBlocked = false;
  let inspectorStatusCode = null;
  const mockInspectorReq = {
    user: { id: 'u-insp-01', role: 'INSPECTOR', badge_id: 'INSP-8492' },
    originalUrl: '/api/evidence/test-id/review',
    method: 'PATCH',
  };
  const mockInspectorRes = {
    status: (code) => {
      inspectorStatusCode = code;
      return {
        json: (data) => {
          inspectorBlocked = true;
        },
      };
    },
  };
  dcpAuthMiddleware(mockInspectorReq, mockInspectorRes, () => {});
  assert(inspectorBlocked && inspectorStatusCode === 403, 'Inspector is strictly blocked with 403 Forbidden from DCP review');

  // Test 2b: JUDGE Role blocked
  let judgeBlocked = false;
  let judgeStatusCode = null;
  const mockJudgeReq = {
    user: { id: 'u-judge-01', role: 'JUDGE', badge_id: 'JUDGE-0071' },
    originalUrl: '/api/evidence/test-id/review',
    method: 'PATCH',
  };
  const mockJudgeRes = {
    status: (code) => {
      judgeStatusCode = code;
      return {
        json: (data) => {
          judgeBlocked = true;
        },
      };
    },
  };
  dcpAuthMiddleware(mockJudgeReq, mockJudgeRes, () => {});
  assert(judgeBlocked && judgeStatusCode === 403, 'Judge is strictly blocked with 403 Forbidden from DCP review');

  // Test 2c: DCP Role permitted
  let dcpAllowed = false;
  const mockDcpReq = {
    user: { id: 'u-dcp-01', role: 'DCP', badge_id: 'DCP-1029' },
    originalUrl: '/api/evidence/test-id/review',
    method: 'PATCH',
  };
  const mockDcpRes = {};
  dcpAuthMiddleware(mockDcpReq, mockDcpRes, () => {
    dcpAllowed = true;
  });
  assert(dcpAllowed === true, 'DCP role is granted access through authorization middleware');

  // 3. Cryptographic Audit Entry Generation for DCP Decision
  const dcpAuditHash = computeAuditEntryHash({
    prevHash: GENESIS_HASH,
    timestamp: '2026-11-14T06:00:00.000Z',
    userId: 'u-dcp-01',
    action: 'EVIDENCE_APPROVED',
    evidenceId: 'e-evidence-99',
    metadata: {
      action_type: 'DCP_REVIEW',
      previous_status: 'PENDING',
      new_status: 'APPROVED',
      remarks: 'Verified CCTV timestamp matches gate log.',
      reviewer_badge: 'DCP-1029',
    },
  });
  assert(typeof dcpAuditHash === 'string' && dcpAuditHash.length === 64, 'DCP review generates a valid 64-character SHA-256 audit entry hash');

  console.log(`\n📊 Results: ${passed}/${total} DCP tests passed.\n`);
  if (passed === total) {
    console.log('🎉 Phase 5 DCP review workflow & RBAC security checks are operating properly!');
  } else {
    process.exit(1);
  }
}

runDCPUnitTests();

