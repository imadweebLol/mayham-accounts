/** Mayham's independently designed colour themes. Local UI prefs never contain account secrets. */
export type MayhamPalette = { id: string; name: string; detail: string; ground: string; panel: string; raised: string; accent: string; ink?: string; highlight: string };
export const MAYHAM_PRESETS: MayhamPalette[] = [
  { id: 'mayham', name: 'Mayham Violet', detail: 'Dark amethyst and electric violet', ground: '#11091f', panel: '#211431', raised: '#322044', accent: '#a53cff', highlight: '#df93ff' },
  { id: 'petal', name: 'Original Petal', detail: 'Soft rose and white', ground: '#f9ecf3', panel: '#ffffff', raised: '#f4dce9', accent: '#d95592', highlight: '#f4a4c7', ink: '#211727' },
  { id: 'glass', name: 'Glass Blossom', detail: 'Charcoal glass with floral pink', ground: '#251f2a', panel: '#39313d', raised: '#4c3b4a', accent: '#ee92c6', highlight: '#f9b4df' },
  { id: 'graphite', name: 'Graphite Minimal', detail: 'Quiet neutral graphite', ground: '#1b1e21', panel: '#303438', raised: '#484b4f', accent: '#cbd0d6', highlight: '#e7e9ed' },
  { id: 'midnight', name: 'Midnight Blue', detail: 'Deep navy and electric blue', ground: '#0b152a', panel: '#162e50', raised: '#254774', accent: '#5aabff', highlight: '#8fc9ff' },
  { id: 'forest', name: 'Forest Canopy', detail: 'Dark evergreen with fresh green', ground: '#10251e', panel: '#213e30', raised: '#355f47', accent: '#8de0a6', highlight: '#b5f3c3' },
  { id: 'sandstone', name: 'Warm Sandstone', detail: 'Espresso, copper and warm sand', ground: '#261b18', panel: '#49382c', raised: '#705744', accent: '#e3ad77', highlight: '#ffd5a4' },
  { id: 'synthwave', name: 'Synthwave', detail: 'Purple neon and magenta', ground: '#1a102b', panel: '#372446', raised: '#56345f', accent: '#fa66d2', highlight: '#fe9aed' },
  { id: 'aurora', name: 'Aurora Observatory', detail: 'Northern lights and mint glass', ground: '#071c25', panel: '#123c43', raised: '#245c5c', accent: '#66f3ca', highlight: '#a3ffe8' },
  { id: 'ocean', name: 'Deep Ocean', detail: 'Underwater waves and cyan glass', ground: '#061b2a', panel: '#0f3748', raised: '#16546b', accent: '#45d6f4', highlight: '#9befff' },
  { id: 'dunes', name: 'Solstice Dunes', detail: 'Sunset desert and copper cards', ground: '#2b1823', panel: '#5a303b', raised: '#7c4c46', accent: '#ffac78', highlight: '#f8c3a1' },
  { id: 'neon', name: 'Neon City', detail: 'Retro skyline and luminous controls', ground: '#100b24', panel: '#271b40', raised: '#40305f', accent: '#ff59d8', highlight: '#bf7dff' },
  { id: 'frost', name: 'Alpine Frost', detail: 'Snowy glass and icy blue', ground: '#102732', panel: '#234456', raised: '#355b70', accent: '#b3efff', highlight: '#e3f9ff' },
  { id: 'ember', name: 'Crimson Ember', detail: 'Dark cherry and molten highlights', ground: '#210d18', panel: '#421d2c', raised: '#693144', accent: '#ff628f', highlight: '#ffc0d1' },
  { id: 'royal', name: 'Royal Amethyst', detail: 'Deep jewel purple and gold', ground: '#160d2a', panel: '#302048', raised: '#4b3364', accent: '#c09aff', highlight: '#e5c47d' },
];
export type MayhamTheme = { surface: string; accent: string; radius: number; glow: number; transparency: number; useCustomAccent: boolean; customAccent: string; layout: 'solid' | 'roalt'; bubbles: boolean; backgroundPath?: string };
export type SavedMayhamPreset = { id: string; name: string; theme: MayhamTheme; createdAt: string };
const SAVED_KEY = 'mayham.savedThemePresets.v1';
export function loadSavedMayhamPresets(): SavedMayhamPreset[] {
  try { const data: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); return Array.isArray(data) ? data.filter((v): v is SavedMayhamPreset => typeof v === 'object' && v !== null && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.theme === 'object' && v.theme !== null) : []; }
  catch { return []; }
}
export function saveSavedMayhamPresets(presets: SavedMayhamPreset[]) { localStorage.setItem(SAVED_KEY, JSON.stringify(presets)); }
export const MAYHAM_THEME_KEY = 'mayham.theme.v1';
export const MAYHAM_DEFAULT: MayhamTheme = { surface: 'mayham', accent: 'mayham', radius: 10, glow: 0, transparency: 0, useCustomAccent: false, customAccent: '#a53cff', layout: 'solid', bubbles: false };
export function loadMayhamTheme(): MayhamTheme {
  try { const raw = localStorage.getItem(MAYHAM_THEME_KEY); return raw ? { ...MAYHAM_DEFAULT, ...JSON.parse(raw) as Partial<MayhamTheme> } : MAYHAM_DEFAULT; }
  catch { return MAYHAM_DEFAULT; }
}
export function saveMayhamTheme(settings: MayhamTheme) {
  localStorage.setItem(MAYHAM_THEME_KEY, JSON.stringify(settings));
  applyMayhamTheme(settings);
  window.dispatchEvent(new Event('mayham-theme-changed'));
}
/** Apply after upstream token injection so system dark/light changes retain the fork's palette. */
export function applyMayhamTheme(settings = loadMayhamTheme()) {
  const root = document.documentElement;
  const surface = MAYHAM_PRESETS.find(p => p.id === settings.surface) ?? MAYHAM_PRESETS[0];
  const color = MAYHAM_PRESETS.find(p => p.id === settings.accent) ?? MAYHAM_PRESETS[0];
  const accent = settings.useCustomAccent && /^#[0-9a-f]{6}$/i.test(settings.customAccent) ? settings.customAccent : color.accent;
  const set = (key: string, value: string) => root.style.setProperty(key, value);
  set('--ground', surface.ground);
  set('--surface-1', `color-mix(in srgb, ${surface.panel} ${100-Math.min(65,Math.max(0,settings.transparency))}%, transparent)`);
  set('--surface-2', surface.raised);
  set('--surface-3', surface.raised);
  set('--island', surface.panel);
  set('--island-inset', surface.raised);
  set('--float', surface.panel);
  root.style.colorScheme = surface.ink ? 'light' : 'dark';
  set('--thumb', surface.raised);
  set('--fg', surface.ink ?? '#f7f1ff');
  set('--fg-2', surface.ink ? '#51425d' : '#d5c7e3');
  set('--fg-3', surface.ink ? '#64536e' : '#ae9fbe');
  set('--accent', accent);
  set('--accent-text', color.highlight);
  set('--focus', accent);
  set('--on-accent', '#140a20');
  set('--user-accent', accent);
  set('--user-accent-text', color.highlight);
  set('--user-on-accent', '#140a20');
  set('--r-xl', `${Math.max(4,settings.radius+6)}px`);
  set('--r-lg', `${Math.max(4,settings.radius)}px`);
  set('--r-md', `${Math.max(3,settings.radius-4)}px`);
  set('--mayham-glow', `0 0 ${Math.max(0,settings.glow)/2}px color-mix(in srgb, ${accent} ${Math.max(0,settings.glow)}%, transparent)`);
  set('--mayham-opacity', `${Math.min(1,Math.max(0,settings.transparency)/100)}`);
  root.dataset.mayham = settings.surface;
  root.dataset.mayhamLayout = settings.layout === 'roalt' ? 'roalt' : 'solid';
  root.dataset.mayhamBubbles = settings.layout === 'roalt' && settings.bubbles ? 'on' : 'off';
}
