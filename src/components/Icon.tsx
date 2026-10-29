import Svg, { Circle, G, Path } from 'react-native-svg';

export type IconName = 'back' | 'settings' | 'speaker' | 'prev' | 'next' | 'play' | 'pause';

/** Chunky rounded line icons drawn in a 24×24 box — no icon font needed. */
export function Icon({ name, size = 24, color = '#fff' }: { name: IconName; size?: number; color?: string }) {
  const line = { stroke: color, strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'back' && <Path d="M19 12H6M11.5 5.5L5 12l6.5 6.5" {...line} />}
      {name === 'prev' && <Path d="M15 4.5L7.5 12l7.5 7.5" {...line} />}
      {name === 'next' && <Path d="M9 4.5l7.5 7.5L9 19.5" {...line} />}
      {name === 'play' && <Path d="M8 5.5v13l10.5-6.5z" fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />}
      {name === 'pause' && <Path d="M8.5 6v12M15.5 6v12" {...line} strokeWidth={4} />}
      {name === 'speaker' && (
        <G>
          <Path d="M3.5 9.2h3.8L12.5 5v14l-5.2-4.2H3.5z" fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
          <Path d="M15.6 9.2a4 4 0 010 5.6M18.4 6.4a8 8 0 010 11.2" {...line} strokeWidth={2.6} />
        </G>
      )}
      {name === 'settings' && (
        <G>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <Path
                key={i}
                d={`M${12 + 6.5 * Math.cos(a)} ${12 + 6.5 * Math.sin(a)}L${12 + 9.6 * Math.cos(a)} ${12 + 9.6 * Math.sin(a)}`}
                stroke={color}
                strokeWidth={3.6}
                strokeLinecap="round"
              />
            );
          })}
          <Circle cx={12} cy={12} r={6} {...line} strokeWidth={3.4} />
          <Circle cx={12} cy={12} r={1.8} fill={color} />
        </G>
      )}
    </Svg>
  );
}
