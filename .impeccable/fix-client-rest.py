from pathlib import Path
import re
root=Path('client/src')
p=root/'components/chat/MessageComposer.tsx';s=p.read_text().replace('Promise<any>', 'Promise<unknown>');p.write_text(s)
p=root/'components/auth/AuthCard.tsx';s=p.read_text().replace("import React,", "import Link from 'next/link';\nimport React,").replace('<a href="/"', '<Link href="/"').replace('</small></span></a>', '</small></span></Link>');p.write_text(s)
p=root/'components/chat/ChatHeader.tsx';s=p.read_text().replace(" || currentMember?.role === 'admin'",'').replace('online={true}', 'online={false}');p.write_text(s)
p=root/'components/settings/VisualSettings.tsx';s=p.read_text();s=re.sub(r'root.dataset.(\w+) = (.*?);',lambda m: "root.setAttribute('data-"+re.sub(r'([A-Z])',lambda x:'-'+x[1].lower(),m[1])+"', "+m[2]+");",s);p.write_text(s)
# Mount form panels only while open, so default values are initial state, never effect resets.
p=root/'app/page.tsx';s=p.read_text();
for comp,state in [('GymkhanaCalendarModal','isCalendarOpen'),('CampusTicketDrawer','isTicketDrawerOpen'),('MoodleDrawer','isMoodleDrawerOpen'),('MessMenuDrawer','isMessDrawerOpen')]:
 s=re.sub(r'      <'+comp+r'\b(.*?)\n      />',lambda m:'      {'+state+' && <'+comp+m[1]+'\n      />} ',s,flags=re.S)
p.write_text(s)
for name,loader,deps in [('CampusTicketDrawer','loadTickets','isOpen, activeScope'),('GymkhanaCalendarModal','loadEvents','isOpen, selectedVenue, selectedCategory'),('MoodleDrawer','loadAssignments','isOpen, courseCode'),('MessMenuDrawer','loadMenu','isOpen, selectedMess')]:
 p=root/f'components/campus/{name}.tsx';s=p.read_text();s=s.replace('useState, useEffect', 'useState, useEffect, useEffectEvent');
 # Remove prop synchronization effects (mount now establishes defaults).
 s=re.sub(r'  useEffect\(\(\) => \{\n    if \(default.*?\n  \}, \[default.*?\]\);\n','',s,flags=re.S)
 if name=='MessMenuDrawer':
  s=s.replace("useState<string>('Monday')", "useState<string>(() => new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }))")
  s=re.sub(r'  useEffect\(\(\) => \{\n    // Pick current day.*?\n  \}, \[\]\);','',s,flags=re.S)
 # Move loading effects after function definition and call through effect event.
 match=re.search(r'  useEffect\(\(\) => \{\n    if \(isOpen\) \{\n      (\w+)\((.*?)\);\n    \}\n  \}, \[(.*?)\]\);',s)
 if match:
  fn,args,dep=match.groups();s=s[:match.start()]+s[match.end():];idx=s.index('\n  };',s.index('  const '+fn+' ='))+len('\n  };');s=s[:idx]+f'\n  const loadOnOpen = useEffectEvent(() => {fn}({args}));\n  useEffect(() => {{ if (isOpen) loadOnOpen(); }}, [{dep}]);'+s[idx:]
 s=s.replace('const res: any =', 'const res =').replace('if (res.warning)', "if ('warning' in res && typeof res.warning === 'string')")
 s=s.replace('setScope(e.target.value as any)', "setScope(e.target.value as 'hostel' | 'mess')").replace('setCampus(e.target.value as any)', "setCampus(e.target.value as 'North' | 'South')").replace('setVenue(e.target.value as any)', "setVenue(e.target.value as CampusEvent['venue'])").replace('setCategory(e.target.value as any)', "setCategory(e.target.value as CampusEvent['category'])")
 if name=='MoodleDrawer':
  s=s.replace("  const [syncing, setSyncing]", "  const [now] = useState(() => Date.now());\n  const [syncing, setSyncing]").replace('due.getTime() < Date.now()', 'due.getTime() < now')
 p.write_text(s)
p=root/'components/profile/ProfileModal.tsx';s=p.read_text().replace("useState('')", "useState(profile?.display_name || '')",1).replace('useState<string | null>(null)', 'useState<string | null>(profile?.avatar_key || null)',1);s=re.sub(r'  useEffect\(\(\) => \{.*?\n  \}, \[profile, isOpen\]\);','',s,count=1,flags=re.S);p.write_text(s)
p=root/'components/sidebar/Sidebar.tsx';s=p.read_text();s=re.sub(r'      <ProfileModal\b(.*?)\n      />',r'      {isProfileModalOpen && <ProfileModal\1\n      />}',s,flags=re.S);p.write_text(s)
p=root/'components/group/GroupInfoDrawer.tsx';s=p.read_text().replace("const [newTitle, setNewTitle] = useState('');", "const [newTitle, setNewTitle] = useState(activeConversation?.title || '');");s=re.sub(r'  useEffect\(\(\) => \{.*?\n  \}, \[activeConversation, isOpen\]\);','',s,count=1,flags=re.S);p.write_text(s)
p=root/'components/chat/ChatArea.tsx';s=p.read_text().replace("activeConversation.type === 'group' && (", "activeConversation.type === 'group' && isInfoOpen && (");p.write_text(s)
