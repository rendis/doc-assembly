import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Plus, ArrowUpRight, Edit3, Mail } from 'lucide-react';

const data = [
  { name: 'A', value: 20 },
  { name: 'B', value: 40 },
  { name: 'C', value: 35 },
  { name: 'D', value: 50 },
  { name: 'E', value: 45 },
  { name: 'F', value: 70 },
  { name: 'G', value: 65 },
];

const data2 = [
    { name: 'A', value: 10 },
    { name: 'B', value: 20 },
    { name: 'C', value: 15 },
    { name: 'D', value: 30 },
    { name: 'E', value: 25 },
    { name: 'F', value: 40 },
    { name: 'G', value: 35 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-12 lg:py-16">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-20 md:mb-24">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-black rounded-full"></span>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Workspace Overview</p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-light text-black tracking-tighter leading-none">
              Status Monitor
            </h1>
          </div>
          <div className="text-left md:text-right hidden md:block">
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">Last Synced</p>
            <p className="text-sm font-medium font-display">Today, 09:42 AM</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-24 mb-24 pb-16 border-b border-gray-100">
          {/* Stat 1 */}
          <div className="group cursor-default relative">
            <div className="flex items-start justify-between mb-6">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest group-hover:text-black transition-colors">Total Generated</span>
            </div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-6xl lg:text-7xl font-display font-medium tracking-tighter text-black">1,248</span>
            </div>
            <div className="h-16 w-full relative overflow-hidden -ml-2">
               <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <Area type="monotone" dataKey="value" stroke="#000" fill="url(#gradient1)" strokeWidth={1.5} />
                  <defs>
                    <linearGradient id="gradient1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="group cursor-default relative">
            <div className="flex items-start justify-between mb-6">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest group-hover:text-black transition-colors">Signed (30 Days)</span>
            </div>
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-6xl lg:text-7xl font-display font-medium tracking-tighter text-black">302</span>
              <span className="text-xs font-mono text-gray-500 border border-gray-200 px-1.5 py-0.5">+12.4%</span>
            </div>
            <div className="h-16 w-full relative overflow-hidden -ml-2">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data2}>
                    <Area type="step" dataKey="value" stroke="#9CA3AF" fill="transparent" strokeWidth={1.5} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="group cursor-default relative">
            <div className="flex items-start justify-between mb-6">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest group-hover:text-black transition-colors">In Progress</span>
            </div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-6xl lg:text-7xl font-display font-medium tracking-tighter text-black">45</span>
              <span className="text-xs font-mono text-gray-400 self-center">active</span>
            </div>
             <div className="h-10 w-full border-b border-gray-200 flex items-end gap-[2px] pb-1">
                {[40, 60, 30, 80, 50, 90, 45].map((h, i) => (
                    <div key={i} style={{height: `${h}%`}} className="w-1.5 bg-gray-200 group-hover:bg-black transition-colors duration-300" />
                ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-16">
          <div className="lg:col-span-1 space-y-10 order-2 lg:order-1">
            <div>
              <h3 className="font-display font-semibold text-lg mb-3">Quick Draft</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-6 font-light">Create new templates or start a blank document directly from the dashboard.</p>
              <button className="w-full border border-gray-300 hover:border-black hover:bg-black hover:text-white h-12 px-4 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 rounded-none">
                <Plus size={16} />
                New Document
              </button>
            </div>
            <div className="pt-8 border-t border-gray-100">
              <h3 className="font-display font-semibold text-lg mb-4">Integrations</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs font-mono text-gray-500">
                  <div className="w-1.5 h-1.5 bg-green-500"></div>
                  Salesforce Connected
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-gray-500">
                  <div className="w-1.5 h-1.5 bg-green-500"></div>
                  DocuSign Active
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-xl font-display font-medium tracking-tight">Recent Activity</h2>
              <a href="#" className="text-[10px] font-mono font-bold text-gray-400 hover:text-black border-b border-transparent hover:border-black transition-colors uppercase tracking-widest pb-0.5">View Full History</a>
            </div>
            
            <div className="w-full">
              <div className="grid grid-cols-12 border-b border-black pb-3 text-[10px] font-mono text-black font-bold uppercase tracking-widest">
                <div className="col-span-6 md:col-span-5">Document Name / Template</div>
                <div className="col-span-3 md:col-span-3">Status</div>
                <div className="col-span-3 md:col-span-3 text-right">Modified</div>
                <div className="col-span-0 md:col-span-1"></div>
              </div>

              {[
                { name: 'NDA_Vendor_Global_v2.pdf', sub: '#8493-A • Standard NDA', status: 'Signed', date: 'Oct 24', icon: ArrowUpRight },
                { name: 'Service_Agreement_Q4_Draft.docx', sub: '#8499-C • MSA Global', status: 'Drafting', date: '2 hrs ago', icon: Edit3 },
                { name: 'Employee_Offer_J_Doe.pdf', sub: '#8501-F • HR Offer Letter', status: 'Action Req', date: 'Yesterday', icon: Mail },
                { name: 'Contract_Renewal_Acme.pdf', sub: '#8320-X • Renewal Agmt', status: 'Signed', date: 'Oct 22', icon: ArrowUpRight },
              ].map((item, i) => (
                <div key={i} className="grid grid-cols-12 py-5 border-b border-gray-100 items-center group hover:bg-gray-50 transition-colors px-2 -mx-2 cursor-pointer">
                    <div className="col-span-6 md:col-span-5 pr-4">
                        <div className="font-medium text-sm text-black">{item.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono mt-1">ID: {item.sub}</div>
                    </div>
                    <div className="col-span-3 md:col-span-3">
                         <span className={`inline-flex items-center px-2 py-1 border text-[9px] font-bold uppercase tracking-wider rounded-none ${item.status === 'Action Req' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 group-hover:border-black group-hover:text-black'}`}>
                            {item.status}
                        </span>
                    </div>
                    <div className="col-span-3 md:col-span-3 text-right text-xs font-mono text-gray-400 group-hover:text-black transition-colors">
                        {item.date}
                    </div>
                    <div className="col-span-0 md:col-span-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <item.icon size={16} className="text-black" />
                    </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;