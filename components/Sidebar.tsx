
import React from 'react';
import { View } from '../types';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const navItems = [
    { view: View.PPT_GENERATOR, label: 'PPT Generator', icon: '📝' },
    { view: View.HOMEWORK_HELPER, label: 'Homework Helper', icon: '🧑‍🏫' },
    { view: View.CREATIVE_STUDIO, label: 'Creative Studio', icon: '🎨' },
    { view: View.ANALYZER_SUITE, label: 'Analyzer Suite', icon: '🔬' },
    { view: View.LIVE_TUTOR, label: 'Live Tutor', icon: '🎙️' },
  ];

  return (
    <aside className="w-64 bg-gray-800 p-4 flex flex-col">
      <div className="flex items-center mb-8">
        <span className="text-3xl mr-2">🎓</span>
        <h1 className="text-2xl font-bold text-white">Genius Hub</h1>
      </div>
      <nav className="flex flex-col space-y-2">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setActiveView(item.view)}
            className={`flex items-center p-3 rounded-lg text-left transition-colors ${
              activeView === item.view
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="text-xl mr-3">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto text-center text-xs text-gray-500">
        <p>Powered by Gemini</p>
      </div>
    </aside>
  );
};

export default Sidebar;
