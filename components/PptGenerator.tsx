
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Slide } from '../types';
import Spinner from './common/Spinner';

const PptGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlides = useCallback(async () => {
    if (!topic) {
      setError('Please enter a topic for the presentation.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSlides([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const prompt = `Create a 5-slide presentation about "${topic}". For each slide, provide a title, 3-5 bullet points for content, and a brief speaker note.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              slides: {
                type: Type.ARRAY,
                description: "An array of slide objects for the presentation.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "The title of the slide." },
                    content: {
                      type: Type.ARRAY,
                      description: "An array of bullet points for the slide content.",
                      items: { type: Type.STRING }
                    },
                    speakerNotes: { type: Type.STRING, description: "Notes for the presenter." }
                  },
                  required: ["title", "content", "speakerNotes"]
                }
              }
            }
          }
        }
      });

      const responseJson = JSON.parse(response.text);
      setSlides(responseJson.slides);

    } catch (e) {
      console.error(e);
      setError('Failed to generate presentation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [topic]);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-4 text-white">PPT Generator</h2>
      <p className="text-gray-400 mb-6">Enter a topic, and AI will generate a structured presentation for you.</p>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., The History of Space Exploration"
          className="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          disabled={isLoading}
        />
        <button
          onClick={generateSlides}
          disabled={isLoading || !topic}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? <Spinner size="h-5 w-5" /> : 'Generate'}
        </button>
      </div>
      
      {error && <p className="text-red-400 text-center mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slides.map((slide, index) => (
          <div key={index} className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-col">
            <h3 className="text-xl font-bold text-blue-400 mb-3">{index + 1}. {slide.title}</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              {slide.content.map((point, i) => <li key={i}>{point}</li>)}
            </ul>
            <div className="mt-auto pt-4 border-t border-gray-600">
              <p className="text-sm font-semibold text-gray-400">Speaker Notes:</p>
              <p className="text-sm text-gray-500 italic">{slide.speakerNotes}</p>
            </div>
          </div>
        ))}
         {isLoading && Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-gray-800 p-6 rounded-lg border border-gray-700 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default PptGenerator;
