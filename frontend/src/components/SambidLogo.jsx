export default function SambidLogo({ size = 32, className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size} className={className}>
      <defs>
        <linearGradient id="sambid-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#sambid-bg)"/>
      <path d="M16 5.5c-3.8 0-6.5 2.8-6.5 6.5v4.5L7.5 19v1.5h17V19l-2-2.5V12c0-3.7-2.7-6.5-6.5-6.5z" fill="white" opacity="0.95"/>
      <ellipse cx="16" cy="22.5" rx="2" ry="1.5" fill="white" opacity="0.95"/>
      <rect x="12.5" y="9.5" width="7" height="8.5" rx="1" fill="url(#sambid-bg)" opacity="0.9"/>
      <line x1="14" y1="11.5" x2="18" y2="11.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
      <line x1="14" y1="13.2" x2="18" y2="13.2" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
      <path d="M14 15.5l1.3 1.3 2.7-2.7" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21.5 7.5a4.5 4.5 0 011.5 3" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity="0.8"/>
      <path d="M23 5.5a7.5 7.5 0 012 4.5" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}
