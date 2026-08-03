'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Brain, Code2, ChevronRight, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AILog {
  id: string;
  rawInput?: string;
  userPrompt?: string;
  detectedIntent?: string;
  intent?: string;
  extractedEntities?: string;
  entities?: string;
  actionTaken?: string;
  status?: string;
  success?: boolean;
  errorMessage?: string;
  metadata?: string;
  timestamp: string;
}

interface AILogTabProps {
  logs?: AILog[];
}

export function AILogTab({ logs = [] }: AILogTabProps) {
  const [selectedLog, setSelectedLog] = useState<AILog | null>(logs[0] || null);

  const getLogPrompt = (log: AILog) => log.rawInput || log.userPrompt || '';
  const getLogIntent = (log: AILog) => log.detectedIntent || log.intent || 'unknown';
  const getLogEntities = (log: AILog) => log.extractedEntities || log.entities || '{}';
  const isSuccess = (log: AILog) => log.status === 'success' || log.success === true;
  const isClarification = (log: AILog) => log.status === 'clarification_needed';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: AI Log History Table */}
      <div className="lg:col-span-2 saas-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">AI Trace &amp; Agent Execution Logs</h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">Developer audit trail for intent classification and entity parsing</p>
          </div>
          <Badge className="bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono text-xs px-3 py-1 self-start sm:self-center">
            {logs.length} Trace Logs
          </Badge>
        </div>

        <div className="max-h-[420px] overflow-y-auto border border-zinc-800/80 rounded-xl overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-950 sticky top-0 z-10 border-b border-zinc-800">
              <TableRow className="hover:bg-transparent border-zinc-800">
                <TableHead className="text-xs font-semibold text-zinc-300">Prompt Command</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300">Classified Intent</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-center">Status</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-center">Timestamp</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-center">Inspect</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-xs text-zinc-500 italic">
                    No AI activity recorded yet. Speak or type commands in the terminal above.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const promptText = getLogPrompt(log);
                  const intentText = getLogIntent(log);
                  const ok = isSuccess(log);
                  const clarification = isClarification(log);

                  return (
                    <TableRow 
                      key={log.id} 
                      className={`hover:bg-zinc-800/40 border-b border-zinc-800/60 transition-colors cursor-pointer ${
                        selectedLog?.id === log.id ? 'bg-zinc-800/60' : ''
                      }`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="font-mono text-xs text-zinc-100 max-w-[180px] sm:max-w-[240px] truncate">
                        &quot;{promptText}&quot;
                      </TableCell>
                      <TableCell className="text-xs text-emerald-400 font-mono font-bold uppercase whitespace-nowrap">
                        {intentText.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {ok ? (
                          <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] font-mono">
                            SUCCESS
                          </Badge>
                        ) : clarification ? (
                          <Badge className="bg-amber-950 text-amber-300 border border-amber-800 text-[9px] font-mono">
                            CLARIFICATION
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-mono">
                            FAILED
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-center font-mono text-zinc-400 whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-IN', { timeStyle: 'medium' }) : 'Recently'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-100">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Right: Deep JSON Trace Inspector */}
      <div className="saas-card p-5 flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" /> Trace Payload Inspector
          </h4>
          <span className="text-[10px] text-zinc-400 font-mono">Raw JSON Payload</span>
        </div>

        {selectedLog ? (
          <div className="flex-1 space-y-3 font-mono text-xs">
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl space-y-1">
              <p className="text-zinc-500 text-[10px] uppercase font-bold">Input Prompt:</p>
              <p className="text-emerald-400 font-semibold">&quot;{getLogPrompt(selectedLog)}&quot;</p>
              {selectedLog.actionTaken && (
                <p className="text-zinc-300 text-[11px] mt-1 pt-1 border-t border-zinc-800/80">
                  <span className="text-zinc-500 text-[10px]">Action Taken: </span>
                  {selectedLog.actionTaken}
                </p>
              )}
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl space-y-1.5 max-h-[260px] overflow-y-auto">
              <p className="text-zinc-500 text-[10px] uppercase font-bold flex items-center gap-1">
                <Terminal className="w-3 h-3 text-emerald-400" /> Extracted Entities JSON:
              </p>
              <pre className="text-[11px] text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
                {(() => {
                  try {
                    const raw = getLogEntities(selectedLog);
                    return JSON.stringify(typeof raw === 'string' ? JSON.parse(raw) : raw, null, 2);
                  } catch (e) {
                    return getLogEntities(selectedLog) || '{}';
                  }
                })()}
              </pre>
            </div>

            {selectedLog.metadata && (
              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl space-y-1 max-h-[160px] overflow-y-auto">
                <p className="text-zinc-500 text-[10px] uppercase font-bold">Execution Step Timings:</p>
                <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap">
                  {(() => {
                    try {
                      return JSON.stringify(typeof selectedLog.metadata === 'string' ? JSON.parse(selectedLog.metadata) : selectedLog.metadata, null, 2);
                    } catch (e) {
                      return selectedLog.metadata;
                    }
                  })()}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-zinc-500 text-center gap-2">
            <Brain className="w-8 h-8 text-zinc-700" />
            <p className="text-xs font-medium">Select a trace log row from the table to view the raw JSON payload and agent step timings.</p>
          </div>
        )}
      </div>
    </div>
  );
}