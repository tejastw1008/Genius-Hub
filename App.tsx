
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import PptGenerator from './components/PptGenerator';
import HomeworkHelper from './components/HomeworkHelper';
import CreativeStudio from './components/CreativeStudio';
import AnalyzerSuite from './components/AnalyzerSuite';
import LiveTutor from './components/LiveTutor';
import { View } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.HOMEWORK_HELPER);

  const renderActiveView = () => {
    switch (activeView) {
      case View.PPT_GENERATOR:
        return <PptGenerator />;
      case View.HOMEWORK_HELPER:
        return <HomeworkHelper />;
      case View.CREATIVE_STUDIO:
        return <CreativeStudio />;
      case View.ANALYZER_SUITE:
        return <AnalyzerSuite />;
      case View.LIVE_TUTOR:
        return <LiveTutor />;
      default:
        return <HomeworkHelper />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-hidden">
        {renderActiveView()}
      </main>
    </div>
  );
};

export default App;
