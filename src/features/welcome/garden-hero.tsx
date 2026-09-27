import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Polygon,
  Rect,
} from 'react-native-svg';
import type { ThemeTokens } from '@/src/theme/tokens';

interface GardenHeroProps {
  theme: ThemeTokens;
  width?: number;
  height?: number;
}

/**
 * Hero-ілюстрація саду: теплиця, кущі, дерево, хмари, сонце.
 * Усі заливки — з токенів теми; хмарки напівпрозорі, але помітні в обох темах.
 */
export function GardenHero({ theme, width = 300, height = 190 }: GardenHeroProps) {
  const dark = theme.name === 'dark';
  const sky = theme.bg;
  // У темній темі земля трохи світліша за фон, у світлій — пастельна.
  const ground = dark ? '#1a2620' : '#dcf0e1';
  const bushDark = dark ? '#2f6e4a' : '#3a9e63';
  const bushLight = dark ? '#3fae6d' : '#6cc489';
  const trunk = dark ? '#7a5c42' : '#8a6a4a';
  const glass = dark ? theme.ac : '#bfe3cc';
  const frame = theme.ac2;
  const sun = dark ? '#e9c46a' : '#f4b942';

  return (
    <Svg width={width} height={height} viewBox="0 0 300 190">
      {/* Небо */}
      <Rect x={0} y={0} width={300} height={190} rx={24} fill={sky} />
      {/* Сонце */}
      <Circle cx={248} cy={34} r={18} fill={sun} opacity={0.9} />
      <Circle cx={248} cy={34} r={26} fill={sun} opacity={0.25} />
      {/* Хмари */}
      <G fill={theme.tx} opacity={dark ? 0.22 : 0.12}>
        <Ellipse cx={70} cy={42} rx={26} ry={10} />
        <Ellipse cx={92} cy={36} rx={18} ry={9} />
        <Ellipse cx={196} cy={62} rx={22} ry={9} />
        <Ellipse cx={214} cy={56} rx={15} ry={8} />
      </G>
      {/* Земля */}
      <Ellipse cx={150} cy={182} rx={140} ry={26} fill={ground} />
      {/* Теплиця */}
      <G>
        <Rect x={86} y={96} width={96} height={62} rx={4} fill={glass} opacity={dark ? 0.55 : 0.75} />
        <Polygon points="86,96 134,62 182,96" fill={glass} opacity={dark ? 0.55 : 0.75} />
        <Path d="M86 96 L134 62 L182 96" fill="none" stroke={frame} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M86 96 V158 M134 62 V158 M182 96 V158" stroke={frame} strokeWidth={5} strokeLinecap="round" />
        <Path d="M86 158 H182" stroke={frame} strokeWidth={5} strokeLinecap="round" />
        <Path d="M109 96 V158 M134 96 V158 M157 96 V158" stroke={frame} strokeWidth={2.5} opacity={0.8} />
        {/* Грядки всередині */}
        <Rect x={96} y={126} width={28} height={10} rx={5} fill={bushDark} opacity={0.85} />
        <Rect x={128} y={126} width={28} height={10} rx={5} fill={bushLight} opacity={0.85} />
        <Rect x={160} y={126} width={12} height={10} rx={5} fill={bushDark} opacity={0.85} />
      </G>
      {/* Дерево */}
      <G>
        <Rect x={216} y={120} width={10} height={38} rx={4} fill={trunk} />
        <Circle cx={221} cy={102} r={26} fill={bushDark} />
        <Circle cx={205} cy={112} r={16} fill={bushLight} opacity={0.9} />
        <Circle cx={236} cy={112} r={15} fill={bushLight} opacity={0.9} />
      </G>
      {/* Кущі ліворуч */}
      <G>
        <Circle cx={44} cy={146} r={18} fill={bushDark} />
        <Circle cx={62} cy={150} r={13} fill={bushLight} />
        <Circle cx={30} cy={152} r={11} fill={bushLight} opacity={0.9} />
      </G>
      {/* Квіти */}
      <G>
        <Circle cx={70} cy={168} r={3.5} fill="#e76f8a" />
        <Circle cx={262} cy={168} r={3.5} fill="#e76f8a" />
        <Circle cx={150} cy={172} r={3.5} fill={sun} />
      </G>
    </Svg>
  );
}
