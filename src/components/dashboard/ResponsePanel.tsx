'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, AlertCircle, Loader2, Play, ChevronDown, ChevronUp, 
  Brain, Cpu, ShieldCheck, Database, FileText, ClipboardList
} from 'lucide-react';

interface ExecutionStep {
  name: string;
  status: 'success' | 'warning' | 'error' | 'pending' | 'running';
  timeMs: number;
  confidence?: number;
  details?: string;
}

interface AgentState {
  name: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  timestamp: string;
}

interface ResponsePanelProps {
  lastResponse: {
    response: string;
    intent: string;
    entities?: any;
    clarificationNeeded?: boolean;
    disambiguationNeeded?: boolean;
    candidateProducts?: Array<{ id: string; name: string; unitPrice: number; currentStock: number; modelNumber?: string | null; attributes?: string | null }>;
    steps?: ExecutionStep[];
    agents?: AgentState[];
    thinking?: {
      intent: string;
      confidence: number;
      entities?: any;
      missingFields?: string[];
      validation?: string;
      reasoning?: string;
      stockBefore?: number;
      stockAfter?: number;
    };
    success?: boolean;
  } | null;
  isLoading: boolean;
  onUndo?: () => void;
  onSelectCandidate?: (productName: string) => void;
}

export function ResponsePanel({ lastResponse, isLoading, onUndo, onSelectCandidate }: ResponsePanelProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'thinking' | 'agents'>('timeline');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);


  const getStepIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />;
      default:
        return <Play className="w-4 h-4 text-zinc-600 shrink-0" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-zinc-200 font-medium';
      case 'warning':
        return 'text-amber-400 font-medium';
      case 'error':
        return 'text-rose-400 font-medium';
      case 'running':
        return 'text-emerald-400 font-medium animate-pulse';
      default:
        return 'text-zinc-500';
    }
  };

  const getAgentStatusBadge = (status: string) => {
    switch (status) {
      case 'working':
        return <Badge className="bg-emerald-950 text-emerald-300 hover:bg-emerald-950 border border-emerald-800 uppercase text-[9px] font-bold animate-pulse">working</Badge>;
      case 'completed':
        return <Badge className="bg-zinc-800 text-zinc-300 hover:bg-zinc-800 border border-zinc-700 uppercase text-[9px] font-bold">completed</Badge>;
      case 'error':
        return <Badge className="bg-rose-950 text-rose-300 hover:bg-rose-950 border border-rose-800 uppercase text-[9px] font-bold">error</Badge>;
      default:
        return <Badge className="bg-zinc-900 text-zinc-500 hover:bg-zinc-900 border border-zinc-800 uppercase text-[9px] font-bold">idle</Badge>;
    }
  };

  const getAgentIcon = (name: string) => {
    switch (name) {
      case 'Planner Agent': return <ClipboardList className="w-4 h-4 text-indigo-400" />;
      case 'Intent Agent': return <Brain className="w-4 h-4 text-emerald-400" />;
      case 'Inventory Agent': return <Database className="w-4 h-4 text-cyan-400" />;
      case 'Invoice Agent': return <FileText className="w-4 h-4 text-amber-400" />;
      default: return <Cpu className="w-4 h-4 text-zinc-400" />;
    }
  };

  const steps = lastResponse?.steps || [];
  const agents = lastResponse?.agents || [
    { name: 'Planner Agent', status: 'idle', timestamp: '--:--:--' },
    { name: 'Intent Agent', status: 'idle', timestamp: '--:--:--' },
    { name: 'Inventory Agent', status: 'idle', timestamp: '--:--:--' },
    { name: 'Invoice Agent', status: 'idle', timestamp: '--:--:--' },
    { name: 'Analytics Agent', status: 'idle', timestamp: '--:--:--' },
    { name: 'Recommendation Agent', status: 'idle', timestamp: '--:--:--' },
  ];
  const thinking = lastResponse?.thinking;

  return (
    <div className="saas-card flex flex-col justify-between overflow-hidden">
      {/* Header Tabs */}
      <div className="flex border-b border-zinc-800 bg-[#09090b]">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'timeline'
              ? 'border-emerald-500 text-emerald-400 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
          }`}
        >
          Execution Graph
        </button>
        <button
          onClick={() => setActiveTab('thinking')}
          className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'thinking'
              ? 'border-emerald-500 text-emerald-400 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
          }`}
        >
          AI Reasoning
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'agents'
              ? 'border-emerald-500 text-emerald-400 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
          }`}
        >
          Agents ({agents.filter(a => a.status === 'working').length})
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto max-h-[300px] min-h-[240px]">
        {isLoading && steps.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center py-12 text-zinc-400 gap-2.5">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
            <p className="text-xs font-medium animate-pulse text-zinc-300">Executing autonomous agent graph...</p>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-3">
            {steps.length === 0 && !isLoading ? (
              <div className="py-12 text-center text-xs text-zinc-500 italic">
                No active execution graph. Enter a transaction or stock command to inspect steps.
              </div>
            ) : (
              <div className="relative border-l border-zinc-800 pl-4 ml-2 space-y-3.5 pt-1">
                {steps.map((step, idx) => (
                  <div key={step.name + idx} className="relative">
                    <div className="absolute -left-[24px] top-0.5 bg-[#121215] rounded-full p-0.5 border border-zinc-800">
                      {getStepIcon(step.status)}
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                      <span className={`text-xs ${getStepColor(step.status)}`}>{step.name}</span>
                      <div className="flex items-center gap-2">
                        {step.confidence !== undefined && (
                          <span className="text-[10px] text-emerald-400 font-mono font-semibold bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                            {(step.confidence * 100).toFixed(0)}% conf
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {step.timeMs}ms
                        </span>
                        {step.details && (
                          <button
                            onClick={() => setExpandedStep(expandedStep === step.name ? null : step.name)}
                            className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                          >
                            {expandedStep === step.name ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {expandedStep === step.name && step.details && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400 bg-zinc-950 border border-zinc-800/80 p-2.5 rounded-lg font-mono">
                        {step.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Reasoning Tab */}
        {activeTab === 'thinking' && (
          <div className="space-y-4">
            {!thinking ? (
              <div className="py-12 text-center text-xs text-zinc-500 italic">
                No decision parameters loaded. Try checking stock or recording inventory first.
              </div>
            ) : (
              <div className="text-xs space-y-3 leading-normal">
                <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <div>
                    <span className="text-zinc-500 font-medium mr-2 uppercase tracking-wider text-[9px]">Classified Intent:</span>
                    <span className="font-semibold text-zinc-200 uppercase text-[11px]">{thinking.intent.replace('_', ' ')}</span>
                  </div>
                  <span className="font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded text-[11px]">
                    {(thinking.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>

                {thinking.entities && (
                  <div className="space-y-1.5">
                    <p className="font-medium text-zinc-400 text-[10px] uppercase tracking-wider">Parsed Entities</p>
                    <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-3 border border-zinc-800 rounded-xl font-mono text-zinc-300">
                      <div>
                        <span className="text-zinc-500">Product:</span>{' '}
                        <span className="font-bold text-emerald-400">{thinking.entities.productName || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Quantity:</span>{' '}
                        <span className="font-bold text-zinc-100">{thinking.entities.quantity || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Unit Price:</span>{' '}
                        <span className="font-bold text-zinc-100">
                          {thinking.entities.unitPrice ? `₹${thinking.entities.unitPrice.toLocaleString('en-IN')}` : 'None'}
                        </span>
                      </div>
                      {thinking.entities.customerName && (
                        <div>
                          <span className="text-zinc-500">Customer:</span>{' '}
                          <span className="font-bold text-zinc-100">{thinking.entities.customerName}</span>
                        </div>
                      )}
                      {thinking.entities.supplier && (
                        <div>
                          <span className="text-zinc-500">Supplier:</span>{' '}
                          <span className="font-bold text-zinc-100">{thinking.entities.supplier}</span>
                        </div>
                      )}
                      {thinking.stockBefore !== undefined && (
                        <div className="col-span-2 border-t border-zinc-800 pt-2 mt-1">
                          <span className="text-zinc-400 font-medium">Stock Delta:</span>{' '}
                          <span className="font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                            {thinking.stockBefore} → {thinking.stockAfter} units
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {thinking.validation && (
                  <div className="space-y-1">
                    <p className="font-medium text-zinc-400 text-[10px] uppercase tracking-wider">Business Rule Check</p>
                    <p className="text-zinc-200 font-medium flex items-center gap-2 bg-emerald-950/30 border border-emerald-800/50 p-2.5 rounded-xl">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      {thinking.validation}
                    </p>
                  </div>
                )}

                {thinking.reasoning && (
                  <div className="space-y-1">
                    <p className="font-medium text-zinc-400 text-[10px] uppercase tracking-wider">Reasoning Logs</p>
                    <p className="text-zinc-300 font-medium leading-relaxed italic bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                      &quot;{thinking.reasoning}&quot;
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="grid grid-cols-2 gap-2">
            {agents.map((agent) => (
              <div 
                key={agent.name} 
                className="flex items-center justify-between p-2.5 border border-zinc-800 bg-zinc-950 rounded-xl hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg shrink-0">
                    {getAgentIcon(agent.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">{agent.name}</p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Last active: {agent.timestamp}</p>
                  </div>
                </div>
                {getAgentStatusBadge(agent.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Execution Output Footer */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-2.5">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${lastResponse?.success === false ? 'text-rose-400' : 'text-emerald-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Execution Output Summary</p>
            <p className="text-xs font-semibold text-zinc-200 mt-0.5 leading-snug">
              {lastResponse?.response || 'Awaiting inventory instructions. Enter a command above to begin.'}
            </p>

            {lastResponse?.disambiguationNeeded && lastResponse.candidateProducts && lastResponse.candidateProducts.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <span>⚡ Tap to select exact variant:</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {lastResponse.candidateProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectCandidate && onSelectCandidate(p.name)}
                      className="text-xs font-semibold bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700/90 text-emerald-200 px-3 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{p.name}</span>
                      {p.modelNumber && <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/80 px-1.5 py-0.2 rounded">#{p.modelNumber}</span>}
                      {p.attributes && <span className="text-[10px] text-zinc-300 italic">({p.attributes})</span>}
                      <span className="text-[10px] font-mono text-emerald-400 font-bold ml-1">₹{p.unitPrice}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {onUndo && (
          <button
            onClick={onUndo}
            className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            title="Reverse the last action"
          >
            Undo Action ↩️
          </button>
        )}
      </div>
    </div>
  );
}

