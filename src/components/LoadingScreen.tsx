import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const LOADING_TIPS = [
  '天道正在推演你的命运...',
  '系统正在加载下一章剧情...',
  '命运的齿轮开始转动...',
  '虚空之中，有人正在注视着你...',
  '世界线收束中...',
  '因果律计算中...',
  '大道五十，天衍四九，留一线给你...',
  '系统精灵正在偷偷吐槽你...',
  '穿越世界的壁障需要一点时间...',
  '你的选择正在改变这个世界的走向...',
  '有人在暗处写下了你的名字...',
  '天机不可泄露，但可以加载...',
];

const LOADING_STAGES = [
  '扫描世界线...',
  '计算因果律...',
  '生成NPC行为...',
  '推演剧情分支...',
  '注入命运变量...',
  '加载完成',
];

interface LoadingScreenProps {
  visible: boolean;
}

export default function LoadingScreen({ visible }: LoadingScreenProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!visible) return;

    // 轮换提示语
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
    }, 2500);

    // 轮换加载阶段
    const stageTimer = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, LOADING_STAGES.length - 1));
    }, 800);

    // 动态省略号
    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => {
      clearInterval(tipTimer);
      clearInterval(stageTimer);
      clearInterval(dotTimer);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setStageIndex(0);
      setDots('');
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          {/* 中心内容 */}
          <div className="relative z-10 flex flex-col items-center">
            {/* 旋转图标 */}
            <motion.div
              className="w-16 h-16 mb-8 border-4 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />

            {/* 加载阶段 */}
            <motion.div
              key={stageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white text-lg font-bold mb-4"
            >
              {LOADING_STAGES[stageIndex]}
              {dots}
            </motion.div>

            {/* 进度条 */}
            <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden mb-6">
              <motion.div
                className="h-full bg-white"
                initial={{ width: '0%' }}
                animate={{ width: `${((stageIndex + 1) / LOADING_STAGES.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* 随机提示语 */}
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="text-white/60 text-sm text-center max-w-md px-4"
              >
                {LOADING_TIPS[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
