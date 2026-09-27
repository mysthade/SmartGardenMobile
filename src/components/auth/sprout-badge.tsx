import Svg, { Circle, Path } from 'react-native-svg';
import type { ThemeTokens } from '@/src/theme/tokens';

interface SproutBadgeProps {
  theme: ThemeTokens;
  size?: number;
}

/**
 * Іконка-паросток у колі: фон --ac3, дві зелені "пелюстки" (--ac/--ac2),
 * коричневе "стебло/корінь".
 */
export function SproutBadge({ theme, size = 76 }: SproutBadgeProps) {
  const dark = theme.name === 'dark';
  const stem = dark ? '#a0805c' : '#7c5a3c';
  return (
    <Svg width={size} height={size} viewBox="0 0 76 76">
      <Circle cx={38} cy={38} r={36} fill={theme.ac3} />
      {/* Стебло */}
      <Path
        d="M38 58 C38 48 38 40 38 32"
        fill="none"
        stroke={stem}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      {/* Корінець */}
      <Path
        d="M38 58 C34 61 30 61 27 59"
        fill="none"
        stroke={stem}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* Ліва пелюстка */}
      <Path
        d="M38 44 C28 44 22 38 21 29 C30 30 37 35 38 44 Z"
        fill={theme.ac}
      />
      {/* Права пелюстка */}
      <Path
        d="M38 38 C48 38 54 32 55 23 C46 24 39 29 38 38 Z"
        fill={theme.ac2}
      />
    </Svg>
  );
}
