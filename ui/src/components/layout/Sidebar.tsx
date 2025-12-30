import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Rocket,
  AlertTriangle,
  ClipboardList,
  GitBranch,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/entities', icon: Rocket, label: 'Entities' },
  { to: '/conflicts', icon: AlertTriangle, label: 'Conflicts' },
  { to: '/review', icon: ClipboardList, label: 'Review Queue' },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { to: '/sources', icon: Database, label: 'Sources' },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-64 border-r bg-background">
      <nav className="space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
