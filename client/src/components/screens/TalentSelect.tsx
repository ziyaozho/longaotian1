import { motion, AnimatePresence } from 'framer-motion';
import type { Talent } from '../../types';
import { RARITY_COLORS, RARITY_LABELS } from '../../config/gameConfig';
import { MangaPanel } from '../manga';

interface TalentSelectProps {
  talents: Talent[];
  onSelect: (talent: Talent) => void;
  visible: boolean;
}

const RARITY_BG: Record<string, string> = {
  common: 'bg-white',
  rare: 'bg-blue-50',
  epic: 'bg-purple-50',
  legendary: 'bg-amber-50',
};

export default function TalentSelect({ talents, onSelect, visible }: TalentSelectProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 40 }}
            className="w-full max-w-3xl px-4"
          >
            <MangaPanel className="!p-6">
              <h2 className="text-center text-xl font-bold mb-2" style={{ color: '#1a1a1a' }}>
                天赋觉醒
              </h2>
              <p className="text-center text-sm text-game-text-muted mb-6">
                你的潜力已经觉醒，选择一项天赋
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {talents.map((talent, i) => (
                  <motion.button
                    key={talent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => onSelect(talent)}
                    className={`ink-border p-4 text-left transition-all hover:scale-105 ${RARITY_BG[talent.rarity]}`}
                  >
                    <span className={`text-xs manga-badge mb-2 ${RARITY_COLORS[talent.rarity]}`}>
                      {RARITY_LABELS[talent.rarity]}
                    </span>
                    <h3 className="font-bold text-sm mb-1" style={{ color: '#1a1a1a' }}>
                      {talent.name}
                    </h3>
                    <p className="text-xs text-game-text-muted mb-2">{talent.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {talent.synergyTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5"
                          style={{
                            background: '#f5f0e8',
                            color: '#666',
                            border: '1px solid #ccc',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs">
                      {talent.effects.attrBonus && Object.entries(talent.effects.attrBonus).map(([k, v]) => (
                        <span key={k} className="mr-2" style={{ color: '#27ae60' }}>
                          {k} +{v}
                        </span>
                      ))}
                      {talent.effects.statBonus && Object.entries(talent.effects.statBonus).map(([k, v]) => (
                        <span key={k} className="mr-2" style={{ color: '#2980b9' }}>
                          {k} +{v}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                ))}
              </div>
            </MangaPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
