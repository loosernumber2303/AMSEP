interface BeeMascotProps {
  className?: string;
  isMoving?: boolean;
}

export default function BeeMascot({ className = 'w-10 h-10', isMoving = false }: BeeMascotProps) {
  return (
    <div className={`relative flex items-center justify-center transition-all ${className} ${isMoving ? 'animate-bounce' : ''}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-honey-accent drop-shadow-[0_2px_8px_rgba(251,191,36,0.25)]"
      >
        {/* Antennae */}
        <path
          d="M44 32C46 29 48 29 49 30"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M42 30C43.5 27 45.5 27 46.5 28"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Wings (Translucent White) */}
        {/* Left Wing (Back Layer) */}
        <ellipse
          cx="28"
          cy="22"
          rx="5"
          ry="9"
          transform="rotate(-20 28 22)"
          fill="#FFFDF5"
          fillOpacity="0.6"
          stroke="currentColor"
          strokeWidth="1.5"
          className={isMoving ? 'wing-animate-l' : ''}
        />
        {/* Right Wing (Front Layer) */}
        <ellipse
          cx="34"
          cy="20"
          rx="6"
          ry="10"
          transform="rotate(15 34 20)"
          fill="#FFFDF5"
          fillOpacity="0.85"
          stroke="currentColor"
          strokeWidth="1.8"
          className={isMoving ? 'wing-animate-r' : ''}
        />

        {/* Stinger (Left Point) */}
        <path
          d="M14 36L19 33.5V38.5L14 36Z"
          fill="#090909"
          className="dark:fill-[#090909]"
        />

        {/* Abdomen / Stripes (Alternating Yellow and Black) */}
        {/* Segment 1: Black tail */}
        <path
          d="M19 33.5C21 31.5 23 31.5 24 31.5V40.5C23 40.5 21 40.5 19 38.5V33.5Z"
          fill="#171717"
        />
        {/* Segment 2: Yellow */}
        <path
          d="M24 31.5H28.5V40.5H24V31.5Z"
          fill="currentColor"
        />
        {/* Segment 3: Black */}
        <path
          d="M28.5 31.5H33V40.5H28.5V31.5Z"
          fill="#171717"
        />
        {/* Segment 4: Yellow */}
        <path
          d="M33 31.5H37.5V40.5H33V31.5Z"
          fill="currentColor"
        />
        {/* Segment 5: Black Thorax */}
        <path
          d="M37.5 31.5H41V40.5H37.5V31.5Z"
          fill="#171717"
        />

        {/* Head (Black Circle) */}
        <circle
          cx="43"
          cy="36"
          r="5"
          fill="#171717"
        />

        {/* Eye (Tiny white dot) */}
        <circle
          cx="44.5"
          cy="34.5"
          r="1.2"
          fill="#FFFDF5"
        />

        {/* Legs */}
        <path
          d="M26 40V44L28 45"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M32 40V44L34 45"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M38 40V44L40 45"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
