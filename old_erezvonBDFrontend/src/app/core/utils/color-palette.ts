/**
 * Predefined Fashion & E-Commerce Color Palette (40+ Colors)
 * Provides automatic Hex Code matching based on color name.
 */

export interface PredefinedColor {
  name: string;
  hex: string;
  aliases: string[];
}

export const PREDEFINED_COLORS: PredefinedColor[] = [
  // Primary & Classic
  { name: 'Red', hex: '#EF4444', aliases: ['crimson', 'scarlet', 'ruby', 'bright red'] },
  { name: 'Green', hex: '#10B981', aliases: ['emerald', 'dark green', 'classic green'] },
  { name: 'Blue', hex: '#3B82F6', aliases: ['royal blue', 'classic blue', 'ocean blue'] },
  { name: 'Yellow', hex: '#EAB308', aliases: ['lemon', 'canary', 'bright yellow'] },
  { name: 'Ash', hex: '#9CA3AF', aliases: ['ash gray', 'ash grey', 'light gray', 'light grey', 'ass', 'heather ash'] },
  { name: 'Black', hex: '#111827', aliases: ['jet black', 'pure black', 'midnight black'] },
  { name: 'White', hex: '#FFFFFF', aliases: ['pure white', 'snow white'] },
  { name: 'Off White', hex: '#FAF9F6', aliases: ['offwhite', 'cream', 'ivory', 'milk', 'egg shell'] },

  // Blues & Aquas
  { name: 'Navy Blue', hex: '#1E3A8A', aliases: ['navy', 'dark blue', 'midnight blue', 'deep navy'] },
  { name: 'Royal Blue', hex: '#2563EB', aliases: ['cobalt', 'electric blue'] },
  { name: 'Sky Blue', hex: '#38BDF8', aliases: ['light blue', 'azure', 'baby blue', 'powder blue', 'ice blue'] },
  { name: 'Teal', hex: '#0D9488', aliases: ['deep teal', 'sea green'] },
  { name: 'Cyan', hex: '#06B6D4', aliases: ['aqua', 'cyan blue'] },
  { name: 'Turquoise', hex: '#14B8A6', aliases: ['ocean turquoise', 'aquamarine'] },
  { name: 'Indigo', hex: '#4F46E5', aliases: ['denim blue', 'deep indigo'] },

  // Greens
  { name: 'Olive Green', hex: '#65A30D', aliases: ['olive', 'military green', 'army green', 'olive drab'] },
  { name: 'Forest Green', hex: '#15803D', aliases: ['hunter green', 'pine green', 'bottle green', 'deep green'] },
  { name: 'Mint Green', hex: '#6EE7B7', aliases: ['mint', 'seafoam', 'pastel green'] },
  { name: 'Lime Green', hex: '#84CC16', aliases: ['lime', 'chartreuse'] },
  { name: 'Sage Green', hex: '#84A98C', aliases: ['sage', 'eucalyptus', 'pistachio'] },
  { name: 'Emerald', hex: '#059669', aliases: ['emerald green', 'jade'] },

  // Pinks, Reds & Purples
  { name: 'Pink', hex: '#EC4899', aliases: ['pastel pink', 'light pink', 'baby pink'] },
  { name: 'Rose', hex: '#F43F5E', aliases: ['rose pink', 'dusty rose', 'blush pink', 'blush'] },
  { name: 'Magenta', hex: '#D946EF', aliases: ['hot pink', 'fuchsia'] },
  { name: 'Maroon', hex: '#881337', aliases: ['dark red', 'deep maroon', 'oxford red'] },
  { name: 'Burgundy', hex: '#701A75', aliases: ['wine', 'oxblood', 'merlot', 'cherry'] },
  { name: 'Purple', hex: '#9333EA', aliases: ['violet', 'grape'] },
  { name: 'Lavender', hex: '#C084FC', aliases: ['lilac', 'mauve', 'pastel purple'] },
  { name: 'Plum', hex: '#581C87', aliases: ['dark purple', 'eggplant'] },

  // Oranges, Yellows & Warm Tones
  { name: 'Orange', hex: '#F97316', aliases: ['tangerine', 'carrot', 'deep orange'] },
  { name: 'Coral', hex: '#FB7185', aliases: ['living coral', 'salmon', 'peach pink'] },
  { name: 'Peach', hex: '#FDBA74', aliases: ['apricot', 'pastel orange'] },
  { name: 'Mustard', hex: '#CA8A04', aliases: ['mustard yellow', 'ochre', 'curry'] },
  { name: 'Gold', hex: '#EAB308', aliases: ['golden', 'metallic gold', 'brass'] },
  { name: 'Rust', hex: '#C2410C', aliases: ['terracotta', 'brick red', 'burnt orange'] },
  { name: 'Bronze', hex: '#CD7F32', aliases: ['copper', 'metallic bronze'] },

  // Neutrals, Browns & Grays
  { name: 'Brown', hex: '#78350F', aliases: ['dark brown', 'chocolate', 'cocoa', 'wood'] },
  { name: 'Coffee', hex: '#4A2C11', aliases: ['espresso', 'mocha', 'deep brown', 'coffee brown'] },
  { name: 'Tan', hex: '#D2B48C', aliases: ['camel', 'toffee', 'caramel', 'light brown'] },
  { name: 'Beige', hex: '#F5F5DC', aliases: ['sand', 'nude', 'khaki light'] },
  { name: 'Khaki', hex: '#C3B091', aliases: ['chapped khaki', 'taupe'] },
  { name: 'Gray', hex: '#6B7280', aliases: ['grey', 'silver', 'slate', 'medium gray', 'smoke'] },
  { name: 'Charcoal', hex: '#374151', aliases: ['charcoal gray', 'dark gray', 'anthracite', 'gunmetal'] }
];

/**
 * Finds a matching Hex Code for any color name (case-insensitive with alias & substring matching)
 * @param colorName The input color name (e.g. "Red", "navy blue", "ash", "yellow")
 * @returns Hex string (e.g. "#EF4444") or null if no match found
 */
export function findMatchingHexCode(colorName?: string | null): string | null {
  if (!colorName || typeof colorName !== 'string') return null;

  const normalized = colorName.trim().toLowerCase().replace(/[-_]/g, ' ');
  if (!normalized) return null;

  // 1. Exact Name match
  const exactName = PREDEFINED_COLORS.find(c => c.name.toLowerCase() === normalized);
  if (exactName) return exactName.hex;

  // 2. Exact Alias match
  const exactAlias = PREDEFINED_COLORS.find(c => c.aliases.some(a => a.toLowerCase() === normalized));
  if (exactAlias) return exactAlias.hex;

  // 3. Substring match in Name
  const subName = PREDEFINED_COLORS.find(c => normalized.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(normalized));
  if (subName) return subName.hex;

  // 4. Substring match in Alias
  const subAlias = PREDEFINED_COLORS.find(c => c.aliases.some(a => normalized.includes(a.toLowerCase()) || a.toLowerCase().includes(normalized)));
  if (subAlias) return subAlias.hex;

  return null;
}
