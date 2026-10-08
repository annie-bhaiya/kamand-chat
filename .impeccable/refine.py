from pathlib import Path
p=Path('client/src/app/globals.css');s=p.read_text();s=s.replace('@import "tailwindcss/theme"','@layer theme, base, components, utilities;\n@import "tailwindcss/theme"',1);start=s.index('* {');end=s.index('\n}',start)+2;s=s[:start]+'@layer base {\n'+s[start:end]+'\n}'+s[end:];p.write_text(s)
p=Path('client/src/components/chat/ChatArea.tsx');s=p.read_text();start=s.index('        <div className="empty-state"');end=s.index('\n      </main>',start);s=s[:start]+'''        <div className="empty-state campus-welcome">
          <MessageSquare size={42} strokeWidth={1.4} />
          <h2 className="empty-state-title">A conversation away.</h2>
          <p className="empty-state-desc">Find your people, share a thought, or make a plan. Choose a conversation or start something new.</p>
          <button onClick={onOpenNewChat} className="btn btn-primary"><Plus size={17} />New conversation</button>
          <div className="welcome-tools">
            <button onClick={() => onOpenCalendar?.()} className="btn btn-ghost">Campus calendar</button>
            <button onClick={() => onOpenMessMenu?.()} className="btn btn-ghost">Today’s mess menu</button>
          </div>
        </div>'''+s[end:];s=s.replace('  ShieldCheck,\n  Zap,\n  Lock,\n','');p.write_text(s)
p=Path('client/src/lib/utils.ts');s=p.read_text();start=s.index('const GRADIENTS = [');end=s.index('\n];',start)+3;s=s[:start]+"const GRADIENTS = ['#456755', '#486d78', '#876451', '#68684b', '#665e7c', '#4e7069'];"+s[end:];p.write_text(s)
p=Path('client/src/components/campus/MessMenuDrawer.tsx');s=p.read_text();start=s.index('  >([');end=s.index('\n  ]);',start)+len('\n  ]);');s=s[:start]+'  >([]);'+s[end:];s=s.replace("status: 'Submitted (Pending Caretaker Review)'", "status: 'Local draft — not submitted'");s=s.replace('success(`Mess rebate application for ${days} days submitted successfully!`);',"success('Draft saved for this visit. Submit your request through the official mess office.');")
s=s.replace('Rebate Portal', 'Rebate draft');s=s.replace('Submit Application', 'Save local draft');s=s.replace('Submit Rebate Application', 'Save local draft');p.write_text(s)
