import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Attributes } from '../../types';
import { ATTRIBUTE_DEFS, INITIAL_POINTS, MIN_ATTRIBUTE, MAX_ATTRIBUTE } from '../../data/attributes';
import { motion } from 'framer-motion';
import { ArrowRight, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { MangaPanel, MangaTitle, HalftoneBar } from '../manga';
import { CharacterPortrait } from '../character';
import type { CharacterState } from '../character';
import { useSpriteGeneration } from '../../services/useSpriteGeneration';
import type { CharacterAppearance } from '../character';

const ATTR_MAX = 10;

export default function CharacterCreate() {
  const { setScreen } = useGameStore();
  const [name, setName] = useState('');
  const [attributes, setAttributes] = useState<Attributes>({
    talent: 3,
    appearance: 3,
    intelligence: 3,
    physique: 3,
    family: 3,
    luck: 3,
  });
  const { isGenerating, error, spritesheetUrl, generate } = useSpriteGeneration();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const usedPoints = Object.values(attributes).reduce((a, b) => a + b, 0);
  const remainingPoints = INITIAL_POINTS - usedPoints;

  const adjustAttribute = (key: keyof Attributes, delta: number) => {
    const current = attributes[key];
    const newValue = current + delta;
    if (newValue < MIN_ATTRIBUTE || newValue > MAX_ATTRIBUTE) return;
    if (delta > 0 && remainingPoints <= 0) return;
    if (delta < 0 && current <= MIN_ATTRIBUTE) return;

    setAttributes((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleContinue = async () => {
    if (!name.trim()) return;
    if (remainingPoints !== 0) return;

    sessionStorage.setItem('temp_name', name);
    sessionStorage.setItem('temp_attributes', JSON.stringify(attributes));

    // If already cached, proceed immediately
    if (spritesheetUrl) {
      sessionStorage.setItem('temp_spritesheet', spritesheetUrl);
      const hash = `v1-${attributes.talent}-${attributes.appearance}-${attributes.intelligence}-${attributes.physique}-${attributes.family}-${attributes.luck}`;
      try { localStorage.setItem(`sprite_${hash}`, spritesheetUrl); } catch { /* quota */ }
      setScreen('scene_select');
      return;
    }

    // Generate sprite
    const url = await generate(attributes as CharacterAppearance);
    if (url) {
      sessionStorage.setItem('temp_spritesheet', url);
    }
    setScreen('scene_select');
  };

  const handleReset = () => {
    setAttributes({
      talent: 3,
      appearance: 3,
      intelligence: 3,
      physique: 3,
      family: 3,
      luck: 3,
    });
  };

  const isValid = name.trim().length > 0 && remainingPoints === 0;

  const portraitState: CharacterState = {
    appearance: attributes,
    mood: { expression: 'neutral', intensity: 0, enteredAt: 0 },
    world: 'cultivation',
    level: 1,
    hpPercent: 1,
    hasWeapon: false,
    hasArmor: false,
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 paper-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <MangaPanel pageNumber={2}>
          <MangaTitle as="h2" className="text-center mb-2">
            创建角色
          </MangaTitle>
          <p className="text-game-text-muted text-center mb-6">
            分配你的初始属性，共 {INITIAL_POINTS} 点
          </p>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Character portrait */}
            <motion.div
              className="flex-shrink-0 flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <CharacterPortrait
                state={portraitState}
                spritesheetUrl={spritesheetUrl}
                isGenerating={isGenerating}
                error={error}
                size={220}
              />
            </motion.div>

            <div className="flex-1">
          {/* Name input */}
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
              角色名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入你的名字..."
              className="manga-input w-full"
              maxLength={12}
            />
          </div>

          {/* Points display */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold">剩余点数</span>
            <motion.span
              key={remainingPoints}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className={`text-2xl font-bold ${remainingPoints === 0 ? 'text-game-green' : 'text-game-accent'}`}
            >
              {remainingPoints}
            </motion.span>
          </div>

          {/* Attribute allocation */}
          <div className="space-y-4 mb-6">
            {ATTRIBUTE_DEFS.map((attr, index) => (
              <motion.div
                key={attr.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold w-16">{attr.name}</span>
                  <div className="flex items-center gap-1">
                    <motion.button
                      onClick={() => adjustAttribute(attr.key as keyof Attributes, -1)}
                      disabled={attributes[attr.key as keyof Attributes] <= MIN_ATTRIBUTE}
                      className="manga-btn-outline w-7 h-7 flex items-center justify-center p-0 disabled:opacity-30"
                      whileTap={{ scale: 0.9 }}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </motion.button>
                    <span className="w-8 text-center font-bold text-lg">
                      {attributes[attr.key as keyof Attributes]}
                    </span>
                    <motion.button
                      onClick={() => adjustAttribute(attr.key as keyof Attributes, 1)}
                      disabled={attributes[attr.key as keyof Attributes] >= MAX_ATTRIBUTE || remainingPoints <= 0}
                      className="manga-btn-outline w-7 h-7 flex items-center justify-center p-0 disabled:opacity-30"
                      whileTap={{ scale: 0.9 }}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                  <HalftoneBar
                    value={attributes[attr.key as keyof Attributes]}
                    max={ATTR_MAX}
                    label=""
                    color="ink"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-game-text-muted mt-1 ml-4">{attr.effect}</p>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={handleReset}
              className="manga-btn-outline flex items-center gap-2 flex-1 justify-center"
              whileTap={{ scale: 0.97 }}
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </motion.button>
            <motion.button
              onClick={handleContinue}
              disabled={!isValid || isGenerating}
              className="manga-btn flex items-center gap-2 flex-1 justify-center disabled:opacity-40"
              whileTap={isValid && !isGenerating ? { scale: 0.97 } : {}}
            >
              {isGenerating ? 'AI 绘制中...' : '选择重生场景'}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
            </div>
          </div>
        </MangaPanel>
      </motion.div>
    </div>
  );
}
