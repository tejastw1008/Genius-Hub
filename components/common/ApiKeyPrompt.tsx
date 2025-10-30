
import React from 'react';

interface ApiKeyPromptProps {
  onSelectApiKey: () => void;
}

const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ onSelectApiKey }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-800 rounded-lg border border-gray-700">
      <h3 className="text-xl font-bold mb-4">API Key Required</h3>
      <p className="text-center mb-6">
        Video generation with Veo requires a user-provided API key. Please select your API key to proceed.
      </p>
      <button
        onClick={onSelectApiKey}
        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        Select API Key
      </button>
      <a 
        href="https://ai.google.dev/gemini-api/docs/billing" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-sm text-blue-400 hover:underline mt-4"
      >
        Learn more about billing
      </a>
    </div>
  );
};

export default ApiKeyPrompt;
