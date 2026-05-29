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
