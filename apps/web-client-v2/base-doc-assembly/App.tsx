import React, { useState } from 'react';
import { Screen } from './types';
import Login from './screens/Login';
import WorkspaceSelect from './screens/WorkspaceSelect';
import Dashboard from './screens/Dashboard';
import Documents from './screens/Documents';
import Templates from './screens/Templates';
import Settings from './screens/Settings';
import Editor from './screens/Editor';
import Sidebar from './components/Sidebar';
import { Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.LOGIN);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
    setMobileMenuOpen(false);
  };

  // Screens that don't use the main sidebar layout
  if (currentScreen === Screen.LOGIN) {
    return <Login onLogin={() => navigate(Screen.WORKSPACE_SELECT)} />;
  }

  if (currentScreen === Screen.WORKSPACE_SELECT) {
    return <WorkspaceSelect onSelect={() => navigate(Screen.DASHBOARD)} onBack={() => navigate(Screen.LOGIN)} />;
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden font-sans">
      {/* Mobile Menu Toggle */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-black text-white rounded-full shadow-lg"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 transition duration-200 ease-in-out z-40
        flex-shrink-0
      `}>
        <Sidebar currentScreen={currentScreen} onNavigate={navigate} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        {currentScreen === Screen.DASHBOARD && <Dashboard />}
        {currentScreen === Screen.DOCUMENTS && <Documents />}
        {currentScreen === Screen.TEMPLATES && <Templates onEdit={() => navigate(Screen.EDITOR)} />}
        {currentScreen === Screen.SETTINGS && <Settings />}
        {currentScreen === Screen.EDITOR && <Editor onBack={() => navigate(Screen.TEMPLATES)} />}
      </main>
    </div>
  );
};

export default App;