const sharp = require('sharp');

/**
 * Apply a visible, dynamic text watermark to an image buffer
 * 
 * @param {Buffer} imageBuffer 
 * @param {Object} options
 * @param {string} options.userName
 * @param {string} options.badgeId
 * @param {string} options.timestamp
 * @param {string} options.caseNumber
 * @returns {Promise<Buffer>} Watermarked image buffer
 */
async function watermarkImage(imageBuffer, { userName, badgeId, timestamp, caseNumber }) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    const watermarkText = `CONFIDENTIAL JUDICIAL EXHIBIT • ${escapeXml(userName)} (${escapeXml(badgeId)}) • ${escapeXml(timestamp)} • CASE: ${escapeXml(caseNumber)}`;
    const bannerHeight = Math.max(32, Math.floor(height / 16));
    const bannerFontSize = Math.max(11, Math.floor(width / 45));
    const diagonalFontSize = Math.max(20, Math.floor(width / 22));

    const svgOverlay = `
      <svg width="${width}" height="${height}">
        <style>
          .banner { fill: rgba(15, 23, 42, 0.85); }
          .banner-text { fill: #f8fafc; font-family: monospace, Arial, sans-serif; font-size: ${bannerFontSize}px; font-weight: bold; }
          .diagonal-text { fill: rgba(220, 38, 38, 0.35); font-family: Arial, sans-serif; font-size: ${diagonalFontSize}px; font-weight: 900; letter-spacing: 2px; }
        </style>
        <!-- Top Institutional Banner -->
        <rect x="0" y="0" width="${width}" height="${bannerHeight}" class="banner" />
        <text x="16" y="${Math.floor(bannerHeight * 0.65)}" class="banner-text">${watermarkText}</text>
        
        <!-- Bottom Warning Banner -->
        <rect x="0" y="${height - bannerHeight}" width="${width}" height="${bannerHeight}" class="banner" />
        <text x="16" y="${height - Math.floor(bannerHeight * 0.35)}" class="banner-text">DIGITAL EVIDENCE VAULT • VIEW-ONLY STREAM • RE-DISTRIBUTION PROHIBITED BY LAW</text>

        <!-- Center Watermark Stamp -->
        <g transform="translate(${Math.floor(width / 2)}, ${Math.floor(height / 2)}) rotate(-30)">
          <text text-anchor="middle" y="0" class="diagonal-text">${escapeXml(userName)} (${escapeXml(badgeId)})</text>
          <text text-anchor="middle" y="${diagonalFontSize * 1.3}" class="diagonal-text">COURT EXHIBIT • VIEW ONLY</text>
        </g>
      </svg>
    `;

    return await sharp(imageBuffer)
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .toBuffer();
  } catch (err) {
    console.error('[Watermark Error]: Failed to overlay image watermark, falling back to original buffer:', err.message);
    return imageBuffer;
  }
}

/**
 * Apply a tamper-evident visual text banner to text/code/document files
 */
function watermarkText(textBuffer, { userName, badgeId, timestamp, caseNumber, sha256Hash }) {
  const banner = [
    '/*******************************************************************************',
    ' * CONFIDENTIAL JUDICIAL EXHIBIT - DIGITAL EVIDENCE VAULT',
    ` * ACCESSING AUTHORITY : ${userName} (${badgeId})`,
    ` * ACCESS TIMESTAMP   : ${timestamp}`,
    ` * CASE REFERENCE     : ${caseNumber}`,
    ` * EVIDENCE SHA-256   : ${sha256Hash}`,
    ' * WARNING            : VIEW-ONLY STREAM. SCREENSHOTS & DUPLICATION PROHIBITED.',
    ' *******************************************************************************/\n\n',
  ].join('\n');

  return Buffer.concat([Buffer.from(banner, 'utf-8'), textBuffer]);
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
}

module.exports = {
  watermarkImage,
  watermarkText,
};

