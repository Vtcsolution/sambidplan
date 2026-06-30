const sharp = require('sharp');
const path = require('path');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="50%" stop-color="#4338ca"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="iconGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- decorative rings -->
  <circle cx="980" cy="300" r="180" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
  <circle cx="980" cy="300" r="240" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="1.5"/>
  <circle cx="980" cy="300" r="300" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>

  <!-- logo icon card -->
  <rect x="90" y="170" width="176" height="176" rx="38" fill="white" opacity="0.97"/>
  <g transform="translate(90,170) scale(5.5)">
    <path d="M16 5.5c-3.8 0-6.5 2.8-6.5 6.5v4.5L7.5 19v1.5h17V19l-2-2.5V12c0-3.7-2.7-6.5-6.5-6.5z" fill="url(#iconGrad)"/>
    <ellipse cx="16" cy="22.5" rx="2" ry="1.5" fill="url(#iconGrad)"/>
    <rect x="12.5" y="9.5" width="7" height="8.5" rx="1" fill="white"/>
    <line x1="14" y1="11.5" x2="18" y2="11.5" stroke="url(#iconGrad)" stroke-width="0.8" stroke-linecap="round"/>
    <line x1="14" y1="13.2" x2="18" y2="13.2" stroke="url(#iconGrad)" stroke-width="0.8" stroke-linecap="round"/>
    <path d="M14 15.5l1.3 1.3 2.7-2.7" fill="none" stroke="url(#iconGrad)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21.5 7.5a4.5 4.5 0 011.5 3" fill="none" stroke="url(#iconGrad)" stroke-width="1.3" stroke-linecap="round" opacity="0.8"/>
    <path d="M23 5.5a7.5 7.5 0 012 4.5" fill="none" stroke="url(#iconGrad)" stroke-width="1.3" stroke-linecap="round" opacity="0.5"/>
  </g>

  <!-- wordmark -->
  <text x="90" y="430" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="92" fill="white" letter-spacing="-2">Sambid</text>
  <text x="93" y="468" font-family="Arial, Helvetica, sans-serif" font-weight="500" font-size="26" fill="#c7d2fe" letter-spacing="6">N O T I F Y</text>

  <!-- tagline -->
  <text x="90" y="525" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="30" fill="white">Never Miss a Federal Contract Again</text>
  <text x="90" y="565" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="22" fill="#c7d2fe">AI-matched SAM.gov opportunities, delivered daily</text>
</svg>
`;

const outPath = path.join(__dirname, '..', 'public', 'og-image.png');
sharp(Buffer.from(svg))
  .png()
  .toFile(outPath)
  .then(info => console.log('Created og-image.png:', info.size, 'bytes at', outPath))
  .catch(err => { console.error('Error:', err.message); process.exit(1); });
