import React from 'react';
import { X, CheckCircle, TriangleAlert, Edit2, Plus, ArrowRight } from 'lucide-react';

const Settings: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <header className="sticky top-0 left-0 w-full bg-white/95 backdrop-blur-sm z-30 border-b border-gray-100">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest">
              <a href="#" className="text-gray-400 hover:text-black transition-colors">Hub</a>
              <span className="text-gray-300">/</span>
              <span className="text-black font-semibold">Settings</span>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-[10px] font-mono text-gray-400 uppercase hidden md:block">v2.4 — Secure</div>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pt-20 pb-24">
        <div className="mb-16 md:mb-20 max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-light text-black tracking-tight leading-[1.1] mb-6">
            Workspace<br/><span className="font-semibold">Configuration.</span>
          </h1>
          <p className="text-lg md:text-xl font-light text-gray-500 max-w-2xl leading-relaxed">
            Manage environment variables, access controls, and injection sources for your document assembly workflows.
          </p>
        </div>

        <form className="w-full border-t border-gray-100">
          
          {/* Section 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-12 border-b border-gray-100">
            <div className="lg:col-span-4 pr-8">
              <h3 className="font-display font-medium text-xl text-black mb-2">Workspace Type</h3>
              <p className="text-xs font-mono text-gray-400 uppercase tracking-widest leading-relaxed">
                Defines resource allocation limits and environment behavior.
              </p>
            </div>
            <div className="lg:col-span-8 space-y-10">
              <div className="group">
                <label className="block text-xs font-mono font-medium text-gray-400 mb-4 uppercase tracking-widest">Environment Mode</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="relative cursor-pointer group/item flex-1">
                    <input type="radio" name="workspace_type" className="peer sr-only" />
                    <div className="h-full border border-gray-200 p-5 peer-checked:border-black peer-checked:bg-black peer-checked:text-white hover:border-gray-400 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display font-bold text-lg">Development</span>
                        <CheckCircle size={18} className="opacity-0 peer-checked:opacity-100" />
                      </div>
                      <p className="text-xs font-mono opacity-60 uppercase tracking-widest">Sandbox & Testing</p>
                    </div>
                  </label>
                  <label className="relative cursor-pointer group/item flex-1">
                    <input type="radio" name="workspace_type" className="peer sr-only" defaultChecked />
                    <div className="h-full border border-gray-200 p-5 peer-checked:border-black peer-checked:bg-black peer-checked:text-white hover:border-gray-400 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display font-bold text-lg">Production</span>
                        <CheckCircle size={18} className="opacity-0 peer-checked:opacity-100" />
                      </div>
                      <p className="text-xs font-mono opacity-60 uppercase tracking-widest">Live Deployment</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-12 border-b border-gray-100">
            <div className="lg:col-span-4 pr-8">
              <h3 className="font-display font-medium text-xl text-black mb-2">Member Management</h3>
              <p className="text-xs font-mono text-gray-400 uppercase tracking-widest leading-relaxed">
                Configure how new users interact with this workspace.
              </p>
            </div>
            <div className="lg:col-span-8 space-y-12">
              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex-1 pr-8">
                  <label className="block text-lg font-light text-black mb-1 group-hover:text-gray-600 transition-colors">Allow Guest Access</label>
                  <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">Permit view-only access via shared links</p>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-14 h-8 bg-gray-100 peer-focus:outline-none rounded-none border border-gray-200 peer peer-checked:bg-black peer-checked:border-black transition-colors duration-300"></div>
                  <div className="absolute left-1 top-1 bg-white border border-gray-200 h-6 w-6 transition-transform duration-300 peer-checked:translate-x-6 peer-checked:border-black"></div>
                </div>
              </div>
              <div className="group">
                <label htmlFor="admin_contact" className="block text-xs font-mono font-medium text-gray-400 mb-2 uppercase tracking-widest group-focus-within:text-black transition-colors">
                  Primary Admin Contact
                </label>
                <input 
                  type="email" 
                  id="admin_contact" 
                  defaultValue="admin@doc-assembly.io"
                  className="w-full bg-transparent border-0 border-b border-gray-200 py-2 text-xl font-light text-black placeholder-gray-200 focus:border-black focus:ring-0 transition-all outline-none rounded-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-12 border-b border-gray-100">
            <div className="lg:col-span-4 pr-8">
              <h3 className="font-display font-medium text-xl text-black mb-2">Global Injectables</h3>
              <p className="text-xs font-mono text-gray-400 uppercase tracking-widest leading-relaxed">
                Define key-value pairs available to all templates.
              </p>
            </div>
            <div className="lg:col-span-8">
              <div className="space-y-1">
                <div className="flex items-center text-[10px] font-mono uppercase tracking-widest text-gray-400 pb-2 border-b border-gray-100 mb-2">
                  <div className="w-1/3">Variable Key</div>
                  <div className="w-1/2">Current Value</div>
                  <div className="w-1/6 text-right">Action</div>
                </div>
                {[
                  { key: 'company_name', val: 'Acme Legal Solutions Inc.' },
                  { key: 'disclaimer_footer', val: 'Confidentiality Notice: This document...' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center py-4 border-b border-gray-50 group hover:bg-gray-50 transition-colors px-2 -mx-2">
                    <div className="w-1/3 font-mono text-sm text-black">{item.key}</div>
                    <div className="w-1/2 font-light text-gray-500 truncate pr-4">{item.val}</div>
                    <div className="w-1/6 flex justify-end">
                      <button type="button" className="text-gray-400 hover:text-black transition-colors">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button type="button" className="mt-6 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-400 hover:text-black transition-colors border-b border-transparent hover:border-black pb-0.5 w-fit">
                  <Plus size={16} />
                  Inject new variable
                </button>
              </div>
            </div>
          </div>

          <div className="py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-2 border border-yellow-100">
              <TriangleAlert size={18} /> 
              <span className="text-xs font-mono uppercase tracking-widest">Unsaved Changes</span>
            </div>
            <div className="flex items-center gap-6 w-full sm:w-auto">
              <button type="button" className="flex-1 sm:flex-none text-sm font-mono uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Reset</button>
              <button type="button" className="flex-1 sm:flex-none bg-black text-white hover:bg-gray-800 h-12 px-8 rounded-none font-medium text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-3 transition-colors group shadow-lg shadow-gray-200">
                <span>Apply Config</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Settings;