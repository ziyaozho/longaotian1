import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemo } from './DemoContext';
import {
  getCurrentPhase,
  getDemoPhaseIndex,
  getDemoPhaseCount,
  advancePhase,
  togglePause,
  isDemoPaused,
  resetDemo,
} from './demoOrchestrator';

export default function DemoOverlay() {
  const { isDemo } = useDemo();
  const [visible, setVisible] = useState(true);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [highlight, setHighlight] = useState('');
  const [narration, setNarration] = useState('');
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [totalPhases, setTotalPhases] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);

  const refresh = useCallback(() => {
    const phase = getCurrentPhase();
    if (phase) {
      setPhaseLabel(phase.label);
      setHighlight(phase.highlight);
      setNarration(phase.narrationTech);
    }
    setPhaseIdx(getDemoPhaseIndex());
    setTotalPhases(getDemoPhaseCount());
    setPaused(isDemoPaused());
  }, []);

  useEffect(() => {
    if (!isDemo) return;
    refresh();
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
      refresh();
    }, 1000);
    return () => clearInterval(timer);
  }, [isDemo, refresh]);

  useEffect(() => {
    if (!isDemo) return;
    function onKey(e: KeyboardEvent) {
      switch (e.key.toLowerCase()) {
        case 'h':
          setVisible((v) => !v);
          break;
        case 'n':
          advancePhase();
          refresh();
          break;
        case 'p':
          togglePause();
          setPaused(isDemoPaused());
          break;
        case 'r':
          resetDemo();
          refresh();
          setElapsed(0);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDemo, refresh]);

  if (!isDemo) return null;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const remaining = Math.max(0, 180 - elapsed);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-50"
        >
          {/* 顶部状态栏 */}
          <div className="absolute top-0 left-0 right-0 bg-black/70 backdrop-blur-sm px-4 py-1.5 flex justify-between items-center text-xs text-white/90">
            <span>
              ⏱ 阶段: {phaseLabel} ({phaseIdx + 1}/{totalPhases})
              &nbsp;|&nbsp; 已用 {minutes}:{String(seconds).padStart(2, '0')}
              &nbsp;|&nbsp; 剩余约 {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
            </span>
            <span className="text-amber-300">
              🎯 当前亮点: {highlight}
            </span>
          </div>

          {/* 底部旁白提示 */}
          <div className="absolute bottom-12 left-4 right-4">
            <div className="bg-blue-600/85 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-white">
              💬 旁白: {narration}
            </div>
          </div>

          {/* 右下角快捷键 */}
          <div className="absolute bottom-2 right-4 text-[10px] text-white/50">
            H 隐藏 | N 下一阶段 | P {paused ? '继续' : '暂停'} | R 重置
          </div>

          {/* 暂停指示器 */}
          {paused && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600/90 px-4 py-2 rounded text-sm font-bold">
              ⏸ 已暂停
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
