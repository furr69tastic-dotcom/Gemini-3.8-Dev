import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Settings, 
  Sparkles, 
  HelpCircle, 
  Compass, 
  Youtube, 
  MapPin, 
  FileText, 
  X,
  Volume2,
  Check,
  BrainCircuit,
  Search
} from 'lucide-react';
import { ChatSession, VoiceName } from '../types/gemini';
import { GeminiSparkleIcon } from './GeminiSparkleIcon';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
  activeVoice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
  extendedThinking: boolean;
  onToggleExtendedThinking: () => void;
  groundingEnabled: boolean;
  onToggleGrounding: () => void;
  isFrameEnabled: boolean;
  onToggleFrame: () => void;
  autoSpeechEnabled: boolean;
  onToggleAutoSpeech: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearAll,
  activeVoice,
  onVoiceChange,
  extendedThinking,
  onToggleExtendedThinking,
  groundingEnabled,
  onToggleGrounding,
  isFrameEnabled,
  onToggleFrame,
  autoSpeechEnabled,
  onToggleAutoSpeech,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sessions by keyword matching title or messages
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;

    return sessions.filter((s) => {
      // Match title
      if (s.title && s.title.toLowerCase().includes(q)) return true;
      // Match message contents
      if (
        s.messages &&
        s.messages.some((m) => m.text && m.text.toLowerCase().includes(q))
      ) {
        return true;
      }
      return false;
    });
  }, [sessions, searchQuery]);

  // Extract a contextual message snippet showing the query match
  const getMatchingSnippet = (session: ChatSession, query: string) => {
    if (!query) return null;
    const lowerQuery = query.toLowerCase();
    const matchingMsg = session.messages.find(
      (m) => m.text && m.text.toLowerCase().includes(lowerQuery)
    );
    if (!matchingMsg || !matchingMsg.text) return null;

    const idx = matchingMsg.text.toLowerCase().indexOf(lowerQuery);
    const start = Math.max(0, idx - 18);
    const end = Math.min(matchingMsg.text.length, idx + query.length + 28);
    const snippet =
      (start > 0 ? '…' : '') +
      matchingMsg.text.slice(start, end).replace(/\s+/g, ' ').trim() +
      (end < matchingMsg.text.length ? '…' : '');
    return snippet;
  };

  if (!isOpen) return null;

  const voices: VoiceName[] = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose} 
      />

      {/* Drawer Panel */}
      <div className="relative w-[300px] sm:w-[320px] max-w-[85vw] h-full bg-[#1e1f20] border-r border-zinc-800 flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-250">
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GeminiSparkleIcon className="w-5 h-5" />
            <span className="font-semibold text-sm tracking-tight text-white">Gemini 3.8</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gemini Advanced Member Badge Banner */}
        <div className="mx-3 mt-3 p-3 rounded-2xl bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-pink-900/20 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-white">Gemini Advanced</span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-snug">
            3.8 Pro Extended reasoning with 32k thinking trace and ultra-low latency Live voice.
          </p>
        </div>

        {/* New Chat Button */}
        <div className="p-3 pb-2">
          <button
            onClick={() => {
              onNewChat();
              setSearchQuery('');
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#282a2c] hover:bg-zinc-700/70 text-zinc-200 hover:text-white border border-zinc-700/50 transition-colors cursor-pointer text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>New chat</span>
          </button>
        </div>

        {/* Search Chats Input Bar */}
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats by keyword..."
              className="w-full pl-8.5 pr-8 py-2 rounded-xl bg-[#282a2c] text-xs text-zinc-200 placeholder-zinc-500 border border-zinc-700/50 focus:border-blue-500/70 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700/60 cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 no-scrollbar">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1.5">
            <span>{searchQuery.trim() ? 'Search Results' : 'Recent'}</span>
            {searchQuery.trim() && (
              <span className="text-[10px] text-zinc-500 font-normal normal-case">
                {filteredSessions.length} {filteredSessions.length === 1 ? 'chat' : 'chats'}
              </span>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            searchQuery.trim() ? (
              <div className="text-center py-6 px-3">
                <Search className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-medium">No chats found</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 break-words">
                  No conversations match "{searchQuery}"
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 rounded-lg border border-blue-800/40 transition-colors cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 px-3 py-2 italic">
                No conversations yet
              </div>
            )
          ) : (
            filteredSessions.map((s) => {
              const isSelected = s.id === activeSessionId;
              const snippet = searchQuery.trim()
                ? getMatchingSnippet(s, searchQuery.trim())
                : null;

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    onSelectSession(s.id);
                    onClose();
                  }}
                  className={`group w-full flex items-start justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/30'
                      : 'text-zinc-300 hover:bg-[#282a2c]'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.title || 'Untitled conversation'}</div>
                      {snippet && (
                        <div className="text-[10px] text-zinc-400 truncate mt-0.5 italic">
                          "{snippet}"
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => onDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 hover:bg-red-500/10 transition-opacity ml-2 shrink-0"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}

          {/* Gemini Android Extensions */}
          <div className="pt-4 pb-1">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-zinc-400" />
              <span>Extensions</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:bg-[#282a2c] cursor-pointer">
                <Youtube className="w-3.5 h-3.5 text-red-400" />
                <span>YouTube</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:bg-[#282a2c] cursor-pointer">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Maps</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:bg-[#282a2c] cursor-pointer">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Google Workspace</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Settings & Clear */}
        <div className="p-3 border-t border-zinc-800 bg-[#1e1f20] space-y-1.5">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:bg-[#282a2c] hover:text-white transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>Settings & Voice</span>
          </button>

          {sessions.length > 1 && (
            <button
              onClick={onClearAll}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear all chats</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Dialog Overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#1e1f20] border border-zinc-700 rounded-3xl p-5 w-full max-w-sm shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <h4 className="font-semibold text-sm text-white">Gemini 3.8 Settings</h4>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voice persona selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-zinc-300">Voice Personas</span>
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="space-y-1.5">
                {[
                  { name: 'Puck' as VoiceName, desc: 'American Male • New Chat & Live' },
                  { name: 'Fenrir' as VoiceName, desc: 'American Male • Extended & Architecture' },
                  { name: 'Charon' as VoiceName, desc: 'British English Male • Search Grounding' },
                  { name: 'Kore' as VoiceName, desc: 'American Female • Gentle' },
                  { name: 'Zephyr' as VoiceName, desc: 'Neutral Female • Crisp' },
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => onVoiceChange(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer ${
                      activeVoice === item.name
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-[#282a2c] text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{item.name}</span>
                      <span className={`text-[10px] ${activeVoice === item.name ? 'text-blue-100' : 'text-zinc-400'}`}>
                        {item.desc}
                      </span>
                    </div>
                    {activeVoice === item.name && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Extended Thinking */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div>
                <div className="font-medium text-zinc-200">Extended Thinking</div>
                <div className="text-[10px] text-zinc-400">Step-by-step reasoning trace</div>
              </div>
              <button
                onClick={onToggleExtendedThinking}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  extendedThinking ? 'bg-blue-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${
                    extendedThinking ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Google Search Grounding */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div>
                <div className="font-medium text-zinc-200">Google Search Grounding</div>
                <div className="text-[10px] text-zinc-400">Up-to-date live facts</div>
              </div>
              <button
                onClick={onToggleGrounding}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  groundingEnabled ? 'bg-blue-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${
                    groundingEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Automatic speech response */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div>
                <div className="font-medium text-zinc-200">Automatic Speech Output</div>
                <div className="text-[10px] text-zinc-400">Read responses aloud automatically</div>
              </div>
              <button
                onClick={onToggleAutoSpeech}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  autoSpeechEnabled ? 'bg-blue-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${
                    autoSpeechEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Frame mode */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div>
                <div className="font-medium text-zinc-200">Android Pixel Frame</div>
                <div className="text-[10px] text-zinc-400">Realistic device shell</div>
              </div>
              <button
                onClick={onToggleFrame}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  isFrameEnabled ? 'bg-blue-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${
                    isFrameEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
