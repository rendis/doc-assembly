import React from 'react';
import { ArrowLeft, ArrowRight, Box, Image, Split, PenTool, Table, Search, Edit2, Trash, Calendar, Type, DollarSign, CheckSquare, Bold, Italic, Code, Settings, History, MessageSquare } from 'lucide-react';

interface EditorProps {
  onBack: () => void;
}

const Editor: React.FC<EditorProps> = ({ onBack }) => {
  return (
    <div className="flex flex-col h-screen bg-[#F8F8F8] selection:bg-black selection:text-white text-gray-900 overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 md:px-12 fixed w-full top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center border-2 border-black text-black">
              <Box size={12} fill="currentColor" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">DOC-ASSEMBLY</span>
          </div>
          <div className="h-8 w-[1px] bg-gray-200 hidden md:block"></div>
          <div className="hidden md:flex flex-col justify-center">
            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              <span>Templates</span>
              <span className="text-gray-300">/</span>
              <span>Legal</span>
              <span className="text-gray-300">/</span>
              <span className="text-black font-semibold">Details</span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-sm font-semibold text-black tracking-tight mt-0.5">Non-Disclosure Agreement v2</h1>
              <span className="text-[10px] font-mono text-gray-400">ID: NDA-2024-001</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            AUTOSAVED
          </div>
          <button className="bg-black text-white hover:bg-gray-800 h-9 px-6 text-xs font-medium tracking-wide flex items-center gap-2 transition-colors">
            <span>PUBLICAR PLANTILLA</span>
            <ArrowRight size={14} />
          </button>
          <div className="h-4 w-[1px] bg-gray-200 mx-2"></div>
          <button onClick={onBack} className="text-xs font-medium text-gray-500 hover:text-black tracking-wide flex items-center gap-2 transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            BACK TO TEMPLATE DETAILS
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex mt-16 h-[calc(100vh-64px)]">
        
        {/* Left Sidebar */}
        <aside className="w-72 border-r border-gray-200 bg-white hidden lg:flex flex-col h-full overflow-hidden">
          <div className="flex-shrink-0 p-6 border-b border-gray-100">
            <h2 className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-4">Estructuras</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Imagen', icon: Image },
                { label: 'Condicional', icon: Split },
                { label: 'Firma', icon: PenTool },
                { label: 'Tabla', icon: Table },
              ].map((tool, i) => (
                <div key={i} className="group flex flex-col items-center justify-center p-3 border border-gray-100 rounded hover:border-black cursor-grab active:cursor-grabbing transition-colors bg-gray-50/50">
                  <tool.icon className="text-gray-400 group-hover:text-black mb-1" size={20} />
                  <span className="text-[10px] text-gray-600 font-medium group-hover:text-black">{tool.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col min-h-0 border-b border-gray-100">
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Variables</h2>
              <div className="relative">
                <Search className="absolute inset-y-0 left-2 top-2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Filter variables..." 
                  className="w-full pl-8 pr-3 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded focus:ring-0 focus:border-black placeholder-gray-400 transition-colors"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 px-6 pb-4 space-y-1">
              {[
                { label: '{{Fecha Actual}}', icon: Calendar, typeColor: 'text-purple-600 bg-purple-50 border-purple-100' },
                { label: '{{Año Actual}}', icon: '123', typeColor: 'text-blue-600 bg-blue-50 border-blue-100' },
                { label: '{{Nombre Usuario}}', icon: Type, typeColor: 'text-gray-600 bg-gray-100 border-gray-200' },
                { label: '{{Nombre Colegio}}', icon: Type, typeColor: 'text-gray-600 bg-gray-100 border-gray-200' },
                { label: '{{Monto Total}}', icon: DollarSign, typeColor: 'text-green-600 bg-green-50 border-green-100' },
                { label: '{{Es Renovacion}}', icon: CheckSquare, typeColor: 'text-orange-600 bg-orange-50 border-orange-100' },
              ].map((item, i) => (
                 <div key={i} className="flex items-center justify-between group cursor-grab active:cursor-grabbing py-2 px-2 -mx-2 hover:bg-gray-50 rounded-sm">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 flex items-center justify-center rounded border ${item.typeColor}`}>
                      {typeof item.icon === 'string' ? <span className="text-[10px] font-bold font-mono">{item.icon}</span> : <item.icon size={12} />}
                    </div>
                    <span className="text-sm text-gray-600 font-mono">{item.label}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-gray-400 hover:text-black p-1"><Edit2 size={14} /></button>
                    <button className="text-gray-400 hover:text-red-600 p-1"><Trash size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0 p-6 bg-gray-50/30">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono uppercase tracking-widest text-gray-400">Gestión de Roles</h2>
            </div>
             <div className="space-y-4">
                <div className="relative group">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-black rounded-full"></div>
                            <span className="text-sm font-medium text-gray-800">Sender</span>
                        </div>
                    </div>
                     <div className="pl-4 border-l border-gray-200 ml-1">
                        <div className="text-[10px] text-gray-400">admin@company.com</div>
                    </div>
                </div>
                 <div className="relative group">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 border border-gray-400 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-500">Recipient</span>
                        </div>
                    </div>
                    <div className="pl-4 border-l border-gray-200 ml-1">
                        <div className="text-[10px] text-gray-400 italic">Undefined</div>
                    </div>
                </div>
            </div>
          </div>
        </aside>

        {/* Center Canvas */}
        <div className="flex-1 bg-[#F5F5F5] relative overflow-y-auto flex justify-center p-8 md:p-12 lg:p-16">
          {/* Floating Toolbar */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white shadow-lg border border-gray-100 rounded-full px-4 py-2 flex items-center gap-1 z-40">
             <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-500 hover:text-black transition-colors" title="Bold">
              <Bold size={18} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-500 hover:text-black transition-colors" title="Italic">
              <Italic size={18} />
            </button>
            <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
             <button className="h-8 px-3 flex items-center gap-2 rounded-full hover:bg-gray-50 text-gray-500 hover:text-black transition-colors text-xs font-medium">
              <Code size={18} />
              <span>Insert Variable</span>
            </button>
            <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
            <button className="h-8 px-3 flex items-center gap-2 rounded-full hover:bg-gray-50 text-gray-500 hover:text-black transition-colors text-xs font-medium">
              <PenTool size={18} />
              <span>Signer Field</span>
            </button>
          </div>

          {/* Document Page */}
          <div className="w-full max-w-[816px] min-h-[1056px] bg-white p-[96px] relative text-gray-900 leading-relaxed font-serif text-[11pt] shadow-sm">
             <h1 className="text-2xl font-bold mb-8 font-sans text-center uppercase tracking-wider">Mutual Non-Disclosure Agreement</h1>
             <p className="mb-6 text-justify">
                This Non-Disclosure Agreement (the "Agreement") is entered into as of <span className="bg-gray-50 px-1 border-b border-black font-mono text-sm inline-block min-w-[100px] text-center text-gray-500">{`{{Fecha Actual}}`}</span>, by and between <span className="bg-yellow-50 px-1 border-b border-yellow-400 font-mono text-sm inline-block min-w-[120px] text-center text-black cursor-pointer hover:bg-yellow-100" title="Click to edit variable">{`{{Nombre Usuario}}`}</span> ("Disclosing Party") and the recipient ("Receiving Party").
             </p>
             <p className="mb-6 text-justify">
                WHEREAS, the Parties wish to explore a business opportunity of mutual interest and in connection with this opportunity, the Disclosing Party may disclose certain confidential technical and business information which the Disclosing Party desires the Receiving Party to treat as confidential.
             </p>
              <p className="mb-6 text-justify">
                    NOW, THEREFORE, in consideration of the mutual premises and covenants contained in this Agreement, the Parties agree as follows:
                </p>
                <ol className="list-decimal pl-8 space-y-4 mb-8">
                    <li className="pl-2">
                        <strong className="font-sans text-sm uppercase tracking-wide">Confidential Information.</strong> 
                        "Confidential Information" means any information disclosed by either party to the other party, either directly or indirectly, in writing, orally or by inspection of tangible objects (including without limitation documents, prototypes, samples, plant and equipment).
                    </li>
                     <li className="pl-2">
                        <strong className="font-sans text-sm uppercase tracking-wide">Exceptions.</strong> 
                        Confidential Information shall not include any information which (i) was publicly known and made generally available in the public domain prior to the time of disclosure by the Disclosing Party; (ii) becomes publicly known and made generally available after disclosure by the Disclosing Party to the Receiving Party through no action or inaction of the Receiving Party.
                    </li>
                     <li className="pl-2">
                        <strong className="font-sans text-sm uppercase tracking-wide">Jurisdiction.</strong>
                        This Agreement shall be governed by the laws of <span className="bg-gray-50 px-1 border-b border-black font-mono text-sm inline-block min-w-[120px] text-center text-gray-500">{`{{jurisdiccion}}`}</span>.
                    </li>
                </ol>

                <div className="mt-16 flex justify-between gap-12">
                     <div className="w-1/2">
                        <div className="h-24 border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center rounded-sm group hover:border-black cursor-pointer transition-colors relative">
                            <PenTool className="text-gray-300 group-hover:text-black mb-1" size={24} />
                            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-mono group-hover:text-black">Signature (Disclosing)</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-black">
                            <p className="text-xs uppercase font-bold tracking-wide">By: <span className="font-normal normal-case">{`{{Nombre Usuario}}`}</span></p>
                             <p className="text-xs text-gray-500 mt-1">Title: __________________</p>
                        </div>
                     </div>
                     <div className="w-1/2">
                        <div className="h-24 border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center rounded-sm group hover:border-black cursor-pointer transition-colors">
                             <PenTool className="text-gray-300 group-hover:text-black mb-1" size={24} />
                            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-mono group-hover:text-black">Signature (Recipient)</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-black">
                            <p className="text-xs uppercase font-bold tracking-wide">By: __________________</p>
                            <p className="text-xs text-gray-500 mt-1">Title: __________________</p>
                        </div>
                     </div>
                </div>
          </div>
        </div>

        {/* Right Sidebar Icons */}
        <div className="w-16 border-l border-gray-200 bg-white hidden md:flex flex-col items-center py-6 gap-6 z-20">
          <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-black transition-colors group relative">
             <Settings size={20} />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-black transition-colors group relative">
             <History size={20} />
          </button>
           <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-black transition-colors group relative">
             <MessageSquare size={20} />
          </button>
        </div>

      </div>

      <div className="fixed bottom-4 left-6 md:left-12 text-[10px] font-mono text-gray-300 uppercase tracking-widest pointer-events-none">
        Editor Mode — Focused
      </div>
    </div>
  );
};

export default Editor;