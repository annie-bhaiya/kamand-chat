from pathlib import Path
import re

root = Path('client/src')
def edit(path, fn):
    p = root / path
    source = p.read_text(encoding='utf-8')
    result = fn(source)
    if result != source:
        p.write_text(result, encoding='utf-8')

# Opaque semantic surfaces keep the same contrast in every appearance.
for path in ['components/profile/UserProfileModal.tsx', 'components/group/GroupInfoDrawer.tsx',
             'components/chat/EmbeddedChatSearch.tsx', 'components/chat/EmbeddedAttachmentsGrid.tsx']:
    def surfaces(s):
        for value in ['rgba(0, 0, 0, 0.25)', 'rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.15)',
                      'rgba(0, 0, 0, 0.12)', 'rgba(0, 0, 0, 0.35)', 'rgba(255, 255, 255, 0.04)',
                      'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.06)']:
            s = s.replace(value, 'var(--bg-tertiary)')
        s = s.replace('rgba(255, 255, 255, 0.08)', 'var(--bg-glass-hover)')
        s = s.replace('rgba(234, 179, 8, 0.35)', 'var(--warning-light)').replace('#fef08a', 'var(--warning)')
        s = s.replace("color: '#38bdf8'", "color: 'var(--accent)'").replace("color: '#f59e0b'", "color: 'var(--accent)'")
        s = s.replace("fontFamily: 'monospace'", "fontFamily: 'inherit'")
        return s
    edit(path, surfaces)

def header(s):
    # Shared button states replace five conflicting one-off appearances.
    s = re.sub(r'\s+style=\{\{\s+padding: \'6px 10px\',[\s\S]*?\}\}', '', s)
    s = s.replace("backgroundColor: 'rgba(234, 179, 8, 0.15)'", "backgroundColor: 'var(--warning-light)'")
    s = s.replace("color: '#facc15'", "color: 'var(--warning)'")
    s = s.replace("border: '1px solid rgba(234, 179, 8, 0.3)'", "border: '1px solid var(--warning-light)'")
    s = s.replace('className="text-rose-400"', 'className="text-[var(--accent)]"')
    s = s.replace("color: 'var(--text-primary)',\n              cursor:", "color: 'var(--on-accent)',\n              cursor:")
    s = s.replace('title="Back to conversation list"', 'aria-label="Back to conversation list"\n          title="Back to conversation list"')
    return s
edit('components/chat/ChatHeader.tsx', header)

def sidebar(s):
    start = s.index('          {/* Category Switcher')
    before, after = s[:start], s[start:]
    before = before.replace('className="btn btn-ghost"', 'className="btn btn-secondary sidebar-tool"')
    before = re.sub(r"\s+background: '[^']+',\n\s+color: 'var\(--accent\)',\n\s+border: '[^']+',", '', before)
    # The new-chat action inherits its hover background as well.
    before = before.replace("                background: 'var(--accent)',\n", '')
    s = before + after
    s = re.sub(r"\s+border: isActive\n\s+\? '[^']+'\n\s+: '[^']+',\n\s+background: isActive\n\s+\? '[^']+'\n\s+: '[^']+',", '', s)
    s = re.sub(r"background: 'linear-gradient\(135deg,[^']+'", "background: 'var(--bg-tertiary)'", s)
    s = s.replace("background: 'var(--border-subtle)'", "background: 'var(--bg-tertiary)'")
    for color in ['#f59e0b', '#10b981', '#34d399', '#fcd34d']:
        s = s.replace(color, 'var(--accent)' if color == '#10b981' else ('var(--success)' if color == '#34d399' else 'var(--warning)'))
    s = s.replace('rgba(245, 158, 11, 0.12)', 'var(--warning-light)')
    s = s.replace("fontFamily: 'monospace'", "fontFamily: 'inherit'")
    s = s.replace('type="text"\n                placeholder=', 'type="search"\n                aria-label="Search conversations and campus rooms"\n                placeholder=')
    return s
edit('components/sidebar/Sidebar.tsx', sidebar)

def message(s):
    s = s.replace("style={{ maxWidth: '100%', position: 'relative' }}", '')
    s = s.replace('<div style={{ minWidth: \'220px\' }}>', '<div className="message-edit">')
    s = s.replace('className="composer-input"', 'aria-label="Edit message"\n                className="input-control message-edit-input"')
    s = re.sub(r'\s+style=\{\{\s+width: \'100%\',\s+background: \'rgba\(0, 0, 0, 0.3\)\',[\s\S]*?\}\}', '', s)
    # Finish pending timers when a row is unmounted.
    s = s.replace('  // Close actions menu', '  useEffect(() => () => {\n    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);\n  }, []);\n\n  // Close actions menu')
    return s
edit('components/chat/MessageItem.tsx', message)

def composer(s):
    s = s.replace("          style={{ width: '32px', height: '32px' }}\n", '')
    s = s.replace('title="Add emoji"', 'aria-label="Add emoji"\n          aria-expanded={showEmojiPicker}\n          title="Add emoji"')
    s = s.replace('title="Send message"', 'aria-label="Send message"\n          title="Send message"')
    return s
edit('components/chat/MessageComposer.tsx', composer)
edit('components/campus/ResidenceOnboardingModal.tsx', lambda s: s.replace('1px solid rgba(var(--accent-rgb, 16, 185, 129), 0.2)', '1px solid var(--border-subtle)').replace("color: '#fff'", "color: 'var(--on-accent)'"))
edit('components/profile/ProfileModal.tsx', lambda s: s.replace("background: 'var(--border-subtle)'", "background: 'var(--bg-tertiary)'"))

def css(s):
    s = s.replace('.sidebar-header { flex-wrap: wrap; gap: 20px; padding: 24px 20px 16px;', '.sidebar-header { flex-wrap: wrap; gap: 14px; padding: 18px 16px 12px;')
    s = s.replace('.conversation-item { min-height: 72px;', '.conversation-item { min-height: 64px;')
    s = s.replace('.chat-header { min-height: 78px; height: auto; flex-shrink: 0; padding: 16px 28px;', '.chat-header { min-height: 68px; height: auto; flex-shrink: 0; padding: 12px 20px;')
    s = s.replace('padding: 28px clamp(16px, 3.5vw, 60px)', 'padding: 16px clamp(12px, 2vw, 28px)')
    s = s.replace('.message-row { max-width: min(78%, 680px); margin-top: 14px; }', '.message-row { max-width: min(82%, 680px); margin-top: 8px; }')
    s = s.replace('line-height: 1.6; border-radius: 12px; padding: 11px 16px;', 'line-height: 1.5; border-radius: 12px; padding: 8px 12px;')
    s = s.replace('.message-meta { color: inherit; opacity: .8;', '.message-meta { color: inherit; opacity: 1;')
    s = s.replace('padding: 12px 28px 24px; background: var(--bg-primary)', 'padding: 10px 20px 14px; background: var(--bg-primary)')
    s = s.replace('align-items: center; padding: 10px 12px; border-radius: 12px;', 'align-items: flex-end; padding: 6px 8px; border-radius: 12px;')
    s = s.replace('.composer-input { font-size: 1rem; min-width: 0; }', '.composer-input { font-size: 1rem; line-height: 1.5; min-width: 0; padding: 7px 2px; }\n.composer-input:focus-visible { outline: none; }')
    s = s.replace('.message-actions-trigger { display: none !important; }', '.message-actions-trigger { opacity: 1; pointer-events: auto; width: 36px; height: 36px; min-width: 36px; min-height: 36px; }')
    s = s.replace('    left: 16px;\n    right: 16px;', '    left: 12px;\n    right: 12px;')
    s = s.replace('    padding: 16px;\n    box-shadow: var(--shadow-lg);', '    padding: 12px;\n    box-shadow: var(--shadow-lg);')
    s = s.replace('    justify-content: space-around;', '    justify-content: space-between;\n    flex-wrap: wrap;')
    s = s.replace('    gap: 8px;\n    width: 100%;\n  }\n  .message-actions-tools', '    gap: 8px;\n    flex-wrap: wrap;\n    width: 100%;\n  }\n  .message-actions-tools')
    s = s.replace('[data-density="compact"] .message-row { margin-top: 8px; }', '[data-density="compact"] .message-row { margin-top: 5px; }')
    return s
edit('app/globals.css', css)

for path in ['components/chat/MessageItem.tsx', 'components/chat/MessageList.tsx']:
    edit(path, lambda s: s.replace('ConversationMember,Message', 'ConversationMember,Message,Profile').replace('ConversationMember }', 'ConversationMember, Profile }').replace('ConversationMember,Message,Profile,Profile', 'ConversationMember,Message,Profile').replace('profile?: any', 'profile?: Partial<Profile> | null'))

def profile_lifecycle(s):
    s = s.replace('export const UserProfileModal: React.FC<UserProfileModalProps> = ({', '''export const UserProfileModal: React.FC<UserProfileModalProps> = (props) =>
  props.isOpen ? <UserProfileContent key={props.userId || props.initialProfile?.id || 'profile'} {...props} /> : null;

const UserProfileContent: React.FC<UserProfileModalProps> = ({''')
    s = s.replace("    // Set initial data if passed\n    if (initialProfile) {\n      setProfileData(initialProfile);\n    }\n", '')
    s = s.replace('} catch (err) {\n        // Fallback', '} catch {\n        // Fallback')
    s = re.sub(r'  // Reset tab on open\n  useEffect\([\s\S]*?\}, \[isOpen\]\);\n', '', s)
    return s
edit('components/profile/UserProfileModal.tsx', profile_lifecycle)

def group_lifecycle(s):
    s = s.replace('export const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({', '''export const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = (props) => {
  const { activeConversation } = useChat();
  return props.isOpen ? <GroupInfoContent key={activeConversation?.id} {...props} /> : null;
};

const GroupInfoContent: React.FC<GroupInfoDrawerProps> = ({''')
    s = re.sub(r'  // Reset tab on open\n  useEffect\([\s\S]*?\}, \[isOpen, activeConversation\?\.title\]\);\n', '', s)
    return s
edit('components/group/GroupInfoDrawer.tsx', group_lifecycle)

def sidebar_lifecycle(s):
    s = s.replace('  Sparkles,\n', '')
    s = s.replace("const [mainTab, setMainTab] = useState<MainTab>('dms');", "const [selectedTab, setMainTab] = useState<MainTab>('dms');\n  const mainTab = profile?.chat_only && ['hostels', 'messes', 'branches'].includes(selectedTab) ? 'dms' : selectedTab;")
    s = re.sub(r'  // If in chat-only mode[\s\S]*?\}, \[profile\?\.chat_only, mainTab\]\);\n', '', s)
    s = s.replace('}, [profile?.branch]);', '}, [profile]);')
    return s
edit('components/sidebar/Sidebar.tsx', sidebar_lifecycle)

def settings_lifecycle(s):
    s = s.replace('Sun,Building,UtensilsCrossed', 'Sun,Building')
    s = re.sub(r'  useEffect\(\(\) => \{\n    if \(auth\?\.profile\) \{[\s\S]*?\}, \[auth\?\.profile\?\.branch[^\n]*\n', '', s)
    s = s.replace('catch (err: any)', 'catch (err: unknown)')
    s = s.replace("err?.message || 'Failed to update residence details.'", "err instanceof Error ? err.message : 'Failed to update residence details.'")
    s = s.replace("err?.message || 'Failed to update preferences.'", "err instanceof Error ? err.message : 'Failed to update preferences.'")
    return s
edit('components/settings/VisualSettings.tsx', settings_lifecycle)
