'use client';

import { Sparkles, ArrowRight, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BusinessInsight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  description: string;
}

interface Recommendation {
  id: string;
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedAction: string;
  category: string;
}

interface InsightsCardsProps {
  insights: BusinessInsight[];
  recommendations: Recommendation[];
  onApplyRecommendation: (actionText: string) => void;
  isLoading: boolean;
}

export function InsightsCards({
  insights,
  recommendations,
  onApplyRecommendation,
  isLoading,
}: InsightsCardsProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
      case 'danger':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
      default:
        return <Sparkles className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />;
    }
  };

  const getInsightBg = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-zinc-950 border-emerald-900/40 text-zinc-200';
      case 'warning':
        return 'bg-zinc-950 border-amber-900/40 text-zinc-200';
      case 'danger':
        return 'bg-zinc-950 border-rose-900/40 text-zinc-200';
      default:
        return 'bg-zinc-950 border-zinc-800/80 text-zinc-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-rose-950 text-rose-300 border border-rose-800 uppercase text-[9px] font-bold px-2 py-0.5">Urgent</Badge>;
      case 'medium':
        return <Badge className="bg-amber-950 text-amber-300 border border-amber-800 uppercase text-[9px] font-bold px-2 py-0.5">Medium</Badge>;
      default:
        return <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase text-[9px] font-bold px-2 py-0.5">Normal</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Operational Insights Card */}
      <div className="saas-card p-4 flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" /> Operational Insights
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">Live DB Metrics</span>
        </div>

        <div className="flex-1 flex flex-col gap-2.5">
          {insights.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8 text-xs text-zinc-500 italic">
              No operational insights generated. Speak or type commands above.
            </div>
          ) : (
            insights.map((insight) => (
              <div
                key={insight.id}
                className={`flex gap-3 p-3 rounded-xl border text-xs leading-relaxed transition-all ${getInsightBg(
                  insight.type
                )}`}
              >
                {getInsightIcon(insight.type)}
                <div className="space-y-0.5">
                  <p className="font-semibold text-zinc-100">{insight.title}</p>
                  <p className="text-zinc-400 font-medium text-[11px]">{insight.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Autonomous Recommendations Card */}
      <div className="saas-card p-4 flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" /> Autonomous Recommendations
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">One-Click Execution</span>
        </div>

        <div className="flex-1 flex flex-col gap-2.5">
          {recommendations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8 text-xs text-zinc-500 italic">
              Stock levels optimal. No restock actions suggested.
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between gap-4 p-3 border border-zinc-800/80 rounded-xl bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-150"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(rec.priority)}
                    <span className="text-[9px] bg-zinc-800 text-zinc-300 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                      {rec.category}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-100 truncate">{rec.title}</p>
                  <p className="text-[11px] text-zinc-400 line-clamp-1">
                    {rec.reason}
                  </p>
                </div>
                <Button
                  onClick={() => onApplyRecommendation(rec.suggestedAction)}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="shrink-0 h-8 text-xs px-3 gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-sm transition-all"
                >
                  <span>Apply</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
