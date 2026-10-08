from pathlib import Path
for p in Path('client/src').rglob('*'):
 if p.suffix in ['.tsx','.ts','.css']:
  try: p.read_text(encoding='utf-8')
  except UnicodeDecodeError: p.write_text(p.read_bytes().decode('cp1252'),encoding='utf-8')
