'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';

interface AILog {
  id: string;
  timestamp: string;
  rawInput: string;
  detectedIntent: string;
  extractedEntities: string;
  actionTaken: string;
  status: string;
  errorMessage: string | null;
}

interface AILogTabProps {
  logs: AILog[];
}

const intentLabels: Record<string, string> = {
  record_sale: 'Record Sale',
  record_purchase: 'Record Purchase',
  check_stock: 'Check Stock',
  generate_invoice: 'Generate Invoice',
  unknown: 'Unknown',
};

const intentColors: Record<string, string> = {
  record_sale: 'bg-emerald-100 text-emerald-700',
  record_purchase: 'bg-sky-100 text-sky-700',
  check_stock: 'bg-amber-100 text-amber-700',
  generate_invoice: 'bg-violet-100 text-violet-700',
  unknown: 'bg-gray-100 text-gray-700',
};

export function AILogTab({ logs }: AILogTabProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-600" /> AI Activity Log
          </CardTitle>
          <p className="text-xs text-muted-foreground">Agent traceability</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[420px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No AI activity yet. Start by typing a command.
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                let entities: Record<string, unknown> = {};
                try { entities = JSON.parse(log.extractedEntities); } catch {}

                return (
                  <div key={log.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium truncate">&quot;{log.rawInput}&quot;</p>
                      <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${intentColors[log.detectedIntent] || ''}`}>
                        {intentLabels[log.detectedIntent] || log.detectedIntent}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{log.actionTaken}</span>
                      <span>·</span>
                      <Badge variant={log.status === 'success' ? 'secondary' : 'destructive'} className="text-[10px] px-1.5 py-0">
                        {log.status}
                      </Badge>
                      {log.errorMessage && <span className="text-red-500 truncate">{log.errorMessage}</span>}
                    </div>
                    {Object.keys(entities).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(entities).map(([k, v]) => (
                          <span key={k} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                            {k}: {String(v).substring(0, 30)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}