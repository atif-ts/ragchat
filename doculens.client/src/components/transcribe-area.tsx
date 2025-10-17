import { useState, useEffect } from 'react';
import { Mic, MicOff, Trash2, FileText } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export const TranscribeArea = () => {
    const [transcript, setTranscript] = useState('');
    const {
        transcript: webTranscript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition,
    } = useSpeechRecognition();

    /* keep local state in sync */
    useEffect(() => {
        setTranscript(webTranscript);
    }, [webTranscript]);

    if (!browserSupportsSpeechRecognition) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-500">
                <p>Your browser does not support speech recognition.</p>
            </div>
        );
    }

    const toggleListening = () => {
        if (listening) {
            SpeechRecognition.stopListening();
        } else {
            SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
        }
    };

    const clearTranscript = () => {
        resetTranscript();
        setTranscript('');
    };

    const generateTemplate = () => {
        const stub = `[DATE]\n[SPEAKER]\n\n${transcript || '[TRANSCRIBED TEXT]'}\n\n[NOTES]`;
        setTranscript(stub);
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-50">
            {/* header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3">
                <h2 className="text-lg font-semibold text-gray-800">Live Transcription</h2>
                <p className="text-sm text-gray-600">Click the mic to start / stop</p>
            </div>

            {/* transcript box */}
            <div className="flex-1 p-4 overflow-y-auto">
                {transcript ? (
                    <div className="whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-4 text-gray-800">
                        {transcript}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <FileText className="h-12 w-12 mb-2" />
                        <p>Your transcription will appear here…</p>
                    </div>
                )}
            </div>

            {/* control bar */}
            <div className="bg-white border-t border-gray-200 px-4 py-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleListening}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white
              ${listening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        {listening ? 'Stop' : 'Start'}
                    </button>

                    <button
                        onClick={clearTranscript}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
                    >
                        <Trash2 className="h-4 w-4" />
                        Clear
                    </button>

                    <button
                        onClick={generateTemplate}
                        className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700"
                    >
                        <FileText className="h-4 w-4" />
                        Generate Template
                    </button>
                </div>
            </div>
        </div>
    );
};