import React from 'react';
import { Search, ChevronDown, List, Grid, ChevronRight, MoreVertical, Folder, Download, Share2, FileText } from 'lucide-react';

const Documents: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <header className="pt-12 pb-6 px-8 md:px-16 flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">Repository</div>
          <h1 className="text-4xl md:text-5xl font-display font-light text-black tracking-tight leading-tight">
            Document Explorer
          </h1>
        </div>
        <button className="bg-white border border-black text-black hover:bg-black hover:text-white h-12 px-6 rounded-none font-medium text-sm tracking-wide flex items-center gap-2 transition-colors group shadow-none">
          <span className="text-xl leading-none">+</span>
          <span>NEW FOLDER</span>
        </button>
      </header>

      <div className="px-8 md:px-16 py-6 border-b border-gray-100 flex flex-col md:flex-row gap-6 md:items-center justify-between shrink-0 bg-white z-10">
        <div className="group w-full md:max-w-md relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search documents..." 
            className="w-full bg-transparent border-0 border-b border-gray-200 py-2 pl-8 pr-4 text-base text-black placeholder-gray-300 focus:border-black focus:ring-0 transition-all outline-none rounded-none font-light"
          />
        </div>
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-black font-mono uppercase tracking-wider transition-colors">
            <span>Type: All</span>
            <ChevronDown size={16} />
          </button>
           <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-black font-mono uppercase tracking-wider transition-colors">
            <span>Sort: Newest</span>
            <ChevronDown size={16} />
          </button>
          <div className="flex items-center gap-2 border-l border-gray-200 pl-6 ml-2">
            <button className="text-gray-300 hover:text-gray-500"><List size={20} /></button>
            <button className="text-black"><Grid size={20} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 md:px-16 pb-12">
        <div className="py-6 flex items-center gap-2 text-sm font-mono text-gray-400">
          <a href="#" className="hover:text-black transition-colors">Documents</a>
          <ChevronRight size={14} />
          <a href="#" className="hover:text-black transition-colors">Client Matter</a>
          <ChevronRight size={14} />
          <span className="text-black font-medium border-b border-black">Acme Corp 2024</span>
        </div>

        <div className="mb-10">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-6">Subfolders</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {['Contracts', 'Invoices', 'Archived'].map((folder, i) => (
              <div key={i} className="group border border-gray-100 p-6 flex flex-col gap-8 hover:border-black transition-colors cursor-pointer bg-white relative">
                <div className="flex justify-between items-start">
                  <Folder className="text-gray-300 group-hover:text-black transition-colors" size={32} strokeWidth={1} />
                  <button className="text-gray-300 hover:text-black"><MoreVertical size={20} /></button>
                </div>
                <div>
                  <h3 className="font-display font-medium text-lg text-black mb-1 group-hover:underline decoration-1 underline-offset-4">{folder}</h3>
                  <p className="text-[10px] font-mono uppercase text-gray-400 tracking-widest">{Math.floor(Math.random() * 20) + 2} items</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-6">Documents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[
              { name: 'Acme_MSA_Executed.pdf', type: 'Finalized', size: '2.4 MB', date: 'Oct 24, 2023' },
              { name: 'Offer_Letter_Draft_v2.docx', type: 'Draft', size: '145 KB', date: '2 hours ago' },
              { name: 'NDA_Standard_Signed.pdf', type: 'Finalized', size: '890 KB', date: 'Yesterday' },
              { name: 'Memo_Internal_Policy.docx', type: 'Draft', size: '55 KB', date: 'Aug 15, 2023' },
            ].map((doc, i) => (
              <div key={i} className="group border border-gray-100 p-6 flex flex-col gap-6 hover:border-black transition-colors cursor-pointer bg-white relative">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-black text-gray-400 hover:text-white transition-colors rounded-sm">
                    <Download size={16} />
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-black text-gray-400 hover:text-white transition-colors rounded-sm">
                    <Share2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 flex items-center justify-center bg-gray-50">
                     <FileText className="text-gray-400" size={24} strokeWidth={1} />
                   </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${doc.type === 'Finalized' ? 'bg-black' : 'border border-gray-300'}`}></span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{doc.type}</span>
                  </div>
                  <h3 className="font-display font-medium text-lg text-black leading-snug mb-1 truncate">{doc.name}</h3>
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-gray-50">
                    <p className="text-[10px] font-mono text-gray-400">{doc.size}</p>
                    <p className="text-[10px] font-mono text-gray-400">{doc.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;