import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { History, Trash2, Download, Search, ExternalLink } from 'lucide-react';

interface HistorySectionProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  history,
  onClearHistory,
  onSelectHistoryItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter((item) =>
    item.headline.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = ['Timestamp', 'Headline', 'Verdict', 'Confidence (%)', 'Clickbait Risk (0-100)', 'Subjectivity (%)'];
    const rows = history.map((item) => [
      new Date(item.timestamp).toISOString(),
      `"${item.headline.replace(/"/g, '""')}"`,
      item.verdict,
      item.confidence,
      item.clickbaitScore,
      item.subjectivity,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fakeai_forensic_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (history.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `fakeai_forensic_log_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section id="verification-history" className="w-full mt-10 mb-16">
      <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-6 md:p-8 shadow-xl shadow-black/40">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <History className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Recent Verification Log
              </h2>
              <span className="text-xs text-slate-500">
                Persistent local audit log of analyzed headlines and scores
              </span>
            </div>
          </div>

          {/* Action buttons & search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search headlines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-40 sm:w-52"
              />
            </div>

            {history.length > 0 && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Export audit log to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Export audit log to JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={onClearHistory}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Clear all stored history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Verification Log Table */}
        {filteredHistory.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">
            {history.length === 0
              ? 'No verification history yet. Analyze an article or click a quick-load benchmark to record entries.'
              : 'No matching entries found for current filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                  <th className="pb-3 px-3 font-semibold">Headline</th>
                  <th className="pb-3 px-3 font-semibold text-center">Verdict</th>
                  <th className="pb-3 px-3 font-semibold text-right">Confidence</th>
                  <th className="pb-3 px-3 font-semibold text-right">Clickbait</th>
                  <th className="pb-3 px-3 font-semibold text-right">Subjectivity</th>
                  <th className="pb-3 px-3 font-semibold text-right">Logged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectHistoryItem(item)}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-3 max-w-xs md:max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200 group-hover:text-blue-300 transition-colors line-clamp-1">
                          {item.headline || 'Untitled Article'}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-blue-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          item.verdict === 'LIKELY REAL NEWS'
                            ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/50'
                            : item.verdict === 'LIKELY FAKE NEWS'
                            ? 'bg-rose-950/70 text-rose-400 border-rose-800/50'
                            : 'bg-amber-950/70 text-amber-400 border-amber-800/50'
                        }`}
                      >
                        {item.verdict}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-300 tabular-nums">
                      {item.confidence}%
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          item.clickbaitScore >= 60
                            ? 'text-rose-400 font-semibold'
                            : item.clickbaitScore >= 30
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {item.clickbaitScore}/100
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-violet-400 tabular-nums">
                      {item.subjectivity}%
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
