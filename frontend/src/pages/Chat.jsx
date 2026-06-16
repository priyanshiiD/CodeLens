import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowUp, Menu, Trash2 } from 'lucide-react';
import * as apiClient from '../api/client';
import { formatChatHistory, getHistoryPairs, SUGGESTED_QUESTIONS } from '../utils/chat';
import { getRepoName } from '../utils/format';
import ChatSidebar from '../components/chat/ChatSidebar';
import MessageBubble from '../components/chat/MessageBubble';
import TypingIndicator from '../components/chat/TypingIndicator';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repoUrl = searchParams.get('repo');

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [answering, setAnswering] = useState(false);
  const [repoStatus, setRepoStatus] = useState(null);
  const [repoDetails, setRepoDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const messagesEndRef = useRef(null);
  const lastAiMsgRef = useRef(null);
  const inputRef = useRef(null);
  const historyPairs = useMemo(() => getHistoryPairs(messages), [messages]);
  const repoName = getRepoName(repoUrl);
  const isReady = repoStatus === 'completed';

  const scrollToBottom = useCallback(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), []);
  const scrollToMessage = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setActiveHistoryId(id);
    setSidebarOpen(false);
  }, []);

  // Auto-grow textarea
  const handleTextareaChange = (e) => {
    setQuestion(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 144) + 'px';
  };

  // Scroll: when user sends → scroll to bottom (show typing indicator)
  //         when AI responds → scroll to TOP of the new AI message
  const prevAnsweringRef = useRef(false);
  useEffect(() => {
    if (activeTab !== 'chat') return;
    const wasAnswering = prevAnsweringRef.current;
    prevAnsweringRef.current = answering;
    // AI just finished responding
    if (wasAnswering && !answering && lastAiMsgRef.current) {
      lastAiMsgRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // User sent or initial load — scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, answering, activeTab]);

  useEffect(() => {
    if (!repoUrl) { navigate('/dashboard'); return; }
    (async () => {
      try {
        const [history, status] = await Promise.all([
          apiClient.getChatHistory(repoUrl),
          apiClient.getRepoStatus(repoUrl),
        ]);
        setMessages(formatChatHistory(history));
        setRepoStatus(status.status);
        setRepoDetails(status.details || null);
      } catch (e) {
        if (e.response?.status === 404) navigate('/dashboard');
        else toast.error('Failed to load chat workspace');
      } finally {
        setLoading(false);
      }
    })();
  }, [repoUrl, navigate]);

  useEffect(() => {
    if (!repoUrl || repoStatus !== 'processing') return;
    let timer;
    const checkStatus = async () => {
      try {
        const res = await apiClient.getRepoStatus(repoUrl);
        setRepoStatus(res.status);
        if (res.details) setRepoDetails(res.details);
        if (res.status === 'processing') timer = setTimeout(checkStatus, 5000);
        else if (res.status === 'completed') toast.success('Indexing complete! Workspace is ready.');
        else if (res.status === 'failed') toast.error('Indexing failed.');
      } catch {
        timer = setTimeout(checkStatus, 10000);
      }
    };
    timer = setTimeout(checkStatus, 5000);
    return () => clearTimeout(timer);
  }, [repoUrl, repoStatus]);

  const sendQuestion = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || answering || !isReady) return;
    setActiveTab('chat');
    setSidebarOpen(false);
    setMessages((p) => [...p, { id: `user-${Date.now()}`, role: 'user', content: trimmed, created_at: new Date().toISOString() }]);
    setQuestion('');
    // Reset textarea height
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
    try {
      setAnswering(true);
      const res = await apiClient.askQuestion(repoUrl, trimmed);
      setMessages((p) => [...p, {
        id: `ai-${Date.now()}`, role: 'assistant',
        answer: res.answer, sources: res.sources || [],
        chunks_used: res.chunks_used, created_at: new Date().toISOString(),
      }]);
    } catch (e) {
      const err = e.response?.data?.error || 'Failed to generate answer';
      setMessages((p) => [...p, { id: `err-${Date.now()}`, role: 'assistant', error: err, created_at: new Date().toISOString() }]);
    } finally {
      setAnswering(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setShowClearModal(false);
    toast.success('Conversation cleared');
  };

  if (loading) {
    return (
      <div className="h-screen app-bg flex items-center justify-center">
        <Spinner label="Loading workspace" />
      </div>
    );
  }

  return (
    <div className="h-screen app-bg flex overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto h-full transform transition-transform duration-200 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <ChatSidebar
          repoName={repoName}
          repoUrl={repoUrl}
          repoStatus={repoStatus}
          repoDetails={repoDetails}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          historyPairs={historyPairs}
          onHistorySelect={scrollToMessage}
          activeHistoryId={activeHistoryId}
          onBack={() => navigate('/dashboard')}
          onSuggest={sendQuestion}
          answering={answering}
          isReady={isReady}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 h-12 border-b border-white/[0.06] bg-[#080d14]/70 backdrop-blur-xl flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-md transition-colors cursor-pointer"
          >
            <Menu size={17} />
          </button>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="#8b949e" className="flex-shrink-0">
              <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
            </svg>
            <span className="text-sm font-semibold text-[#e6edf3] truncate">{repoName}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {repoStatus && <Badge status={repoStatus} />}
            {messages.length > 0 && (
              <button
                onClick={() => setShowClearModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#8b949e] hover:text-[#f85149] hover:bg-[#3d1a1a] rounded-md border border-transparent hover:border-[#f85149]/20 transition-all cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] w-full mx-auto px-4 md:px-8 py-8 space-y-6">
            {/* Welcome / empty state */}
            {messages.length === 0 && (
              <div className="animate-fade-in">
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 text-xs text-[#8b949e] bg-[#161b22] border border-[#21262d] px-3 py-1.5 rounded-full mb-4">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isReady ? 'bg-[#3fb950]' : 'bg-[#d29922] animate-pulse'}`} />
                    {isReady ? `${repoName} is indexed and ready` : 'Indexing in progress…'}
                  </div>
                  <h2 className="text-2xl font-semibold text-[#e6edf3] mb-2 leading-tight">
                    {isReady ? `Ask anything about\n${repoName}` : 'Preparing your workspace'}
                  </h2>
                  <p className="text-sm text-[#8b949e] leading-relaxed">
                    {isReady
                      ? 'Ask about functions, architecture, patterns, or any specific code in the repository.'
                      : "We're parsing and embedding the codebase. This usually takes 1–3 minutes."}
                  </p>
                </div>

                {isReady && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
                      <button
                        key={q}
                        onClick={() => sendQuestion(q)}
                        disabled={answering}
                        className="text-left text-sm text-[#c9d1d9] bg-[#161b22] border border-[#21262d] hover:border-[#388bfd]/50 hover:bg-[#1c2128] px-4 py-4 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-40 group"
                      >
                        <span className="block text-[11px] text-[#6e7681] font-medium mb-1.5 group-hover:text-[#58a6ff] transition-colors">
                          Suggested question
                        </span>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, idx) => {
              const isLastAi = msg.role === 'assistant' && idx === messages.length - 1;
              return (
                <div key={msg.id} ref={isLastAi ? lastAiMsgRef : null}>
                  <MessageBubble msg={msg} repoUrl={repoUrl} />
                </div>
              );
            })}
            {answering && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 pb-5 pt-3 border-t border-white/[0.06] bg-[#080d14]/60 backdrop-blur-md">
          <form
            onSubmit={(e) => { e.preventDefault(); sendQuestion(question); }}
            className="max-w-[1200px] mx-auto w-full px-4 md:px-8"
          >
            <div className="flex items-end gap-2 bg-[#161b22] border border-[#30363d] focus-within:border-[#388bfd] focus-within:shadow-[0_0_0_3px_rgba(56,139,253,0.12)] rounded-xl px-4 py-3 transition-all">
              <textarea
                ref={inputRef}
                value={question}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendQuestion(question);
                  }
                }}
                placeholder={isReady ? 'Ask a question about the codebase…' : 'Indexing in progress, please wait…'}
                disabled={answering || !isReady}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none py-0.5 max-h-36 disabled:opacity-50 leading-relaxed overflow-y-auto"
                style={{ height: 'auto' }}
              />
              <button
                type="submit"
                disabled={answering || !question.trim() || !isReady}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0 cursor-pointer active:scale-95"
              >
                <ArrowUp size={15} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[11px] text-[#6e7681] text-center mt-2">
              <kbd className="bg-[#21262d] border border-[#30363d] rounded px-1 py-0.5 text-[10px]">Enter</kbd> to send ·{' '}
              <kbd className="bg-[#21262d] border border-[#30363d] rounded px-1 py-0.5 text-[10px]">Shift+Enter</kbd> for new line
            </p>
          </form>
        </div>
      </div>

      {/* Clear chat modal */}
      <ConfirmModal
        isOpen={showClearModal}
        title="Clear conversation"
        message="This will remove all messages from the current view. Your indexed repository data will not be affected."
        confirmLabel="Clear conversation"
        onConfirm={handleClearChat}
        onCancel={() => setShowClearModal(false)}
        danger={false}
      />
    </div>
  );
}
