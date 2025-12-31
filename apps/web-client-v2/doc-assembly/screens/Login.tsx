import React from 'react';
import { ArrowRight, Box } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center relative overflow-hidden">
      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-32 flex flex-col justify-center h-full">
        
        <div className="mb-16 md:mb-20 max-w-2xl">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 flex items-center justify-center border-2 border-black text-black">
              <Box size={16} fill="currentColor" />
            </div>
            <span className="text-black font-display text-lg font-bold tracking-tight uppercase">Doc-Assembly</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-light text-black tracking-tight leading-[1.05]">
            Login to<br/>
            <span className="font-semibold">workspace.</span>
          </h1>
        </div>

        <div className="w-full max-w-[400px]">
          <form className="space-y-12" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
            <div className="space-y-8">
              <div className="group">
                <label className="block text-xs font-mono font-medium text-gray-400 mb-2 uppercase tracking-widest group-focus-within:text-black transition-colors">
                  Username / Email
                </label>
                <input 
                  type="email" 
                  defaultValue="user@domain.com"
                  className="w-full bg-transparent border-0 border-b-2 border-gray-100 py-3 text-xl text-black placeholder-gray-200 focus:border-black focus:ring-0 transition-all outline-none rounded-none font-light"
                />
              </div>
              <div className="group">
                <label className="block text-xs font-mono font-medium text-gray-400 mb-2 uppercase tracking-widest group-focus-within:text-black transition-colors">
                  Password
                </label>
                <input 
                  type="password" 
                  defaultValue="password123"
                  className="w-full bg-transparent border-0 border-b-2 border-gray-100 py-3 text-xl text-black placeholder-gray-200 focus:border-black focus:ring-0 transition-all outline-none rounded-none font-light"
                />
              </div>
            </div>

            <div className="flex flex-col items-start gap-8 pt-4">
              <button 
                type="submit"
                className="w-full bg-black text-white hover:bg-gray-800 h-14 px-8 rounded-none font-medium text-sm tracking-wide flex items-center justify-between gap-3 transition-colors group"
              >
                <span>AUTHENTICATE</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <a href="#" className="text-xs text-gray-400 hover:text-black transition-colors font-mono border-b border-transparent hover:border-black pb-0.5">
                Recover password access
              </a>
            </div>
          </form>
        </div>

        <div className="absolute bottom-12 left-6 md:left-12 lg:left-32 text-[10px] font-mono text-gray-300 uppercase tracking-widest">
          v2.4 — Secure Environment
        </div>
      </div>
    </div>
  );
};

export default Login;