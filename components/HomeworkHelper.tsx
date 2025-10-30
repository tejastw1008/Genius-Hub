
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { ChatMessage, GroundingSource } from '../types';
import Spinner from './common/Spinner';

type Mode = 'FAST' | 'SMART' | 'SEARCH' | 'MAPS';

const HomeworkHelper: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('FAST');
  
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getModelForMode = (mode: Mode) => {
    switch (mode) {
        // Fix: Use the correct model name for gemini flash lite.
        case 'FAST': return 'gemini-flash-lite-latest';
        case 'SMART': return 'gemini-2.5-pro';
        case 'SEARCH': return 'gemini-2.5-flash';
        case 'MAPS': return 'gemini-2.5-flash';
        default: return 'gemini-2.5-flash';
    }
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        let response;
        let modelResponseText: string = "";
        let sources: GroundingSource[] | undefined = undefined;

        if (mode === 'SEARCH' || mode === 'MAPS') {
            const config: any = {
                tools: mode === 'SEARCH' ? [{googleSearch: {}}] : [{googleMaps: {}}]
            };
            if(mode === 'MAPS') {
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    });
                    config.toolConfig = {
                        retrievalConfig: {
                            latLng: {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                            }
                        }
                    }
                } catch (geoError) {
                    console.warn("Geolocation failed, proceeding without location data.", geoError);
                }
            }
            
            response = await ai.models.generateContent({
                model: getModelForMode(mode),
                contents: input,
                config,
            });
            modelResponseText = response.text;
            sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
                ?.map((chunk: any) => ({
                    uri: chunk.web?.uri || chunk.maps?.uri,
                    title: chunk.web?.title || chunk.maps?.title,
                }))
                .filter((s: any) => s.uri && s.title);

        } else if (mode === 'SMART') {
            response = await ai.models.generateContent({
                model: getModelForMode(mode),
                contents: input,
                config: {
                    thinkingConfig: { thinkingBudget: 32768 }
                }
            });
            modelResponseText = response.text;
        } else { // FAST mode
             if (!chatRef.current || chatRef.current.model !== `models/${getModelForMode(mode)}`) {
                chatRef.current = ai.chats.create({ model: getModelForMode(mode) });
            }
            response = await chatRef.current.sendMessage({ message: input });
            modelResponseText = response.text;
        }

        const modelMessage: ChatMessage = { role: 'model', text: modelResponseText, sources };
        setMessages(prev => [...prev, modelMessage]);

    } catch (e) {
      console.error(e);
      setError('An error occurred. Please try again.');
      setMessages(prev => [...prev, {role: 'model', text: 'Sorry, I ran into an issue.'}])
    } finally {
      setIsLoading(false);
    }
  }, [input, mode]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  };
  
  const ModeButton = ({btnMode, label, icon}: {btnMode: Mode, label: string, icon: string}) => (
    <button
        onClick={() => setMode(btnMode)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${mode === btnMode ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}
    >
        {icon} {label}
    </button>
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-3xl font-bold mb-1 text-white">Homework Helper</h2>
      <p className="text-gray-400 mb-4">Your personal AI tutor. Ask questions, solve problems, and get up-to-date info.</p>

      <div className="flex justify-center items-center gap-2 mb-4 p-2 bg-gray-700 rounded-full">
        <ModeButton btnMode="FAST" label="Fast" icon="⚡️"/>
        <ModeButton btnMode="SMART" label="Smart" icon="🧠"/>
        <ModeButton btnMode="SEARCH" label="Search" icon="🌐"/>
        <ModeButton btnMode="MAPS" label="Maps" icon="🗺️"/>
      </div>
      
      <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-800 rounded-lg">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-600">
                        <h4 className="text-xs font-semibold mb-1 text-gray-400">Sources:</h4>
                        <ul className="text-xs space-y-1">
                            {msg.sources.map((source, i) => (
                                <li key={i}>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                        {i+1}. {source.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><div className="p-3 rounded-lg bg-gray-700"><Spinner size="h-5 w-5"/></div></div>}
        <div ref={messagesEndRef} />
      </div>

      {error && <p className="text-red-400 text-center mb-2">{error}</p>}
      
      <div className="flex gap-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question..."
          className="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
            Send
        </button>
      </div>
    </div>
  );
};

export default HomeworkHelper;
