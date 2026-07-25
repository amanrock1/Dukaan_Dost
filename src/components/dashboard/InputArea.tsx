'use client';

import { useState, useRef } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface InputAreaProps {
  onSubmit: (input: string, source: 'text' | 'voice') => Promise<void>;
  isLoading: boolean;
}

export function InputArea({ onSubmit, isLoading }: InputAreaProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64 }),
            });
            const data = await res.json();
            if (data.text) {
              setInput(data.text);
              await onSubmit(data.text, 'voice');
              setInput('');
            }
          } catch (err) {
            console.error('Transcription failed:', err);
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  return (
    <Card className="border-2 border-dashed border-emerald-200 bg-emerald-50/30">
      <CardContent className="p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Type a request... e.g. "5 laptops sold for 40000 each" or "bought 20 notebooks at 50 rupees"'
              className="min-h-[56px] max-h-[120px] resize-none pr-4 text-sm bg-white border-emerald-200 focus-visible:ring-emerald-400"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={toggleRecording}
            variant={isRecording ? 'destructive' : 'outline'}
            size="icon"
            className={`h-[56px] w-[56px] shrink-0 ${isRecording ? '' : 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300'}`}
            disabled={isTranscribing}
          >
            {isTranscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="h-[56px] w-[56px] shrink-0 bg-emerald-600 hover:bg-emerald-700"
            size="icon"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
        {isRecording && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Recording... tap mic to stop
          </div>
        )}
      </CardContent>
    </Card>
  );
}