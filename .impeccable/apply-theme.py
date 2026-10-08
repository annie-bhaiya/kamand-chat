from pathlib import Path
import re
root=Path('client/src')
# Replace literal legacy colours with semantic tokens in the existing components.
for p in root.rglob('*.tsx'):
 s=p.read_text(encoding='utf-8-sig')
 s=re.sub(r"fontSize: '([\d.]+)px'",lambda m: "fontSize: '"+str(round(max(float(m[1]),12)/15,3))+"rem'",s)
 s=re.sub(r"linear-gradient\([^']+\)", 'var(--accent)', s)
 s=re.sub(r"rgba\((?:99, 102, 241|2, 132, 199|168, 85, 247|56, 189, 248|139, 92, 246), [\d.]+\)",'var(--accent-light)',s)
 s=re.sub(r"rgba\(255, 255, 255, (0\.0\d|0\.1)\)",'var(--border-subtle)',s)
 s=re.sub(r"#(?:a5b4fc|818cf8|c7d2fe|38bdf8|7dd3fc|e9d5ff|d8b4fe|c4b5fd|60a5fa)", 'var(--accent)',s,flags=re.I)
 s=s.replace("color: '#ffffff'", "color: 'var(--text-primary)'")
 s=s.replace("color: '#fff'", "color: 'var(--text-primary)'")
 # Campus drawers use Tailwind. Replace their fixed dark surfaces with theme-aware tokens.
 s=re.sub(r'bg-\[#[0-9a-fA-F]+\](?:/\d+)?','bg-[var(--bg-secondary)]',s)
 s=re.sub(r'text-white/\d+','text-[var(--text-secondary)]',s)
 s=re.sub(r'border-white/\d+','border-[var(--border-subtle)]',s)
 s=re.sub(r'text-(?:purple|indigo|sky|amber|emerald|orange|blue|pink)-[234]00','text-[var(--accent)]',s)
 if '/campus/' in p.as_posix():
  s=re.sub(r'\btext-white\b','text-[var(--text-primary)]',s)
  s=re.sub(r'bg-(?:purple|indigo|sky|amber|emerald|orange|blue|pink)-[456]00\b(?!/)','bg-[var(--accent)] text-[var(--on-accent)]',s)
 s=s.replace('catch (err: any)', 'catch (err: unknown)')
 s=re.sub(r'err\.message \|\|', "(err instanceof Error ? err.message : '') ||", s)
 p.write_text(s,encoding='utf-8')
p=root/'app/globals.css'
s=p.read_text()
s=s[s.index('* {'):]
s=re.sub(r'/\* Background Atmosphere Glow \*/.*?/\* Scrollbars \*/','/* Scrollbars */',s,flags=re.S)
s=re.sub(r'font-size: ([\d.]+)px;',lambda m:f'font-size: {max(float(m[1]),12)/15:.3f}rem;',s)
s=s.replace('transition: all ', 'transition: background-color ')
s=re.sub(r'backdrop-filter: blur\([^;]+\);','backdrop-filter: none;',s)
s=re.sub(r'rgba\((?:99, 102, 241|79, 70, 229), [\d.]+\)', 'var(--accent-light)',s)
s=re.sub(r'rgba\((?:14, 21, 38|18, 28, 50|10, 15, 28|10, 16, 30|0, 0, 0), [\d.]+\)', 'var(--bg-tertiary)',s)
s=re.sub(r'rgba\(255, 255, 255, [\d.]+\)', 'var(--border-subtle)',s)
s=re.sub(r'#(?:a5b4fc|c7d2fe)', 'var(--accent)',s)
s=re.sub(r'box-shadow: [^;]+;', 'box-shadow: none;',s)
s=re.sub(r'  background: linear-gradient[^;]+;\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;', '  color: var(--text-primary);',s)
s=s.replace('height: 100vh;', 'height: 100dvh;').replace('width: 100vw;', 'width: 100%;')
header='''@import "tailwindcss/theme" layer(theme);
@import "tailwindcss/utilities" layer(utilities);
@source "../";

/* KamandChat: campus paper, pine ink, humanist typography. */
:root {
  color-scheme: light;
  --bg-primary: #faf9f5;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f0f0e8;
  --bg-elevated: #ffffff;
  --bg-glass: #f6f5ef;
  --bg-glass-card: #f0f0e8;
  --bg-glass-hover: #eaece3;
  --bg-glass-active: #e2e8df;
  --text-primary: #24372f;
  --text-secondary: #526258;
  --text-muted: #637067;
  --text-white: #ffffff;
  --border-subtle: #dee3d9;
  --border-medium: #bec9bd;
  --accent: #245b49;
  --accent-hover: #194334;
  --on-accent: #ffffff;
  --accent-light: color-mix(in srgb, var(--accent) 10%, var(--bg-secondary));
  --accent-gradient: var(--accent);
  --accent-gradient-bubble: var(--accent);
  --border-glow: var(--accent);
  --border-focus: var(--accent);
  --bubble-received: #eceee7;
  --success: #287044;
  --success-light: #e2eee2;
  --warning: #94601f;
  --warning-light: #f6ead6;
  --danger: #b13d43;
  --danger-light: #f9e5e4;
  --shadow-sm: 0 2px 8px #162d1710;
  --shadow-md: 0 8px 24px #162d1718;
  --shadow-lg: 0 24px 70px #162d1726;
  --glow-accent: none;
  --glow-success: none;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  --font-sans: 'DM Sans', 'Segoe UI', sans-serif;
  --transition-fast: 160ms cubic-bezier(.16,1,.3,1);
  --transition-normal: 240ms cubic-bezier(.16,1,.3,1);
  --transition-bounce: 280ms cubic-bezier(.16,1,.3,1);
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg-primary: #141e1a;
  --bg-secondary: #1b2922;
  --bg-tertiary: #24352c;
  --bg-elevated: #2b3c32;
  --bg-glass: #19251f;
  --bg-glass-card: #24352c;
  --bg-glass-hover: #2a3d32;
  --bg-glass-active: #314939;
  --text-primary: #edf2e8;
  --text-secondary: #bbc8bc;
  --text-muted: #a3b3a6;
  --border-subtle: #37493c;
  --border-medium: #526751;
  --accent: #a9d3ad;
  --accent-hover: #c1e6c4;
  --on-accent: #142a1e;
  --bubble-received: #27392e;
  --success: #a2d7af;
  --success-light: #243b2d;
  --warning: #e3bf85;
  --warning-light: #3b3223;
  --danger: #f0aaa6;
  --danger-light: #412b2b;
}
:root[data-accent="clay"] { --accent: #8d4938; --accent-hover: #71392b; }
:root[data-accent="lake"] { --accent: #2c607d; --accent-hover: #224960; }
:root[data-theme="dark"][data-accent="clay"] { --accent: #edb09a; --accent-hover: #f2c9b8; }
:root[data-theme="dark"][data-accent="lake"] { --accent: #9fcfe6; --accent-hover: #c3e5f5; }
'''
p.write_text(header+s,encoding='utf-8')
# Wiring.
p=root/'app/layout.tsx';s=p.read_text();s=s.replace("import './globals.css';", "import './globals.css';\nimport { VisualSettingsProvider } from '@/components/settings/VisualSettings';")
s=s.replace('Plus+Jakarta+Sans:wght@400;500;600;700;800','DM+Sans:wght@400;500;600;700')
s=s.replace('<body>{children}</body>','<body><VisualSettingsProvider>{children}</VisualSettingsProvider></body>');p.write_text(s)
p=root/'components/sidebar/Sidebar.tsx';s=p.read_text();s=s.replace("import { Avatar }", "import { useVisualSettings } from '@/components/settings/VisualSettings';\nimport { Avatar }")
s=s.replace("  const { user, profile } = useAuth();", "  const { user, profile } = useAuth();\n  const { openSettings } = useVisualSettings();")
s=s.replace('onClick={() => setIsProfileModalOpen(true)}\n            className="btn-icon btn-ghost"\n            title="Profile & Settings"','onClick={openSettings}\n            className="btn-icon btn-ghost"\n            aria-label="Visual settings"\n            title="Visual settings"')
s=s.replace('className="user-profile-preview"','className="user-profile-preview"\n            role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsProfileModalOpen(true); } }}')
s=s.replace('className={`conversation-item ${isActive', 'role="button" tabIndex={0} aria-disabled={!!joiningSlug} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleJoinCampusRoom(room); } }}\n                    className={`conversation-item ${isActive')
s=s.replace('    setJoiningSlug(room.slug);','    if (joiningSlug) return;\n    setJoiningSlug(room.slug);')
s=s.replace('placeholder="Search','aria-label="Search conversations and campus rooms"\n              placeholder="Search')
p.write_text(s)
