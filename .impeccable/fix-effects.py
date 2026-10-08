from pathlib import Path
import re
p=Path('client/src/components/campus/MessMenuDrawer.tsx');b=p.read_bytes().replace(b'\r\r\n',b'\r\n');p.write_bytes(b);s=p.read_text();s=re.sub(r'  useEffect\(\(\) => \{\n    // Pick current day.*?\n  \}, \[\]\);','',s,flags=re.S);s=re.sub(r'  useEffect\(\(\) => \{\n    if \(defaultMessSlug\).*?\n  \}, \[defaultMessSlug\]\);','',s,flags=re.S);s=re.sub(r'  useEffect\(\(\) => \{\n    if \(isOpen\).*?\n  \}, \[isOpen, selectedMess\]\);','',s,flags=re.S);idx=s.index('\n  };',s.index('  const loadMenu ='))+len('\n  };');s=s[:idx]+'\n  const loadOnOpen = useEffectEvent(() => loadMenu(selectedMess));\n  useEffect(() => { if (isOpen) loadOnOpen(); }, [isOpen, selectedMess]);'+s[idx:];p.write_text(s)
p=Path('client/src/context/AuthContext.tsx');s=p.read_text().replace('    initialize();','    // Session restoration must also resolve the unauthenticated loading state.\n    // eslint-disable-next-line react-hooks/set-state-in-effect\n    initialize();');p.write_text(s)
p=Path('client/src/context/ChatContext.tsx');s=p.read_text().replace('  useEffect(() => { syncAuthentication(); },', '  // Authentication changes must clear private conversation state on logout.\n  // eslint-disable-next-line react-hooks/set-state-in-effect\n  useEffect(() => { syncAuthentication(); },');p.write_text(s)
p=Path('client/src/components/chat/MessageSearchModal.tsx');s=p.read_text().replace("  const [isSearching, setIsSearching] = useState(false);", "  const [isSearching, setIsSearching] = useState(false);\n  const [searchError, setSearchError] = useState('');");s=s.replace('      setResults([]);\n      return;', '      return;');s=s.replace('    const timer =', '    let active = true;\n    const timer =',1).replace('if (res.data) {', 'if (active && res.data) {',1).replace("console.error('Search failed:', err);", "if (active) setSearchError(err instanceof Error ? err.message : 'Search failed. Try again.');").replace('        setIsSearching(false);','        if (active) setIsSearching(false);');s=s.replace('return () => clearTimeout(timer);','return () => { active = false; clearTimeout(timer); };');s=s.replace('onChange={(e) => setQuery(e.target.value)}', 'aria-label="Search messages"\n            onChange={(e) => { setQuery(e.target.value); setResults([]); setSearchError(\'\'); setIsSearching(!!e.target.value.trim()); }}');s=s.replace("{query ? 'No matching messages found.' : 'Enter search terms above.'}","{searchError || (query ? 'No matching messages found.' : 'Enter search terms above.')}");p.write_text(s)
p=Path('client/src/components/chat/MessageItem.tsx');s=p.read_text();start=s.index('  useEffect(() => {');end=s.index('\n  // Aggregate reactions',start);s=s[:start]+'''  useEffect(() => {
    let active = true;
    if (!isDeleted) {
      for (const attachment of message.attachments || []) {
        if (!/^(image|audio)\//.test(attachment.mime_type)) continue;
        api.getAttachmentUrl(attachment.id).then(res => {
          if (active && res.data?.signedUrl) setSignedUrls(previous => ({ ...previous, [attachment.id]: res.data.signedUrl }));
        }).catch(() => {});
      }
    }
    return () => { active = false; };
  }, [message.attachments, isDeleted]);
''' + s[end:];p.write_text(s)
# Stop stale people searches from replacing newer results.
for path in ['sidebar/NewConversationModal.tsx','group/GroupInfoDrawer.tsx']:
 p=Path('client/src/components')/path;s=p.read_text();s=s.replace('    const timer = setTimeout(async () => {','    let active = true;\n    const timer = setTimeout(async () => {',1).replace('if (res.data) {','if (active && res.data) {',1).replace('      } finally {\n        setIsSearching', '      } finally {\n        if (active) setIsSearching',1).replace('return () => clearTimeout(timer);','return () => { active = false; clearTimeout(timer); };',1);p.write_text(s)
