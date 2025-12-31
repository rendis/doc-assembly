import React from 'react';
import { Search, ChevronDown, List, Grid, Plus, MoreHorizontal, FileText, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

interface TemplatesProps {
  onEdit: () => void;
}

const Templates: React.FC<TemplatesProps> = ({ onEdit }) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <header className="pt-12 pb-6 px-8 md:px-16 flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">Management</div>
          <h1 className="text-4xl md:text-5xl font-display font-light text-black tracking-tight leading-tight">
            Template List
          </h1>
        </div>
        <button onClick={onEdit} className="bg-black text-white hover:bg-gray-800 h-12 px-6 rounded-none font-medium text-sm tracking-wide flex items-center gap-2 transition-colors group shadow-lg shadow-gray-200">
          <Plus size={20} />
          <span>CREATE NEW TEMPLATE</span>
        </button>
      </header>

      <div className="px-8 md:px-16 py-6 border-b border-gray-100 flex flex-col md:flex-row gap-6 md:items-center justify-between shrink-0 bg-white z-10">
        <div className="group w-full md:max-w-md relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search templates by name..." 
            className="w-full bg-transparent border-0 border-b border-gray-200 py-2 pl-8 pr-4 text-base text-black placeholder-gray-300 focus:border-black focus:ring-0 transition-all outline-none rounded-none font-light"
          />
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-black font-mono uppercase tracking-wider transition-colors">
              <span>Folder: All</span>
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="relative group">
            <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-black font-mono uppercase tracking-wider transition-colors">
              <span>Status: Any</span>
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 border-l border-gray-200 pl-6 ml-2">
            <button className="text-black"><List size={20} /></button>
            <button className="text-gray-300 hover:text-gray-500"><Grid size={20} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 md:px-16 pb-12">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              <th className="py-4 border-b border-gray-100 text-[10px] uppercase tracking-widest font-mono text-gray-400 font-normal w-[35%]">Template Name</th>
              <th className="py-4 border-b border-gray-100 text-[10px] uppercase tracking-widest font-mono text-gray-400 font-normal w-[10%]">Versions</th>
              <th className="py-4 border-b border-gray-100 text-[10px] uppercase tracking-widest font-mono text-gray-400 font-normal w-[15%]">Status</th>
              <th className="py-4 border-b border-gray-100 text-[10px] uppercase tracking-widest font-mono text-gray-400 font-normal w-[20%]">Last Modified</th>
              <th className="py-4 border-b border-gray-100 text-[10px] uppercase tracking-widest font-mono text-gray-400 font-normal w-[15%]">Author</th>
              <th className="py-4 border-b border-gray-100 text-[10px] uppercase tracking-widest font-mono text-gray-400 font-normal w-[5%] text-right">Action</th>
            </tr>
          </thead>
          <tbody className="font-light">
            {[
              { name: 'Master Service Agreement (MSA)', tags: ['#legal', '#standard'], ver: 'v12', status: 'Published', date: 'Oct 24, 2023', author: 'JD', authorName: 'John Doe', icon: FileText },
              { name: 'Non-Disclosure Agreement (Standard)', tags: ['#nda'], ver: 'v3', status: 'Published', date: 'Nov 02, 2023', author: 'AS', authorName: 'Alice Smith', icon: FileText },
              { name: 'Employee Offer Letter 2024', tags: ['#hr', '#internal'], ver: 'v1', status: 'Draft', date: 'Today, 10:42 AM', author: 'ME', authorName: 'Me', icon: Edit },
              { name: 'Vendor Contract - Software Licensing', tags: ['#procurement'], ver: 'v4', status: 'Draft', date: 'Yesterday', author: 'JD', authorName: 'John Doe', icon: Edit },
              { name: 'Privacy Policy - Global', tags: ['#compliance', '#public'], ver: 'v8', status: 'Published', date: 'Aug 15, 2023', author: 'AS', authorName: 'Alice Smith', icon: FileText },
            ].map((row, i) => (
              <tr key={i} className="group hover:bg-gray-50 transition-colors cursor-pointer" onClick={onEdit}>
                <td className="py-6 border-b border-gray-100 pr-4 align-top">
                  <div className="flex items-start gap-4">
                    <row.icon className="text-gray-300 group-hover:text-black transition-colors pt-1" size={24} />
                    <div>
                      <div className="text-lg font-display text-black font-medium mb-1">{row.name}</div>
                      <div className="text-xs text-gray-400 font-mono flex gap-2">
                        {row.tags.map(tag => (
                          <span key={tag} className="bg-gray-100 px-1 rounded-sm text-gray-500">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-6 border-b border-gray-100 align-top pt-7">
                   <div className="inline-flex items-center px-2 py-0.5 rounded bg-gray-50 border border-gray-100 text-xs font-mono text-gray-600">
                      {row.ver}
                  </div>
                </td>
                <td className="py-6 border-b border-gray-100 align-top pt-7">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 border text-[10px] font-mono uppercase tracking-widest font-bold bg-white ${row.status === 'Published' ? 'border-black text-black' : 'border-gray-300 text-gray-500 font-medium'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'Published' ? 'bg-black' : 'border border-gray-400'}`}></span>
                    {row.status}
                  </span>
                </td>
                <td className="py-6 border-b border-gray-100 text-sm text-gray-500 font-mono align-top pt-8">
                  {row.date}
                </td>
                <td className="py-6 border-b border-gray-100 align-top pt-7">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold tracking-tight ${row.author === 'ME' ? 'bg-black text-white' : 'bg-gray-200 text-black'}`}>
                      {row.author}
                    </div>
                    <span className="text-sm text-gray-600">{row.authorName}</span>
                  </div>
                </td>
                <td className="py-6 border-b border-gray-100 text-right align-top pt-7">
                  <button className="text-gray-300 hover:text-black transition-colors">
                    <MoreHorizontal size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="py-8 flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
            Showing 5 of 24 templates
          </div>
          <div className="flex gap-2">
            <button className="w-8 h-8 flex items-center justify-center border border-gray-200 hover:border-black text-gray-400 hover:text-black transition-colors">
              <ChevronLeft size={16} />
            </button>
             <button className="w-8 h-8 flex items-center justify-center border border-gray-200 hover:border-black text-gray-400 hover:text-black transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Templates;