export function GoldBarIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gold bar (lingot d'or) - inspired by TradingView's XAU/USD icon */}
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#FCD34D', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#F59E0B', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#D97706', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* Main bar body */}
      <rect x="3" y="6" width="18" height="12" rx="1" fill="url(#goldGradient)" stroke="#B45309" strokeWidth="0.5" />
      
      {/* Top highlight */}
      <rect x="3" y="6" width="18" height="2" rx="1" fill="#FEF3C7" opacity="0.8" />
      
      {/* Left edge detail */}
      <line x1="4" y1="7" x2="4" y2="17" stroke="#92400E" strokeWidth="0.5" opacity="0.5" />
      
      {/* Right edge detail */}
      <line x1="20" y1="7" x2="20" y2="17" stroke="#78350F" strokeWidth="0.5" opacity="0.5" />
      
      {/* Center line for dimension */}
      <line x1="6" y1="12" x2="18" y2="12" stroke="#DC2626" strokeWidth="0.5" opacity="0.3" />
    </svg>
  )
}
