'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2, Volume2, Sparkles, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface InputAreaProps {
  onSubmit: (input: string, source: 'text' | 'voice') => Promise<void>;
  isLoading: boolean;
  input: string;
  setInput: (value: string) => void;
}

const ROTATING_PLACEHOLDERS = [
  'e.g. "Sold 5 Logitech MX Master mice for ₹8,000 each"',
  'e.g. "Bought 20 Notebooks at ₹50 from Raj Supplier"',
  'e.g. "Check stock level of Wireless Keyboard"',
  'e.g. "Generate GST invoice for last sale"',
  'e.g. "Which products are running low on stock?"',
  'e.g. "How much GST did I collect today?"',
];

export function InputArea({ onSubmit, isLoading, input, setInput }: InputAreaProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await onSubmit(text, 'text');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size < 1000) {
          toast.error('Recording too short or silent. Please speak clearly into the mic.');
          setIsRecording(false);
          return;
        }

        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const b64 = result.split(',')[1];
              if (b64 && b64.length > 50) resolve(b64);
              else reject(new Error('Empty audio data'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64 }),
          });

          const data = await res.json();

          if (!res.ok || data.error) {
            toast.error(data.error || 'Transcription failed. Please try again.');
          } else if (data.text && data.text.trim()) {
            const transcribedText = data.text.trim();
            setInput(transcribedText);
            await onSubmit(transcribedText, 'voice');
            setInput('');
          } else {
            toast.error('No speech detected. Please speak louder and try again.');
          }
        } catch (err) {
          console.error('Voice transcription error:', err);
          toast.error('Voice transcription failed. Check your internet connection.');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(500);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Microphone access denied. Click lock icon in address bar to enable.');
      } else if (err.name === 'NotFoundError') {
        toast.error('No microphone found. Connect a microphone and try again.');
      } else {
        toast.error('Could not access microphone: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) stopRecording();
    else await startRecording();
  };

  return (
    <div className="space-y-3">
      {/* Subheader */}
      <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
        <span className="flex items-center gap-1.5 text-zinc-300">
          <Command className="w-3.5 h-3.5 text-emerald-400" />
          Natural Language Command Console
        </span>
        <span className="font-mono text-[11px] text-zinc-500">Multilingual (Hindi / English)</span>
      </div>

      {/* Textarea container */}
      <div className="command-ring relative rounded-xl border border-zinc-800 bg-[#09090b] transition-all duration-200">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ROTATING_PLACEHOLDERS[placeholderIndex]}
          className="min-h-[100px] max-h-[220px] resize-none text-sm bg-transparent border-none text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0 font-medium p-3.5 outline-none"
          disabled={isLoading || isTranscribing}
        />

        {/* Console action bar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800/80 bg-zinc-950/50 rounded-b-xl">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
            <span>Press <kbd className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-bold">↵ Enter</kbd> to execute</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mic trigger button */}
            <Button
              onClick={toggleRecording}
              variant={isRecording ? 'destructive' : 'outline'}
              size="sm"
              className={`h-8 px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-all ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
              disabled={isTranscribing || isLoading}
            >
              {isTranscribing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : isRecording ? (
                <MicOff className="w-3.5 h-3.5 text-white" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span>{isRecording ? 'Recording...' : 'Voice Input'}</span>
            </Button>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading || isTranscribing}
              size="sm"
              className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 shadow-md shadow-emerald-950 transition-all"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Execute</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Voice Recording Active Bar */}
      {isRecording && (
        <div className="flex items-center justify-between p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs font-semibold text-rose-300">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-rose-400" />
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
            Listening to voice input... speak clearly into your mic
          </div>
          <div className="flex items-center gap-1 h-4">
            {[60, 90, 100, 75, 95, 60, 85].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-rose-400 rounded-full animate-wave"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {isTranscribing && (
        <div className="flex items-center gap-2.5 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs font-semibold text-emerald-300">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          Whisper AI Model is processing and transcribing audio...
        </div>
      )}
    </div>
  );
}