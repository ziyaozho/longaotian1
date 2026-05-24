import { useMemo } from 'react';
import type { CharacterState, CharacterMood, SpritePanel } from './types';
import { EXPRESSION_TO_PANEL } from './types';
import { SPRITE, PANEL_POSITIONS, COLORS } from './config';

interface CharacterPortraitProps {
  state: CharacterState;
  spritesheetUrl?: string | null;
  isGenerating?: boolean;
  error?: string | null;
  className?: string;
  size?: number;
}

export default function CharacterPortrait({
  state,
  spritesheetUrl,
  isGenerating = false,
  error,
  className = '',
  size = 256,
}: CharacterPortraitProps) {
  const panel: SpritePanel = EXPRESSION_TO_PANEL[state.mood.expression];
  const pos = PANEL_POSITIONS[panel];
  const showHurt = state.hpPercent < 0.3;

  const spriteStyle = useMemo(() => {
    if (!spritesheetUrl) return undefined;
    // Use percentage-based positioning: 3 cols (0%, 50%, 100%), 2 rows (0%, 100%)
    const xPct = pos.col === 0 ? 0 : pos.col === 1 ? 50 : 100;
    const yPct = pos.row === 0 ? 0 : 100;
    return {
      width: '100%',
      height: '100%',
      backgroundImage: `url(${spritesheetUrl})`,
      backgroundSize: `${SPRITE.cols * 100}% ${SPRITE.rows * 100}%`,
      backgroundPosition: `${xPct}% ${yPct}%`,
      backgroundRepeat: 'no-repeat' as const,
      imageRendering: 'auto' as const,
    };
  }, [spritesheetUrl, pos]);

  if (!spritesheetUrl || isGenerating || error) {
    return (
      <div
        className={`overflow-hidden ${className}`}
        style={{ width: size, height: size, border: `3px solid ${COLORS.ink}` }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: COLORS.paper,
            fontFamily: "'Bangers', 'Noto Sans SC', sans-serif",
            color: COLORS.ink,
            fontSize: size * 0.06,
            gap: '0.5rem',
          }}
        >
          {isGenerating ? (
            <>
              <div
                style={{
                  width: size * 0.15,
                  height: size * 0.04,
                  background: COLORS.ink,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <span>AI 绘制中...</span>
            </>
          ) : error ? (
            <>
              <span style={{ color: '#c0392b', fontSize: size * 0.1 }}>!</span>
              <span style={{ fontSize: size * 0.05 }}>生成失败</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: size * 0.12 }}>?</span>
              <span style={{ fontSize: size * 0.05 }}>等待生成</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width: size, height: size, border: `3px solid ${COLORS.ink}` }}
    >
      {/* Sprite layer — fills container exactly */}
      <div style={spriteStyle} />

      {/* HP low red glow */}
      {showHurt && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: COLORS.effects.hpLow,
            pointerEvents: 'none',
            animation: 'pulse 0.8s ease-in-out infinite',
          }}
        />
      )}

      {/* Weapon indicator */}
      {state.hasWeapon && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 6,
            fontSize: size * 0.14,
            lineHeight: 1,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
          }}
        >
          ⚔
        </div>
      )}

      {/* Armor indicator */}
      {state.hasArmor && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 6,
            fontSize: size * 0.14,
            lineHeight: 1,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
          }}
        >
          🛡
        </div>
      )}
    </div>
  );
}

export type { CharacterState, CharacterMood };
