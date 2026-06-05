package core

// Palette represents a color theme for LaTeX CER generation
type Palette struct {
	ThemeDark    string
	ThemePrimary string
	ThemeLight   string
	ThemeAccent  string
	TextGray     string
	ThemeMuted   string
}

// PALETTES holds all available color palettes
var PALETTES = map[string]Palette{
	// === Original palettes ===
	"coffee": {
		ThemeDark:    "3E2723",
		ThemePrimary: "8D6E63",
		ThemeLight:   "EFEBE9",
		ThemeAccent:  "D7CCC8",
		TextGray:     "455A64",
		ThemeMuted:   "AFA6A3",
	},
	"corporate_blue": {
		ThemeDark:    "0A192F",
		ThemePrimary: "1D3557",
		ThemeLight:   "F1FAEE",
		ThemeAccent:  "457B9D",
		TextGray:     "374151",
		ThemeMuted:   "9CA3AF",
	},
	"emerald_nature": {
		ThemeDark:    "064E3B",
		ThemePrimary: "10B981",
		ThemeLight:   "F0FDF4",
		ThemeAccent:  "6EE7B7",
		TextGray:     "1F2937",
		ThemeMuted:   "9CA3AF",
	},
	"crimson_vibrant": {
		ThemeDark:    "450A0A",
		ThemePrimary: "E63946",
		ThemeLight:   "FEF2F2",
		ThemeAccent:  "F87171",
		TextGray:     "374151",
		ThemeMuted:   "D1D5DB",
	},
	"sunset_warm": {
		ThemeDark:    "7C2D12",
		ThemePrimary: "F97316",
		ThemeLight:   "FFF7ED",
		ThemeAccent:  "FDBA74",
		TextGray:     "4B5563",
		ThemeMuted:   "A8A29E",
	},
	"amethyst_creative": {
		ThemeDark:    "4C1D95",
		ThemePrimary: "8B5CF6",
		ThemeLight:   "F5F3FF",
		ThemeAccent:  "C4B5FD",
		TextGray:     "374151",
		ThemeMuted:   "9CA3AF",
	},
	"teal_modern": {
		ThemeDark:    "0F766E",
		ThemePrimary: "14B8A6",
		ThemeLight:   "F0FDFA",
		ThemeAccent:  "5EEAD4",
		TextGray:     "334155",
		ThemeMuted:   "94A3B8",
	},
	"monochrome_slate": {
		ThemeDark:    "0F172A",
		ThemePrimary: "475569",
		ThemeLight:   "F8FAFC",
		ThemeAccent:  "94A3B8",
		TextGray:     "334155",
		ThemeMuted:   "CBD5E1",
	},
	"gold_luxury": {
		ThemeDark:    "171717",
		ThemePrimary: "D4AF37",
		ThemeLight:   "FCF8F2",
		ThemeAccent:  "FBE49D",
		TextGray:     "525252",
		ThemeMuted:   "A3A3A3",
	},
	"berry_elegant": {
		ThemeDark:    "4C0519",
		ThemePrimary: "E11D48",
		ThemeLight:   "FFF1F2",
		ThemeAccent:  "FDA4AF",
		TextGray:     "3F3F46",
		ThemeMuted:   "A1A1AA",
	},
	"cyberpunk_tech": {
		ThemeDark:    "120524",
		ThemePrimary: "8A2BE2",
		ThemeLight:   "F4F0FC",
		ThemeAccent:  "00FFCC",
		TextGray:     "2D3748",
		ThemeMuted:   "718096",
	},

	// === New palettes ===

	// Ocean Depth — deep aquatic blues, professional and calming
	"ocean_depth": {
		ThemeDark:    "0B2D4A",
		ThemePrimary: "1B6FA8",
		ThemeLight:   "E8F4FD",
		ThemeAccent:  "7EC8E3",
		TextGray:     "334155",
		ThemeMuted:   "94A3B8",
	},
	// Rose Garden — soft romantic pink-mauve, elegant for humanities reports
	"rose_garden": {
		ThemeDark:    "4A1736",
		ThemePrimary: "D45A8A",
		ThemeLight:   "FDF2F8",
		ThemeAccent:  "F1A6C5",
		TextGray:     "4A3F44",
		ThemeMuted:   "B0A0A8",
	},
	// Forest Pine — earthy deep greens, natural and grounded
	"forest_pine": {
		ThemeDark:    "1A3C2A",
		ThemePrimary: "3A7D44",
		ThemeLight:   "F2F9F0",
		ThemeAccent:  "7EC878",
		TextGray:     "2D3A32",
		ThemeMuted:   "9AA89C",
	},
	// Lavender Fields — soft purple with grey-lavender accents
	"lavender_fields": {
		ThemeDark:    "2D1B4E",
		ThemePrimary: "7C5FBF",
		ThemeLight:   "F5F0FF",
		ThemeAccent:  "C4B0E0",
		TextGray:     "3D3555",
		ThemeMuted:   "A99CB8",
	},
	// Maple Autumn — warm orange-rust tones for fall-themed reports
	"maple_autumn": {
		ThemeDark:    "5E2A13",
		ThemePrimary: "C8612F",
		ThemeLight:   "FEF5ED",
		ThemeAccent:  "E8A87C",
		TextGray:     "4A3C33",
		ThemeMuted:   "B29B8E",
	},
	// Midnight Sky — very dark blue with warm golden accents
	"midnight_sky": {
		ThemeDark:    "0A0E27",
		ThemePrimary: "1A237E",
		ThemeLight:   "EBEFFA",
		ThemeAccent:  "FFD54F",
		TextGray:     "2D3748",
		ThemeMuted:   "8892A0",
	},
	// Coral Reef — vibrant coral-teal combo, energetic and fresh
	"coral_reef": {
		ThemeDark:    "2C1A1A",
		ThemePrimary: "FF6B6B",
		ThemeLight:   "FFF5F5",
		ThemeAccent:  "4ECDC4",
		TextGray:     "3D3333",
		ThemeMuted:   "A89494",
	},
	// Nordic Frost — cool icy blues, minimal and clean
	"nordic_frost": {
		ThemeDark:    "1E2D3D",
		ThemePrimary: "5D8AA8",
		ThemeLight:   "F2F7FA",
		ThemeAccent:  "A9C9E0",
		TextGray:     "2D3A47",
		ThemeMuted:   "8EA0B0",
	},
	// Terracotta Earth — warm clay tones, rustic and academic
	"terracotta_earth": {
		ThemeDark:    "4A2C20",
		ThemePrimary: "B85C38",
		ThemeLight:   "FCF5F0",
		ThemeAccent:  "DBA07A",
		TextGray:     "42362E",
		ThemeMuted:   "A7978E",
	},
	// Neon Noir — ultra-dark with electric cyan and magenta accents
	"neon_noir": {
		ThemeDark:    "0D0D1A",
		ThemePrimary: "E040FB",
		ThemeLight:   "FAF0FF",
		ThemeAccent:  "00E5FF",
		TextGray:     "4A4452",
		ThemeMuted:   "8880A0",
	},
	// Mint Fresh — light airy greens, clean and approachable
	"mint_fresh": {
		ThemeDark:    "1B4332",
		ThemePrimary: "34D399",
		ThemeLight:   "ECFDF5",
		ThemeAccent:  "6EE7B7",
		TextGray:     "2D3F38",
		ThemeMuted:   "8DA89E",
	},
	// Royal Purple — deep purples with gold accents, prestigious
	"royal_purple": {
		ThemeDark:    "1A0A2E",
		ThemePrimary: "5B2C8E",
		ThemeLight:   "F6F0FA",
		ThemeAccent:  "FBBF24",
		TextGray:     "3A3250",
		ThemeMuted:   "9890B0",
	},
	// Steel Gray — cool industrial gray-blue, technical and neutral
	"steel_gray": {
		ThemeDark:    "1E2633",
		ThemePrimary: "5A6B7D",
		ThemeLight:   "F4F6F8",
		ThemeAccent:  "A0B0C0",
		TextGray:     "2D3640",
		ThemeMuted:   "8D99A8",
	},
	// Sakura Bloom — cherry blossom pink with soft neutrals
	"sakura_bloom": {
		ThemeDark:    "4A1E3A",
		ThemePrimary: "F472B6",
		ThemeLight:   "FDF2F8",
		ThemeAccent:  "F9A8D4",
		TextGray:     "4A3745",
		ThemeMuted:   "B095A8",
	},
	// Desert Sand — warm sandy beige with terracotta accents
	"desert_sand": {
		ThemeDark:    "3D2B1F",
		ThemePrimary: "C4956A",
		ThemeLight:   "FCF7F0",
		ThemeAccent:  "E0C3A8",
		TextGray:     "453E36",
		ThemeMuted:   "B0A89A",
	},
	// Arctic Aurora — dark teal with icy green-blue aurora accents
	"arctic_aurora": {
		ThemeDark:    "0F2D33",
		ThemePrimary: "2DD4BF",
		ThemeLight:   "EEFCF9",
		ThemeAccent:  "67E8D9",
		TextGray:     "1F3D42",
		ThemeMuted:   "80A8A3",
	},
	// Bordeaux — deep wine red, classic and refined
	"bordeaux": {
		ThemeDark:    "2D131A",
		ThemePrimary: "8B2252",
		ThemeLight:   "FDF2F5",
		ThemeAccent:  "C9758B",
		TextGray:     "3D2A30",
		ThemeMuted:   "A48A92",
	},
	// Sunflower — bright yellow with dark charcoal, energetic
	"sunflower": {
		ThemeDark:    "1F1A0F",
		ThemePrimary: "F59E0B",
		ThemeLight:   "FFFCF0",
		ThemeAccent:  "FCD34D",
		TextGray:     "4A4030",
		ThemeMuted:   "B0A88A",
	},
	// Slate Blue — muted blue-gray, serious and academic
	"slate_blue": {
		ThemeDark:    "1A2233",
		ThemePrimary: "4A6FA5",
		ThemeLight:   "F0F4FA",
		ThemeAccent:  "8AAEE0",
		TextGray:     "2D3748",
		ThemeMuted:   "90A0B8",
	},
	// Autumn Harvest — deep pumpkin and orange, warm and rich
	"autumn_harvest": {
		ThemeDark:    "3D2010",
		ThemePrimary: "D97706",
		ThemeLight:   "FFF7ED",
		ThemeAccent:  "FBBF24",
		TextGray:     "4A3D30",
		ThemeMuted:   "B0A08A",
	},
	// Iceberg — crisp cool blue-white, minimal and sharp
	"iceberg": {
		ThemeDark:    "1A2833",
		ThemePrimary: "60A5FA",
		ThemeLight:   "F0F7FF",
		ThemeAccent:  "BFDBFE",
		TextGray:     "2D3A48",
		ThemeMuted:   "889AB0",
	},
	// Papaya — tropical orange-pink combo, lively and modern
	"papaya": {
		ThemeDark:    "2D1A1A",
		ThemePrimary: "FF8A65",
		ThemeLight:   "FFF5F0",
		ThemeAccent:  "FFAB91",
		TextGray:     "4A3833",
		ThemeMuted:   "B09A94",
	},
	// Graphite — dark charcoal with cool gray, serious corporate
	"graphite": {
		ThemeDark:    "1A1D23",
		ThemePrimary: "4B5563",
		ThemeLight:   "F3F4F6",
		ThemeAccent:  "9CA3AF",
		TextGray:     "374151",
		ThemeMuted:   "9CA3AF",
	},
	// Cerulean — bright professional blue, confident and clear
	"cerulean": {
		ThemeDark:    "0B294A",
		ThemePrimary: "2563EB",
		ThemeLight:   "EFF6FF",
		ThemeAccent:  "60A5FA",
		TextGray:     "2D3748",
		ThemeMuted:   "8DA0B8",
	},
}

// GetPalette returns a palette by name, defaults to "coffee"
func GetPalette(name string) Palette {
	if palette, ok := PALETTES[name]; ok {
		return palette
	}
	return PALETTES["coffee"]
}

func (p Palette) ToMap() map[string]string {
	return map[string]string{
		"themeDark":    p.ThemeDark,
		"themePrimary": p.ThemePrimary,
		"themeLight":   p.ThemeLight,
		"themeAccent":  p.ThemeAccent,
		"textGray":     p.TextGray,
		"themeMuted":   p.ThemeMuted,
	}
}
