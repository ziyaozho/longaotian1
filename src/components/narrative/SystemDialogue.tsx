import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNarrativeStore } from '../../store/narrativeStore';
import type { VoiceMode } from '../../narrative';
import { Cpu, X, MessageSquare, ChevronRight } from 'lucide-react';

const VOICE_STYLES: Record<VoiceMode, { tone: string; label: string; bg: string }> = {
  roast:  { tone: '#e74c3c', label: '吐槽', bg: '#fdf2f2' },
  hype:   { tone: '#d4a017', label: '高燃', bg: '#fffdf0' },
  heartfelt: { tone: '#8e44ad', label: '走心', bg: '#faf5ff' },
  daily:  { tone: '#2980b9', label: '日常', bg: '#f0f7ff' },
};

function TypewriterDisplay({
  text,
  speed,
  onComplete,
  isActive,
}: {
  text: string;
  speed: number;
  onComplete: () => void;
  isActive: boolean;
}) {
  const [displayed, setDisplayed] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    setDisplayed('');
    setIndex(0);
  }, [text, isActive]);

  useEffect(() => {
    if (!isActive || index >= text.length) {
      if (index >= text.length && isActive) onComplete();
      return;
    }
    const timer = setTimeout(() => {
      setDisplayed((prev) => prev + text[index]);
      setIndex((prev) => prev + 1);
    }, speed);
    return () => clearTimeout(timer);
  }, [index, text, speed, isActive, onComplete]);

  return (
    <span className="whitespace-pre-wrap" style={{ color: '#1a1a1a' }}>
      {displayed}
      {isActive && index < text.length && (
        <span className="animate-pulse" style={{ color: '#888888' }}>▌</span>
      )}
    </span>
  );
}

export default function SystemDialogue() {
  const {
    activeDialogue,
    isTyping,
    typingSpeed,
    dialogueQueue,
    dialogueHistory,
    autoSkipNonCritical,
    skipCurrentDialogue,
    setIsTyping,
    setPaused,
  } = useNarrativeStore();

  const [showHistory, setShowHistory] = useState(false);
  const [completedTyping, setCompletedTyping] = useState(false);

  const handleTypingComplete = useCallback(() => {
    setCompletedTyping(true);
    setIsTyping(false);
  }, [setIsTyping]);

  useEffect(() => {
    setCompletedTyping(false);
    if (activeDialogue) setIsTyping(true);
  }, [activeDialogue?.id, setIsTyping]);

  useEffect(() => {
    if (autoSkipNonCritical && completedTyping && activeDialogue && !activeDialogue.line.isStoryCritical) {
      const timer = setTimeout(() => skipCurrentDialogue(), 2000);
      return () => clearTimeout(timer);
    }
  }, [autoSkipNonCritical, completedTyping, activeDialogue, skipCurrentDialogue]);

  const handleSkip = useCallback(() => {
    if (isTyping) {
      setCompletedTyping(true);
      setIsTyping(false);
    } else {
      skipCurrentDialogue();
    }
  }, [isTyping, setIsTyping, skipCurrentDialogue]);

  const toggleHistory = useCallback(() => {
    const next = !showHistory;
    setShowHistory(next);
    setPaused(next);
  }, [showHistory, setPaused]);

  if (!activeDialogue && dialogueQueue.length === 0 && dialogueHistory.length === 0) return null;

  const voiceMode: VoiceMode = activeDialogue?.line.voiceMode || 'daily';
  const voiceStyle = VOICE_STYLES[voiceMode];
  const hasMore = dialogueQueue.length > 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 max-w-md w-full pointer-events-none">
      <AnimatePresence mode="wait">
        {activeDialogue && (
          <motion.div
            key={activeDialogue.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-auto w-full ink-border ink-shadow relative"
            style={{ background: '#f5f0e8' }}
          >
            {/* Screentone header bar */}
            <div
              className="px-4 py-2 flex items-center justify-between"
              style={{
                background: 'repeating-conic-gradient(#1a1a1a 0% 25%, transparent 0% 50%)',
                backgroundSize: '3px 3px',
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 ink-border flex items-center justify-center"
                  style={{ background: '#f5f0e8' }}
                >
                  <Cpu className="w-3.5 h-3.5" style={{ color: '#1a1a1a' }} />
                </div>
                <div>
                  <span
                    className="text-sm font-bold font-[family-name:'Bangers',cursive] tracking-wide"
                    style={{ color: '#f5f0e8', textShadow: '1px 1px 0 #1a1a1a' }}
                  >
                    赛博嘴替
                  </span>
                  {activeDialogue.line.isStoryCritical && (
                    <span
                      className="ml-2 text-xs px-1.5 py-0.5 ink-border"
                      style={{ background: '#c0392b', color: '#f5f0e8' }}
                    >
                      关键剧情
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span
                  className="text-xs px-1.5 py-0.5 ink-border font-bold"
                  style={{ background: voiceStyle.tone, color: '#f5f0e8' }}
                >
                  {voiceStyle.label}
                </span>
                {hasMore && (
                  <span className="text-xs opacity-70" style={{ color: '#f5f0e8' }}>
                    {dialogueQueue.length}条
                  </span>
                )}
                <button
                  onClick={handleSkip}
                  className="p-1 hover:opacity-70 transition-opacity"
                  style={{ color: '#f5f0e8' }}
                  title={isTyping ? '跳过动画' : '下一条'}
                >
                  {isTyping ? <ChevronRight className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
              <div
                className="text-xs mb-2 font-bold"
                style={{ color: voiceStyle.tone }}
              >
                {activeDialogue.line.trigger}
              </div>

              <div className="text-sm leading-relaxed min-h-[3rem]" style={{ color: '#1a1a1a' }}>
                <TypewriterDisplay
                  text={activeDialogue.resolvedText}
                  speed={typingSpeed}
                  onComplete={handleTypingComplete}
                  isActive={isTyping}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-4 py-2"
              style={{ borderTop: '2px solid #1a1a1a' }}
            >
              <button
                onClick={toggleHistory}
                className="flex items-center gap-1 text-xs manga-btn-outline py-1 px-2"
              >
                <MessageSquare className="w-3 h-3" />
                历史 ({dialogueHistory.length})
              </button>

              {!isTyping && hasMore && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => skipCurrentDialogue()}
                  className="manga-btn text-xs py-1 px-2 flex items-center gap-1"
                >
                  下一条
                  <ChevronRight className="w-3 h-3" />
                </motion.button>
              )}
            </div>

            {/* Voice mode indicator strip */}
            <div
              className="h-1 w-full"
              style={{ background: voiceStyle.tone }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pointer-events-auto w-full ink-border overflow-hidden"
            style={{ background: '#f5f0e8' }}
          >
            <div
              className="px-3 py-2 flex items-center justify-between"
              style={{ borderBottom: '2px solid #1a1a1a' }}
            >
              <span
                className="text-sm font-bold font-[family-name:'Bangers',cursive] tracking-wide"
                style={{ color: '#1a1a1a' }}
              >
                对话历史
              </span>
              <button
                onClick={toggleHistory}
                className="p-1 hover:opacity-70"
                style={{ color: '#1a1a1a' }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-3 space-y-2">
              {dialogueHistory.length === 0 ? (
                <div className="text-sm text-center py-4" style={{ color: '#888888' }}>
                  暂无历史对话
                </div>
              ) : (
                dialogueHistory.slice(-20).map((entry) => {
                  const vMode: VoiceMode = entry.line.voiceMode || 'daily';
                  const vStyle = VOICE_STYLES[vMode];
                  return (
                    <div
                      key={entry.id}
                      className="text-xs p-2 ink-border"
                      style={{ background: '#fff' }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Cpu className="w-3 h-3" style={{ color: vStyle.tone }} />
                        <span className="font-medium" style={{ color: vStyle.tone }}>
                          {entry.line.trigger}
                        </span>
                        {entry.line.isStoryCritical && (
                          <span
                            className="text-[10px] px-1 ink-border"
                            style={{ background: '#c0392b', color: '#fff' }}
                          >
                            关键
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#555' }} className="whitespace-pre-wrap">
                        {entry.resolvedText}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized indicator */}
      {!activeDialogue && dialogueQueue.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => {
            const store = useNarrativeStore.getState();
            store.dequeueDialogue();
          }}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 ink-border ink-shadow"
          style={{ background: '#f5f0e8' }}
        >
          <Cpu className="w-4 h-4 animate-pulse" style={{ color: '#1a1a1a' }} />
          <span className="text-sm font-bold" style={{ color: '#1a1a1a' }}>
            {dialogueQueue.length} 条新消息
          </span>
        </motion.button>
      )}
    </div>
  );
}
