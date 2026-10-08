from pathlib import Path
for p in Path('client/src/components/campus').glob('*.tsx'):
 s=p.read_text();s=s.replace('useEffectEvent, useEffectEvent','useEffectEvent');s=s.replace('  const [now] = useState(() => Date.now());\n  const [now] = useState(() => Date.now());','  const [now] = useState(() => Date.now());');p.write_text(s)
