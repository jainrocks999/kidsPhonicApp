export const colors = {
  bg: '#EAF4FF',
  surface: '#FFFFFF',
  primary: '#6C5CE7',      // grape purple
  primaryDark: '#4B3BC4',
  yellow: '#FFC933',
  blue: '#2EB5FF',
  green: '#2ED573',
  red: '#FF5E7A',          // strawberry
  purple: '#A66CFF',
  pink: '#FF8AD8',
  orange: '#FF9F43',
  text: '#2B2A4C',         // deep indigo (pure black se softer)
  textMuted: '#7C7BA3',
  border: '#D9DFF7',
  locked: '#BFC3D9',
  overlay: 'rgba(25, 20, 60, 0.5)',
};

/** Accent per level (index 0 = Level 1). */
export const levelColors = [colors.red, colors.blue, colors.green, colors.purple, colors.orange];

/** Chunky 3D edge ke liye har accent ka dark version. */
export const levelDark = ['#D63A5A', '#1288D6', '#13A850', '#7A3FD6', '#E07A1F'];

export const fonts = {
  regular: 'Quicksand-Regular',
  bold: 'Quicksand-Bold',
  sans: 'GoogleSans-Regular',
  sansMedium: 'GoogleSans-Medium',
  sansBold: 'GoogleSans-Bold',
};

export const radius = { sm: 12, md: 20, lg: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const shadow = {
  shadowColor: '#2B2A4C',
  shadowOpacity: 0.18,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};