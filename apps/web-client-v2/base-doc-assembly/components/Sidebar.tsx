import React from 'react';
import { Screen } from '../types';
import { LayoutGrid, FileText, FolderOpen, Settings, LogOut, Box } from 'lucide-react';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: Screen.DASHBOARD, label: 'Dashboard', icon: LayoutGrid },
    { id: Screen.TEMPLATES, label: 'Templates', icon: FileText },
    { id: Screen.DOCUMENTS, label: 'Documents', icon: FolderOpen },
    { id: Screen.SETTINGS, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-100 flex flex-col justify-between py-8 px-6">
      <div>
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-8 h-8 flex items-center justify-center border-2 border-black text-black">
            <Box size={16} fill="currentColor" className="text-black" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight uppercase">Doc-Assembly</span>
        </div>

        <div className="mb-8 px-2">
          <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-2 block">
            Current Workspace
          </label>
          <div className="font-display font-medium text-lg text-black truncate">
            Acme Legal Corp.
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-4 px-3 py-3 text-sm font-medium transition-colors group rounded-md
                  ${isActive ? 'text-black bg-gray-50' : 'text-gray-400 hover:text-black hover:bg-gray-50'}
                `}
              >
                <item.icon 
                  size={20} 
                  strokeWidth={1.5}
                  className={isActive ? 'text-black' : 'text-gray-400 group-hover:text-black'} 
                />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-2">
        <button 
          onClick={() => onNavigate(Screen.LOGIN)}
          className="flex items-center gap-3 text-gray-400 hover:text-black transition-colors text-sm font-medium group"
        >
          <LogOut size={20} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform" />
          Logout
        </button>
        <div className="mt-8 pt-4 border-t border-gray-100">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                    JD
                </div>
                <div>
                    <div className="text-xs font-semibold">jdoe@acme.inc</div>
                    <div className="text-[10px] text-gray-400 uppercase">Administrator</div>
                </div>
             </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;