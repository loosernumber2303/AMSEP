interface TortoiseMascotProps {
  className?: string;
  isMoving?: boolean;
}

export default function TortoiseMascot({ className = 'w-10 h-10', isMoving = false }: TortoiseMascotProps) {
  return (
    <div className={`relative flex items-center justify-center transition-all ${className} ${isMoving ? 'animate-bounce' : ''}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-green-accent drop-shadow-[0_2px_8px_rgba(16,185,129,0.2)]"
        style={{ transform: 'rotate(90deg)' }}
      >
        {/* Style tag for custom flipper animations */}
        <style>
          {`
            @keyframes swimFront {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(15deg); }
            }
            @keyframes swimBack {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(-10deg); }
            }
            .front-flipper-l {
              transform-origin: 22px 34px;
              animation: ${isMoving ? 'swimFront 1s ease-in-out infinite' : 'none'};
            }
            .front-flipper-r {
              transform-origin: 42px 34px;
              animation: ${isMoving ? 'swimFront 1s ease-in-out infinite alternate' : 'none'};
            }
            .back-flipper-l {
              transform-origin: 24px 44px;
              animation: ${isMoving ? 'swimBack 1.2s ease-in-out infinite' : 'none'};
            }
            .back-flipper-r {
              transform-origin: 40px 44px;
              animation: ${isMoving ? 'swimBack 1.2s ease-in-out infinite alternate' : 'none'};
            }
          `}
        </style>

        {/* Flippers/Limbs */}
        {/* Front Left Flipper */}
        <path
          className="front-flipper-l"
          d="M20 32C16 32 12 35 11 38C10 41 12 43 15 42C18 41 21 37 22 34"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Front Right Flipper */}
        <path
          className="front-flipper-r"
          d="M44 32C48 32 52 35 53 38C54 41 52 43 49 42C46 41 43 37 42 34"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Back Left Flipper */}
        <path
          className="back-flipper-l"
          d="M23 44C20 46 17 49 17 52C17 55 19 55 21 54C23 53 25 49 26 46"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Back Right Flipper */}
        <path
          className="back-flipper-r"
          d="M41 44C44 46 47 49 47 52C47 55 45 55 43 54C41 53 39 49 38 46"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Tail */}
        <path
          d="M32 48L32 54"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Head */}
        <path
          d="M32 20C34.7614 20 37 17.7614 37 15C37 12.2386 34.7614 10 32 10C29.2386 10 27 12.2386 27 15C27 17.7614 29.2386 20 32 20Z"
          fill="currentColor"
        />
        <path
          d="M30 20H34V24H30V20Z"
          fill="currentColor"
        />

        {/* Outer Shell / Carapace */}
        <circle
          cx="32"
          cy="34"
          r="13"
          fill="var(--bg-card)"
          stroke="currentColor"
          strokeWidth="3.5"
        />

        {/* Carapace Hexagon Patterns */}
        <path
          d="M32 24L36 27.5V32.5L32 36L28 32.5V27.5L32 24Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M32 24V21M36 27.5L42 26M36 32.5L42 34M32 36V43M28 32.5L22 34M28 27.5L22 26"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
