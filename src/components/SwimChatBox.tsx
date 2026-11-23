import { useState, type FormEvent } from 'react';
import { ExternalLink, Loader2, MessageCircleQuestion, Send } from 'lucide-react';
import { getDemoChatReply, QUICK_TAP_QUESTIONS } from '../data/demoData.ts';
import type { ChatMessage } from '../types.ts';

interface SwimChatBoxProps {
  selectedBeachName: string | null;
  demoMode?: boolean;
  onEnableDemoMode?: () => void;
}

function isQuotaFailure(status: number, quotaFlag?: boolean, message?: string): boolean {
  if (status === 429 || quotaFlag) return true;
  const text = (message || '').toLowerCase();
  return text.includes('quota') || text.includes('resource_exhausted') || text.includes('429');
}

export function SwimChatBox({
  selectedBeachName,
  demoMode = false,
  onEnableDemoMode,
}: SwimChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function submitQuestion(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');

    // Demo mode runs locally with zero Gemini API calls
    if (demoMode) {
      const sample = getDemoChatReply(trimmed);
      const modelMsg: ChatMessage = {
        id: `demo-${Date.now()}`,
        role: 'model',
        text: sample.reply,
        sources: sample.sources,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, modelMsg]);
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          selectedBeachName: selectedBeachName || undefined,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        sources?: Array<{ title: string; uri: string }>;
        searchQueries?: string[];
        quotaExceeded?: boolean;
        error?: string;
      };

      if (!res.ok) {
        if (isQuotaFailure(res.status, data.quotaExceeded, data.error)) {
          onEnableDemoMode?.();
          const sample = getDemoChatReply(trimmed);
          const modelMsg: ChatMessage = {
            id: `demo-${Date.now()}`,
            role: 'model',
            text: sample.reply,
            sources: sample.sources,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, modelMsg]);
          return;
        }
        throw new Error(data.error || 'Could not reach the water safety assistant.');
      }

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || 'Please check Safeswim and official beach signage before swimming.',
        sources: data.sources || [],
        searchQueries: data.searchQueries || [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';
      if (isQuotaFailure(0, false, errMsg)) {
        onEnableDemoMode?.();
        const sample = getDemoChatReply(trimmed);
        const modelMsg: ChatMessage = {
          id: `demo-${Date.now()}`,
          role: 'model',
          text: sample.reply,
          sources: sample.sources,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, modelMsg]);
        return;
      }

      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'model',
        text:
          err instanceof Error
            ? err.message
            : 'Unable to fetch grounded swim advice right now. Please try again.',
        createdAt: new Date().toISOString(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    void submitQuestion(input);
  }

  return (
    <section
      id="ask-section"
      aria-label="Should I swim chat"
      className="bg-white rounded-2xl border border-[#D3E4EE] overflow-hidden flex flex-col"
    >
      <div className="px-5 py-4 border-b border-[#E6F0F6] bg-[#F7FBFE]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#026699] text-white flex items-center justify-center shrink-0">
            <MessageCircleQuestion className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0B2538] tracking-tight">
              Should I swim? · Me kauhoe rānei au?
            </h2>
            <p className="text-xs text-[#456173]">
              {demoMode
                ? 'Demo mode · Ask about Auckland beaches using sample data.'
                : 'Ask about any Auckland beach, recent rain, or Safeswim alerts.'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-[#456173]">
              Try asking · Whakamātauria ēnei pātai:
            </p>
            <div className="flex flex-col gap-2">
              {QUICK_TAP_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void submitQuestion(q)}
                  className="min-h-[44px] w-full text-left px-3.5 py-2.5 rounded-xl border border-[#D3E4EE] bg-[#F8FCFE] hover:bg-[#EAF4FA] hover:border-[#026699]/50 text-xs sm:text-sm font-medium text-[#0B2538] transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl p-3.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#026699] text-white ml-6'
                    : msg.error
                      ? 'bg-[#FEF4F4] border border-[#F9B4B4] text-[#991B1B] mr-2'
                      : 'bg-[#F4F9FC] border border-[#DCEBF3] text-[#0B2538] mr-2'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {msg.error && onEnableDemoMode && !demoMode && (
                  <div className="mt-2.5 pt-2 border-t border-[#F9B4B4]">
                    <button
                      type="button"
                      onClick={onEnableDemoMode}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Switch to Demo mode (sample data)
                    </button>
                  </div>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#D3E4EE] space-y-1.5">
                    <p className="text-[11px] font-semibold text-[#456173]">
                      {demoMode ? 'Sample References · Ngā Tauira' : 'Sources · Ngā Pūtake'}
                    </p>
                    <ul className="space-y-1">
                      {msg.sources.slice(0, 4).map((src) => (
                        <li key={src.uri}>
                          <a
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#026699] hover:text-[#024E78] underline underline-offset-2 break-all"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span>{src.title}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {isSending && (
              <div className="rounded-xl p-3.5 bg-[#F4F9FC] border border-[#DCEBF3] text-xs sm:text-sm text-[#456173] flex items-center gap-2 mr-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#026699] shrink-0" />
                <span>Searching Safeswim, weather, and Auckland Council updates...</span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="flex items-stretch gap-2 pt-1">
          <label htmlFor="swim-chat-input" className="sr-only">
            Ask if it is safe to swim in Auckland
          </label>
          <input
            id="swim-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedBeachName
                ? `Ask about ${selectedBeachName} or rain...`
                : 'e.g. Is Takapuna safe after yesterday’s rain?'
            }
            disabled={isSending}
            className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-[#C7DCE8] bg-white text-sm text-[#0B2538] placeholder:text-[#6B8596] focus:outline-none focus:ring-2 focus:ring-[#026699]/30 focus:border-[#026699]"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            aria-label="Send question"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#026699] hover:bg-[#024E78] disabled:bg-[#9CC1D6] text-white text-sm font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask · Pātai</span>
          </button>
        </form>

        <p className="text-[11px] font-medium text-[#456173]">
          Check official signage before swimming. · Tirohia ngā tohu mana i mua i te kauhoe.
        </p>
      </div>
    </section>
  );
}
