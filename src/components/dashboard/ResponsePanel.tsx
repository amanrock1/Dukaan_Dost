'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
}

export function ResponsePanel() {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = (text: string, type: Message['type'] = 'info') => {
    setMessages(prev => [{ id: crypto.randomUUID(), text, type, timestamp: new Date() }, ...prev].slice(0, 50));
  };

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
    error: <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
    info: <HelpCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />,
  };

  const borderMap = {
    success: 'border-l-emerald-500',
    error: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-sky-500',
  };

  return { messages, addMessage, panel: (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          AI Response
        </h3>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No activity yet. Try typing a command above.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2 text-sm p-2.5 rounded-lg bg-muted/50 border-l-4 ${borderMap[m.type]}`}>
              {iconMap[m.type]}
              <div className="flex-1 min-w-0">
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {m.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ) };
}
