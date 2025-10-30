
import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Modality, VideosOperation } from '@google/genai';
import { fileToBase64 } from '../utils/fileUtils';
import Spinner from './common/Spinner';
import ApiKeyPrompt from './common/ApiKeyPrompt';
import { useApiKey } from '../hooks/useApiKey';

type CreativeTab = 'image-gen' | 'video-gen' | 'image-edit';

const CreativeStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CreativeTab>('image-gen');
  
  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-3xl font-bold mb-4 text-white">Creative Studio</h2>
      <p className="text-gray-400 mb-6">Bring your ideas to life. Generate images and videos, or edit photos with AI.</p>
      
      <div className="flex border-b border-gray-700 mb-6">
        <button onClick={() => setActiveTab('image-gen')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'image-gen' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>Image Generation</button>
        <button onClick={() => setActiveTab('video-gen')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'video-gen' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>Video Generation</button>
        <button onClick={() => setActiveTab('image-edit')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'image-edit' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>Image Editor</button>
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {activeTab === 'image-gen' && <ImageGenerator />}
        {activeTab === 'video-gen' && <VideoGenerator />}
        {activeTab === 'image-edit' && <ImageEditor />}
      </div>
    </div>
  );
};

const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [images, setImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const generateImages = useCallback(async () => {
        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setImages([]);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio },
            });
            const imageUrls = response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
            setImages(imageUrls);
        } catch (e) {
            console.error(e);
            setError('Failed to generate images.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, aspectRatio]);

    return (
        <div>
            <div className="flex gap-4 mb-4">
                <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., A photo of a cat astronaut on Mars" className="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="1:1">1:1</option>
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="4:3">4:3</option>
                    <option value="3:4">3:4</option>
                </select>
                <button onClick={generateImages} disabled={isLoading || !prompt} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors">
                    {isLoading ? <Spinner size="h-5 w-5" /> : 'Generate'}
                </button>
            </div>
            {error && <p className="text-red-400 text-center mb-4">{error}</p>}
            <div className="grid grid-cols-1 gap-4">
                {isLoading && <div className="w-full aspect-square bg-gray-700 rounded-lg animate-pulse"></div>}
                {images.map((src, i) => <img key={i} src={src} alt="Generated" className="rounded-lg w-full" />)}
            </div>
        </div>
    );
};

const VideoGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [videoUrl, setVideoUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { isKeySelected, isChecking, selectApiKey, recheckApiKey } = useApiKey();

    const generateVideo = useCallback(async () => {
        if (!prompt && !file) {
            setError('Please enter a prompt or upload an image.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Initializing video generation...');
        setError('');
        setVideoUrl('');

        try {
            // Must create a new instance right before the call to use the latest key
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const imagePayload = file ? { imageBytes: await fileToBase64(file), mimeType: file.type } : undefined;
            
            let operation: VideosOperation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt || 'Animate this image.',
                image: imagePayload,
                config: { numberOfVideos: 1, resolution: '720p', aspectRatio },
            });
            
            setLoadingMessage('Video is processing. This may take a few minutes...');

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            if (operation.response?.generatedVideos?.[0]?.video?.uri) {
                const downloadLink = operation.response.generatedVideos[0].video.uri;
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY as string}`);
                const blob = await response.blob();
                setVideoUrl(URL.createObjectURL(blob));
            } else {
                throw new Error('Video generation completed, but no video URI was found.');
            }
            setLoadingMessage('');
        } catch (e: any) {
            console.error(e);
            let errorMessage = 'Failed to generate video.';
            if (e.message?.includes('Requested entity was not found')) {
                errorMessage = 'API Key is invalid or expired. Please select a new key.';
                recheckApiKey();
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, file, aspectRatio, recheckApiKey]);

    if (isChecking) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!isKeySelected) return <ApiKeyPrompt onSelectApiKey={selectApiKey} />;

    return (
        <div>
            <div className="flex flex-col gap-4 mb-4">
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., A majestic dragon flying over a futuristic city" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={3}></textarea>
                 <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} ref={fileInputRef} className="hidden" />
                <div className="flex items-center gap-4">
                     <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-gray-700 text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                        {file ? `Image: ${file.name}` : 'Upload Starting Image (Optional)'}
                    </button>
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait</option>
                    </select>
                </div>
                <button onClick={generateVideo} disabled={isLoading || (!prompt && !file)} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors">
                    Generate Video
                </button>
            </div>
            {error && <p className="text-red-400 text-center mb-4">{error}</p>}
            <div className="w-full aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
                {isLoading && <div className="text-center"><Spinner /><p className="mt-4 text-gray-300">{loadingMessage}</p></div>}
                {videoUrl && <video src={videoUrl} controls autoPlay className="w-full h-full rounded-lg" />}
            </div>
        </div>
    );
};

const ImageEditor: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [editedImage, setEditedImage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setEditedImage(URL.createObjectURL(selectedFile));
            setError('');
        }
    };

    const editImage = useCallback(async () => {
        if (!file || !prompt) {
            setError('Please upload an image and provide an edit instruction.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const base64Data = await fileToBase64(file);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ inlineData: { data: base64Data, mimeType: file.type } }, { text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes = part.inlineData.data;
                    setEditedImage(`data:${part.inlineData.mimeType};base64,${base64ImageBytes}`);
                    return;
                }
            }
            throw new Error("No image data returned from API.");

        } catch (e) {
            console.error(e);
            setError('Failed to edit image.');
        } finally {
            setIsLoading(false);
        }
    }, [file, prompt]);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600 hover:border-blue-500 transition-colors">
                        {editedImage ? <img src={editedImage} alt="Preview" className="max-h-full max-w-full object-contain rounded-md" /> : <p className="text-gray-400">Click to upload image</p>}
                    </button>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Edit instruction (e.g., Add a retro filter)" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 mt-4 focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={2}></textarea>
                    <button onClick={editImage} disabled={isLoading || !file || !prompt} className="w-full mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors">
                        {isLoading ? <Spinner size="h-5 w-5 mx-auto" /> : 'Apply Edit'}
                    </button>
                    {error && <p className="text-red-400 text-center mt-2">{error}</p>}
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-center">
                    {isLoading && <Spinner size="h-12 w-12" />}
                    {!isLoading && editedImage && <img src={editedImage} alt="Edited result" className="max-h-full max-w-full object-contain rounded-md"/>}
                    {!isLoading && !editedImage && <p className="text-gray-500">Edited image will appear here</p>}
                </div>
            </div>
        </div>
    );
};

export default CreativeStudio;
