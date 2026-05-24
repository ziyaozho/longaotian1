import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNarrativeStore } from '../../store/narrativeStore';
import { makeStoryChoice } from '../../services/narrativeService';
import { BookOpen, ChevronRight, Sparkles, MapPin, Users } from 'lucide-react';
import { MangaPanel } from '../manga';

/**
 * ============================================================
 * 主线剧情事件面板组件
 * ============================================================
 *
 * 特性：
 * - 全屏模态覆盖，漫画风格沉浸式剧情体验
 * - 打字机效果展示剧情描述
 * - 根据 dramaticFunction 显示不同的视觉主题
 * - 展示剧情选择支，选择后触发叙事推进
 * - 支持跳过打字机动画
 */

// ---- dramaticFunction 到漫画主题的映射 ----

const FUNCTION_THEMES: Record<
  string,
  {
    accent: string;
    accentBg: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  reveal: {
    accent: '#2980b9',
    accentBg: '#f0f7ff',
    icon: <Sparkles className="w-5 h-5" />,
    label: '揭示',
  },
  establish_relationship: {
    accent: '#d4a017',
    accentBg: '#fffdf0',
    icon: <Users className="w-5 h-5" />,
    label: '羁绊',
  },
  create_pressure: {
    accent: '#c0392b',
    accentBg: '#fdf2f2',
    icon: <ChevronRight className="w-5 h-5" />,
    label: '危机',
  },
  deliver_consequence: {
    accent: '#8e44ad',
    accentBg: '#faf5ff',
    icon: <BookOpen className="w-5 h-5" />,
    label: '后果',
  },
  climax: {
    accent: '#e67e22',
    accentBg: '#fff8f0',
    icon: <Sparkles className="w-5 h-5" />,
    label: '高潮',
  },
  resolution: {
    accent: '#27ae60',
    accentBg: '#f0faf4',
    icon: <MapPin className="w-5 h-5" />,
    label: '收束',
  },
};

// ---- 打字机组件（支持段落） ----

function ParagraphTypewriter({
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
      if (index >= text.length && isActive) {
        onComplete();
      }
      return;
    }

    const char = text[index];
    const delay =
      char === '\n'
        ? speed * 4
        : ['。', '！', '？', '…', '，'].includes(char)
        ? speed * 3
        : speed;

    const timer = setTimeout(() => {
      setDisplayed((prev) => prev + char);
      setIndex((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [index, text, speed, isActive, onComplete]);

  const showFull = !isActive && index < text.length;

  return (
    <div className="whitespace-pre-wrap leading-relaxed" style={{ color: '#1a1a1a' }}>
      {showFull ? text : displayed}
      {isActive && index < text.length && (
        <span className="animate-pulse" style={{ color: '#888888' }}>▌</span>
      )}
    </div>
  );
}

// ---- 主组件 ----

export default function NarrativeEvent() {
  const { activeStoryNode, typingSpeed, setIsTyping } = useNarrativeStore();

  const [typingDone, setTypingDone] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  useEffect(() => {
    setTypingDone(false);
    setSelectedChoice(null);
    if (activeStoryNode) {
      setIsTyping(true);
    }
  }, [activeStoryNode?.nodeId, setIsTyping]);

  const handleTypingComplete = useCallback(() => {
    setTypingDone(true);
    setIsTyping(false);
  }, [setIsTyping]);

  const handleSkipTyping = useCallback(() => {
    setTypingDone(true);
    setIsTyping(false);
  }, [setIsTyping]);

  const handleChoice = useCallback(
    (choiceId: string) => {
      setSelectedChoice(choiceId);
      setTimeout(() => {
        makeStoryChoice(choiceId);
      }, 600);
    },
    []
  );

  const maybeNode = activeStoryNode?.node;
  const hasChoices = maybeNode ? maybeNode.choices && maybeNode.choices.length > 0 : false;

  const handleClickAnywhere = useCallback(() => {
    if (!typingDone) {
      handleSkipTyping();
    } else if (!hasChoices) {
      useNarrativeStore.getState().completeStoryNode();
    }
  }, [typingDone, hasChoices, handleSkipTyping]);

  if (!activeStoryNode) return null;

  const node = activeStoryNode.node;
  const theme = FUNCTION_THEMES[node.dramaticFunction] || FUNCTION_THEMES.reveal;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 cursor-pointer"
        onClick={handleClickAnywhere}
      >
        {/* Backdrop */}
        <div className="absolute inset-0" style={{ background: 'rgba(26, 26, 26, 0.85)' }} />

        {/* Content Card */}
        <motion.div
          initial={{ scale: 0.9, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 30, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto cursor-auto"
        >
          <MangaPanel className="ink-shadow">
            {/* Screentone header */}
            <div
              className="-mx-6 -mt-6 mb-4 px-6 py-3 flex items-center gap-3"
              style={{
                background: '#1a1a1a',
              }}
            >
              <div
                className="w-9 h-9 ink-border flex items-center justify-center flex-shrink-0"
                style={{ background: '#f5f0e8', color: theme.accent }}
              >
                {theme.icon}
              </div>
              <div className="flex-1">
                <h2
                  className="text-xl md:text-2xl font-bold font-[family-name:'Bangers',cursive] tracking-wide"
                  style={{ color: '#f5f0e8', textShadow: '2px 2px 0 #1a1a1a' }}
                >
                  {node.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="manga-badge text-xs" style={{ background: theme.accent }}>
                    {theme.label}
                  </span>
                  {node.involvedNPCs.length > 0 && (
                    <span className="text-xs" style={{ color: '#f5f0e8', opacity: 0.6 }}>
                      涉及: {node.involvedNPCs.join('、')}
                    </span>
                  )}
                </div>
              </div>

              {!typingDone && (
                <motion.button
                  onClick={handleSkipTyping}
                  className="manga-btn-outline text-xs py-1 px-3"
                  whileTap={{ scale: 0.95 }}
                  style={{ color: '#f5f0e8', borderColor: '#f5f0e8', background: 'transparent' }}
                >
                  跳过 ▶▶
                </motion.button>
              )}
            </div>

            {/* Accent strip */}
            <div
              className="h-1.5 w-full mb-4"
              style={{ background: '#1a1a1a' }}
            />

            {/* Description */}
            <div className="mb-6 text-base md:text-lg max-h-[40vh] overflow-y-auto">
              <ParagraphTypewriter
                text={node.description}
                speed={typingSpeed}
                onComplete={handleTypingComplete}
                isActive={!typingDone}
              />
            </div>

            {/* Choices */}
            <AnimatePresence>
              {typingDone && hasChoices && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="space-y-3"
                >
                  <div className="text-sm font-bold flex items-center gap-2 manga-title">
                    <ChevronRight className="w-4 h-4" />
                    你的选择：
                  </div>

                  {node.choices!.map((choice, index) => (
                    <motion.button
                      key={choice.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      onClick={() => handleChoice(choice.id)}
                      disabled={selectedChoice !== null}
                      className={`w-full text-left p-4 transition-all duration-200 group ${
                        selectedChoice === choice.id
                          ? 'manga-btn'
                          : 'manga-btn-outline'
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-0.5 w-7 h-7 ink-border flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            background: theme.accent,
                            color: '#f5f0e8',
                          }}
                        >
                          {String.fromCharCode(65 + index)}
                        </span>
                        <div className="flex-1">
                          <div className="font-bold mb-1" style={{ color: selectedChoice === choice.id ? '#f5f0e8' : '#1a1a1a' }}>
                            {choice.text}
                          </div>
                          <div className="text-xs" style={{ color: selectedChoice === choice.id ? 'rgba(245,240,232,0.6)' : '#888888' }}>
                            反映价值观：{choice.valueReflected}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* No choices - click to continue hint */}
            <AnimatePresence>
              {typingDone && !hasChoices && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center text-sm py-4 animate-pulse select-none"
                  style={{ color: '#888888' }}
                >
                  <span className="inline-flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" />
                    点击任意处继续
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </MangaPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
