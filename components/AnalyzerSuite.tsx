
import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { fileToGenerativePart } from '../utils/fileUtils';
import Spinner from './common/Spinner';

type AnalyzerTab = 'image' | 'video' | 'audio';

const AnalyzerSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyzerTab>('image');
  
  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-3xl font-bold mb-4 text-white">Analyzer Suite</h2>
      <p className="text-gray-400 mb-6">Upload media to analyze content, transcribe audio, and more.</p>
      
      <div className="flex border-b border-gray-700 mb-6">
        <button onClick={() => setActiveTab('image')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'image' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>Image</button>
        <button onClick={() => setActiveTab('video')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'video' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>Video</button>
        <button onClick={() => setActiveTab('audio')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'audio' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>Audio</button>
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {activeTab === 'image' && <ImageAnalyzer />}
        {activeTab === 'video' && <VideoAnalyzer />}
        {activeTab === 'audio' && <AudioTranscriber />}
      </div>
    </div>
  );
};

const ImageAnalyzer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('Describe this image in detail.');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult('');
            setError('');
        }
    };

    const analyzeImage = useCallback(async () => {
        if (!file || !prompt) {
            setError('Please upload an image and provide a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResult('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const imagePart = await fileToGenerativePart(file);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, { text: prompt }] },
            });
            setResult(response.text);
        } catch (e) {
            console.error(e);
            setError('Failed to analyze the image.');
        } finally {
            setIsLoading(false);
        }
    }, [file, prompt]);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600 hover:border-blue-500 transition-colors">
                        {file ? <img src={URL.createObjectURL(file)} alt="Preview" className="max-h-full max-w-full object-contain rounded-md" /> : <p className="text-gray-400">Click to upload image</p>}
                    </button>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Analysis prompt (e.g., What is happening here?)" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 mt-4 focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={2}></textarea>
                    <button onClick={analyzeImage} disabled={isLoading || !file} className="w-full mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors">
                        {isLoading ? <Spinner size="h-5 w-5 mx-auto" /> : 'Analyze Image'}
                    </button>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 min-h-[300px]">
                    <h3 className="text-lg font-semibold mb-2">Analysis Result</h3>
                    {isLoading && <div className="space-y-2 mt-4"><div className="h-4 bg-gray-700 rounded w-full animate-pulse"></div><div className="h-4 bg-gray-700 rounded w-5/6 animate-pulse"></div></div>}
                    {error && <p className="text-red-400">{error}</p>}
                    <pre className="text-gray-300 whitespace-pre-wrap font-sans">{result}</pre>
                </div>
            </div>
        </div>
    );
};

const VideoAnalyzer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('Provide a summary of this video.');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult('');
            setError('');
        }
    };
    
    const analyzeVideo = useCallback(async () => {
        if (!file || !prompt) {
            setError('Please upload a video and provide a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResult('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const videoPart = await fileToGenerativePart(file);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { parts: [videoPart, { text: prompt }] },
            });
            setResult(response.text);
        } catch (e) {
            console.error(e);
            setError('Failed to analyze the video. The model may have content restrictions. Please try a different video.');
        } finally {
            setIsLoading(false);
        }
    }, [file, prompt]);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <input type="file" accept="video/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600 hover:border-blue-500 transition-colors">
                        {file ? <video src={URL.createObjectURL(file)} className="max-h-full max-w-full object-contain rounded-md" controls /> : <p className="text-gray-400">Click to upload video</p>}
                    </button>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Analysis prompt (e.g., What are the key moments?)" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 mt-4 focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={2}></textarea>
                    <button onClick={analyzeVideo} disabled={isLoading || !file} className="w-full mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors">
                        {isLoading ? <Spinner size="h-5 w-5 mx-auto" /> : 'Analyze Video'}
                    </button>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 min-h-[300px]">
                    <h3 className="text-lg font-semibold mb-2">Analysis Result</h3>
                    {isLoading && <div className="space-y-2 mt-4"><div className="h-4 bg-gray-700 rounded w-full animate-pulse"></div><div className="h-4 bg-gray-700 rounded w-5/6 animate-pulse"></div></div>}
                    {error && <p className="text-red-400">{error}</p>}
                    <pre className="text-gray-300 whitespace-pre-wrap font-sans">{result}</pre>
                </div>
            </div>
        </div>
    );
};

const AudioTranscriber: React.FC = () => {
    // This is a simplified version. For a full implementation, it would stream audio.
    // Here we'll do a conceptual transcription via a file upload.
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult('');
            setError('');
        }
    };
    
    const transcribeAudio = useCallback(async () => {
        if (!file) {
            setError('Please upload an audio file.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResult('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const audioPart = await fileToGenerativePart(file);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [audioPart, { text: 'Transcribe this audio file.' }] },
            });
            setResult(response.text);
        } catch (e) {
            console.error(e);
            setError('Failed to transcribe audio.');
        } finally {
            setIsLoading(false);
        }
    }, [file]);

    return (
       <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <input type="file" accept="audio/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600 hover:border-blue-500 transition-colors">
                        {file ? <p>{file.name}</p> : <p className="text-gray-400">Click to upload audio</p>}
                    </button>
                     {file && <audio src={URL.createObjectURL(file)} controls className="w-full mt-4"/>}
                    <button onClick={transcribeAudio} disabled={isLoading || !file} className="w-full mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors">
                        {isLoading ? <Spinner size="h-5 w-5 mx-auto" /> : 'Transcribe Audio'}
                    </button>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 min-h-[300px]">
                    <h3 className="text-lg font-semibold mb-2">Transcription</h3>
                    {isLoading && <div className="space-y-2 mt-4"><div className="h-4 bg-gray-700 rounded w-full animate-pulse"></div><div className="h-4 bg-gray-700 rounded w-5/6 animate-pulse"></div></div>}
                    {error && <p className="text-red-400">{error}</p>}
                    <p className="text-gray-300 whitespace-pre-wrap">{result}</p>
                </div>
            </div>
        </div>
    );
};

export default AnalyzerSuite;
