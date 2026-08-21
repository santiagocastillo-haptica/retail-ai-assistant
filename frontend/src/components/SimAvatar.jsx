const PANTS_COLOR = '#333a4a';

function Hair({ style, color }) {
  switch (style) {
    case 'ponytail':
      return (
        <>
          <path d="M17 17 Q32 2 47 17 L47 23 Q32 11 17 23 Z" fill={color} />
          <ellipse cx="47.5" cy="29" rx="4" ry="10" fill={color} transform="rotate(25 47.5 29)" />
        </>
      );
    case 'short':
      return <path d="M16 18 Q32 -1 48 18 L48 25 Q32 12 16 25 Z" fill={color} />;
    case 'long':
      return (
        <>
          <path d="M16 18 Q32 -1 48 18 L48 25 Q32 12 16 25 Z" fill={color} />
          <path d="M15 20 Q11 36 16 51 Q20 53 22.5 49 Q19 36 21 21 Z" fill={color} />
          <path d="M49 20 Q53 36 48 51 Q44 53 41.5 49 Q45 36 43 21 Z" fill={color} />
        </>
      );
    case 'bun':
      return (
        <>
          <path d="M17 17 Q32 3 47 17 L47 23 Q32 12 17 23 Z" fill={color} />
          <circle cx="32" cy="6" r="5.5" fill={color} />
          {/* flor decorativa */}
          <circle cx="21" cy="10" r="2.2" fill="#e97fb0" />
          <circle cx="24" cy="7.5" r="2.2" fill="#e97fb0" />
          <circle cx="24.5" cy="12.5" r="2.2" fill="#e97fb0" />
          <circle cx="27.5" cy="9.5" r="2.2" fill="#e97fb0" />
          <circle cx="24.3" cy="10" r="1.5" fill="#f5c84c" />
        </>
      );
    case 'balding':
    default:
      return (
        <>
          <path d="M16 19 Q15 27 21 29 L21 19 Z" fill={color} />
          <path d="M48 19 Q49 27 43 29 L43 19 Z" fill={color} />
          <rect x="27" y="30" width="10" height="2.6" rx="1.3" fill={color} />
        </>
      );
  }
}

export default function SimAvatar({ bodyColor, skinTone, hairColor, hairStyle, talking }) {
  return (
    <svg
      className={`sim-avatar${talking ? ' sim-avatar--talking' : ''}`}
      viewBox="0 0 64 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="32" cy="93" rx="16" ry="4" fill="rgba(0,0,0,0.3)" />

      <rect x="20" y="64" width="9" height="27" rx="4" fill={PANTS_COLOR} />
      <rect x="35" y="64" width="9" height="27" rx="4" fill={PANTS_COLOR} />

      <rect x="6" y="36" width="9" height="27" rx="4.5" fill={bodyColor} />
      <rect x="49" y="36" width="9" height="27" rx="4.5" fill={bodyColor} />

      <rect x="16" y="33" width="32" height="34" rx="11" fill={bodyColor} />

      <circle cx="32" cy="21" r="14" fill={skinTone} />
      <circle cx="26.5" cy="21" r="1.6" fill="#2b2b2b" />
      <circle cx="37.5" cy="21" r="1.6" fill="#2b2b2b" />
      <path d="M26 26.5 Q32 30.5 38 26.5" stroke="#5a3b33" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      <Hair style={hairStyle} color={hairColor} />
    </svg>
  );
}
