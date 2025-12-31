import React from 'react';
import { ArrowRight, ArrowLeft, Search, Box } from 'lucide-react';
import { Workspace } from '../types';

interface WorkspaceSelectProps {
  onSelect: () => void;
  onBack: () => void;
}

const workspaces: Workspace[] = [
  { id: '1', name: 'Acme Legal Corp', lastAccessed: '2 mins ago', users: 12 },
  { id: '2', name: 'Global Finance Ltd', lastAccessed: '3 days ago', users: 8 },
  { id: '3', name: 'Northeast Litigation', lastAccessed: '1 week ago', users: 24 },
  { id: '4', name: 'Orion Properties', lastAccessed: '2 weeks ago', users: 5 },
];

const WorkspaceSelect: React.FC<WorkspaceSelectProps> = ({ onSelect, onBack }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center relative">
       <div className="absolute top-8 left-6 md:left-12 lg:left-32 flex items-center gap-3">
        <div className="w-6 h-6 flex items-center justify-center border-2 border-black text-black">
          <Box size={12} fill="currentColor" />
        </div>
        <span className="text-black font-display text-sm font-bold tracking-tight uppercase">Doc-Assembly</span>
      </div>

      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-32 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start py-24">
        
        <div className="lg:col-span-4 lg:sticky lg:top-32">
          <h1 className="text-5xl md:text-6xl font-display font-light text-black tracking-tighter leading-[1.05] mb-8">
            Select your<br/>
            <span class="font-semibold">Organization.</span>
          </h1>
          <p className="text-gray-400 font-light text-lg max-w-sm leading-relaxed mb-12">
            Choose a tenant environment to access your document templates and assembly tools.
          </p>
           <button 
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm font-mono text-gray-400 hover:text-black transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back to login</span>
            </button>
        </div>

        <div className="lg:col-span-8 flex flex-col justify-center">
          <div className="relative w-full mb-8 group">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors pointer-events-none" size={20} />
            <input 
              type="text" 
              placeholder="Filter by organization..." 
              className="w-full bg-transparent border-b border-gray-100 py-3 pl-10 pr-4 text-xl font-display text-black placeholder:text-gray-200 outline-none focus:border-black focus:ring-0 transition-colors bg-white rounded-none"
            />
          </div>

          <div className="flex flex-col w-full">
            {workspaces.map((ws) => (
              <button 
                key={ws.id}
                onClick={onSelect}
                className="group relative flex items-center justify-between w-full py-6 px-4 border border-transparent border-b-gray-50 hover:border-black hover:bg-gray-50 transition-all duration-200 outline-none -mb-px hover:z-10 rounded-sm"
              >
                <h3 className="text-xl md:text-2xl font-display font-medium text-black tracking-tight group-hover:translate-x-2 transition-transform duration-300 text-left">
                  {ws.name}
                </h3>
                <div className="flex items-center gap-6 md:gap-8">
                  <span className="text-[10px] md:text-xs font-mono text-gray-300 group-hover:text-gray-500 whitespace-nowrap transition-colors">
                    Last accessed: {ws.lastAccessed}
                  </span>
                  <ArrowRight className="text-gray-300 group-hover:text-black transition-colors group-hover:translate-x-1 duration-300" size={24} />
                </div>
              </button>
            ))}
          </div>

           <div className="mt-12 pt-8 border-t border-gray-50">
            <button className="group w-full py-4 px-6 border border-dashed border-gray-200 hover:border-black hover:bg-gray-50 transition-all duration-200 outline-none rounded-sm opacity-60 hover:opacity-100 flex items-center gap-4">
               <div className="w-6 h-6 flex items-center justify-center border border-gray-300 group-hover:border-black rounded-full transition-colors font-light text-lg pb-1">
                 +
               </div>
               <span className="text-lg font-display font-medium text-gray-400 group-hover:text-black tracking-tight transition-colors">Join New Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSelect;