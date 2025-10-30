
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

type ConnectionState = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

const LiveTutor: React.FC = () => {
    const [connectionState, setConnectionState] = useState<ConnectionState>('IDLE');
    const [transcriptions, setTranscriptions] = useState<{ user: string, model: string }[]>([]);
    const [currentTranscription, setCurrentTranscription] = useState({ user: '', model: '' });

    const sessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const stopConversation = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }

        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        
        setConnectionState('IDLE');
    }, []);

    const startConversation = useCallback(async () => {
        if (connectionState !== 'IDLE' && connectionState !== 'DISCONNECTED' && connectionState !== 'ERROR') return;

        setConnectionState('CONNECTING');
        setTranscriptions([]);
        setCurrentTranscription({ user: '', model: '' });
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: async () => {
                        console.debug('Live session opened.');
                        setConnectionState('CONNECTED');
                        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                        
                        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        
                        source.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcriptions
                        if (message.serverContent?.inputTranscription) {
                            setCurrentTranscription(prev => ({ ...prev, user: prev.user + message.serverContent!.inputTranscription!.text }));
                        }
                        if (message.serverContent?.outputTranscription) {
                            setCurrentTranscription(prev => ({ ...prev, model: prev.model + message.serverContent!.outputTranscription!.text }));
                        }
                        // Fix: Use functional update to avoid stale state in closure.
                        if (message.serverContent?.turnComplete) {
                            setCurrentTranscription(current => {
                                setTranscriptions(prev => [...prev, current]);
                                return { user: '', model: '' };
                            });
                        }

                        // Handle audio output
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            
                            const currentTime = outputAudioContextRef.current.currentTime;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
                            
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            
                            audioSourcesRef.current.add(source);
                            source.onended = () => audioSourcesRef.current.delete(source);
                        }
                    },
                    onclose: () => {
                        console.debug('Live session closed.');
                        stopConversation();
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setConnectionState('ERROR');
                        stopConversation();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                }
            });

            sessionRef.current = await sessionPromise;
        } catch (error) {
            console.error('Failed to start conversation:', error);
            setConnectionState('ERROR');
            stopConversation();
        }
    // Fix: Removed `currentTranscription` from dependency array to prevent stale closures.
    }, [connectionState, stopConversation]);
    
    useEffect(() => {
        return () => {
            stopConversation();
        };
    }, [stopConversation]);

    return (
        <div className="p-6 h-full flex flex-col items-center">
            <h2 className="text-3xl font-bold mb-4 text-white">Live Tutor</h2>
            <p className="text-gray-400 mb-8 text-center">Have a real-time voice conversation with your AI tutor.</p>
            
            <div className="w-full max-w-2xl flex-grow flex flex-col bg-gray-800 rounded-lg p-4 border border-gray-700">
                 <div className="flex-grow overflow-y-auto mb-4 space-y-4">
                    {transcriptions.map((t, i) => (
                        <div key={i}>
                            <p><strong className="text-blue-400">You:</strong> {t.user}</p>
                            <p><strong className="text-green-400">Tutor:</strong> {t.model}</p>
                        </div>
                    ))}
                    { (currentTranscription.user || currentTranscription.model) &&
                        <div>
                            <p className="text-gray-400"><strong className="text-blue-400">You:</strong> {currentTranscription.user}</p>
                            <p className="text-gray-400"><strong className="text-green-400">Tutor:</strong> {currentTranscription.model}</p>
                        </div>
                    }
                 </div>

                <div className="mt-auto flex justify-center items-center flex-col">
                    {connectionState === 'CONNECTED' && <div className="h-8 w-8 bg-green-500 rounded-full animate-pulse mb-4"></div>}
                    <button
                        onClick={connectionState === 'CONNECTED' ? stopConversation : startConversation}
                        className={`px-8 py-4 text-lg font-bold rounded-full transition-colors ${
                            connectionState === 'CONNECTED' 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-500'
                        }`}
                        disabled={connectionState === 'CONNECTING'}
                    >
                        {connectionState === 'CONNECTING' && 'Connecting...'}
                        {connectionState === 'CONNECTED' && 'Stop Conversation'}
                        {(connectionState === 'IDLE' || connectionState === 'DISCONNECTED' || connectionState === 'ERROR') && 'Start Conversation'}
                    </button>
                    {connectionState === 'ERROR' && <p className="text-red-400 mt-2">Connection failed. Please try again.</p>}
                </div>
            </div>
        </div>
    );
};

export default LiveTutor;
