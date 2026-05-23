import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { processTurn, processChoice, updatePlayerAfterTurn, checkGameOver } from '../../agents/orchestrator';
import type { TurnResult } from '../../agents/orchestrator';
import { getSceneById } from '../../data/scenes';
import { getSystemById } from '../../data/systems';
import { getLevelFromExp } from '../../config/gameConfig';
import type { GameEvent, Choice } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { exportSave, importSave } from '../../utils/storage';
import TypewriterText from '../TypewriterText';
import FloatingNumber from '../FloatingNumber';
import BarrageToast from '../BarrageToast';
import { SystemDialogue, NarrativeEvent } from '../narrative';
import { createRhythmController } from '../../engine/rhythm';
import { packageEvent } from '../../engine/memePackager';
import {
  syncNarrativeProgress,
  checkAndTriggerStoryNode,
  triggerSignInDialogue,
  triggerStatusDialogue,
  triggerLotteryDialogue,
  triggerCopyDialogue,
  triggerShopDialogue,
  triggerAlchemyDialogue,
  triggerPetDialogue,
} from '../../services/narrativeService';
import { saveProviderConfig, getSavedProviderConfig, type ProviderConfig } from '../../ai';
import { Brain, AlertTriangle, Gift, Info, Terminal } from 'lucide-react';
import {
  Zap, Trophy,
  Scroll, MapPin, ChevronRight,
  Sparkles, Cpu, Settings, Download, Upload,
  Package, FlaskConical, BookOpen, Shield, Sword
} from 'lucide-react';
import DemoOverlay from '../../demo/DemoOverlay';
import { MangaPanel, HalftoneBar, SpeedLines, Onomatopoeia, ImpactFrame } from '../manga';
import { CharacterPortrait } from '../character';
import type { CharacterState, CharacterMood } from '../character';
import type { ImpactEventType, ImpactStat, ImpactItem } from '../manga';
import { getAttributeHash, getCachedSpritesheet } from '../../services/spriteCache';

const itemTypeIcons: Record<string, React.ReactNode> = {
  consumable: <FlaskConical className="w-3 h-3" />,
  weapon: <Sword className="w-3 h-3" />,
  armor: <Shield className="w-3 h-3" />,
  skill_book: <BookOpen className="w-3 h-3" />,
  material: <Package className="w-3 h-3" />,
};

export default function GameMain() {
  const { setScreen, addLog, logs, systemMessage, setSystemMessage, characterMood, setCharacterMood } = useGameStore();
  const { player, setPlayer, addAchievement, addTask, addItem, useItem, equipItem, unequipItem } = usePlayerStore();

  const [sceneText, setSceneText] = useState('');
  const [choices, setChoices] = useState<Choice[]>([]);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [showSystemMsg, setShowSystemMsg] = useState(false);
  const [showAchievements, setShowAchievements] = useState<string[]>([]);
  const [resultText, setResultText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [importError, setImportError] = useState('');
  const [floaters, setFloaters] = useState<{ id: number; value: number; label: string; color: string }[]>([]);
  const [prevStats, setPrevStats] = useState(player?.stats);
  const [prevLevel, setPrevLevel] = useState(player?.stats.level || 1);
  const [systemLogs, setSystemLogs] = useState<Array<{ id: number; type: 'info' | 'warning' | 'reward' | 'upgrade' | 'error'; text: string; time: string }>>([]);
  const [hasSignedInToday, setHasSignedInToday] = useState(false);
  const [spriteUrl, setSpriteUrl] = useState<string | null>(null);
  const lastTurnResult = useRef<TurnResult | null>(null);
  const rhythmRef = useRef(createRhythmController());
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load spritesheet from sessionStorage, IndexedDB, or localStorage
  useEffect(() => {
    const loadSprite = async () => {
      // 1. Check sessionStorage (just generated this session)
      const sessionSprite = sessionStorage.getItem('temp_spritesheet');
      if (sessionSprite) {
        sessionStorage.removeItem('temp_spritesheet');
        setSpriteUrl(sessionSprite);
        // Sync to localStorage for cross-session persistence
        if (player) {
          const hash = getAttributeHash(player.attributes);
          try { localStorage.setItem(`sprite_${hash}`, sessionSprite); } catch { /* quota */ }
        }
        return;
      }
      // 2. Check IndexedDB (with localStorage fallback built into getCachedSpritesheet)
      if (player) {
        const hash = getAttributeHash(player.attributes);
        // Check localStorage directly first (synchronous, faster)
        try {
          const localSprite = localStorage.getItem(`sprite_${hash}`);
          if (localSprite) {
            setSpriteUrl(localSprite);
            return;
          }
        } catch { /* ignore */ }
        // Fallback to IndexedDB
        const cached = await getCachedSpritesheet(hash);
        if (cached) {
          setSpriteUrl(cached);
          try { localStorage.setItem(`sprite_${hash}`, cached); } catch { /* quota */ }
        }
      }
    };
    loadSprite();
  }, [player]);

  // Mood decay: return to neutral after MOOD_DECAY_MS
  useEffect(() => {
    if (characterMood.expression !== 'neutral') {
      if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
      moodTimerRef.current = setTimeout(() => {
        setCharacterMood({ expression: 'neutral', intensity: 0 });
      }, 4000);
    }
    return () => { if (moodTimerRef.current) clearTimeout(moodTimerRef.current); };
  }, [characterMood.expression, characterMood.enteredAt, setCharacterMood]);

  // Build character portrait state from player data
  const portraitState: CharacterState | null = player ? {
    appearance: player.attributes,
    mood: characterMood,
    world: player.progress.sceneType,
    level: player.stats.level,
    hpPercent: player.stats.hp / player.stats.maxHp,
    hasWeapon: !!player.equipment.weapon,
    hasArmor: !!player.equipment.armor,
  } : null;

  const [peakOnomatopoeia, setPeakOnomatopoeia] = useState<{
    text: string; variant: 'meme'; color: string;
  } | null>(null);
  const [barrages, setBarrages] = useState<Array<{
    id: number; text: string; icon: string; color: string;
  }>>([]);
  const [impactEvent, setImpactEvent] = useState<{
    eventType: ImpactEventType;
    title: string;
    description: string;
    stats: ImpactStat[];
    items: ImpactItem[];
  } | null>(null);
  const [effectLevel, setEffectLevel] = useState<'full' | 'text-only' | 'off'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('game_effect_level') : null;
    return (saved as 'full' | 'text-only' | 'off') || 'full';
  });

  const barrageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function addBarrage(item: { text: string; icon: string; color: string }) {
    // Clear any pending auto-dismiss so the new barrage replaces the old one
    if (barrageTimerRef.current) {
      clearTimeout(barrageTimerRef.current);
      barrageTimerRef.current = null;
    }
    const id = Date.now();
    // Keep only 1 barrage at a time, replace with new
    setBarrages([{ ...item, id }]);
    barrageTimerRef.current = setTimeout(() => {
      setBarrages(prev => prev.filter(b => b.id !== id));
      barrageTimerRef.current = null;
    }, 2000);
  }

  // Listen for level changes to trigger level-up dialogue
  useEffect(() => {
    if (player && player.stats.level > prevLevel) {
      triggerStatusDialogue(player, '角色升级');
      setPrevLevel(player.stats.level);
    }
  }, [player?.stats.level, prevLevel]);
  const [aiConfig, setAiConfig] = useState<ProviderConfig>(getSavedProviderConfig() || { type: 'fallback' });
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [aiError, setAiError] = useState('');

  const scene = player ? getSceneById(player.progress.sceneType) : null;
  const systemDef = player ? getSystemById(player.system.id) : null;

  const handleUseItem = (itemId: string) => {
    const result = useItem(itemId);
    if (result.success) {
      setSystemMessage(result.message);
      setShowSystemMsg(true);
      addSystemLog('reward', result.message);
      setTimeout(() => setShowSystemMsg(false), 3000);
    }
  };

  const handleSystemFeature = (feature: string) => {
    let message = '';
    let logType: 'info' | 'reward' | 'warning' | 'upgrade' = 'info';

    switch (feature) {
      case 'daily_reward':
      case 'basic_feature': {
        if (hasSignedInToday) {
          message = '今日已签到，请明天再来';
          logType = 'info';
          break;
        }
        const reward = Math.floor(Math.random() * 50) + 10;
        const wealthReward = Math.floor(Math.random() * 30) + 5;
        player!.stats.exp += reward;
        player!.stats.wealth += wealthReward;
        setHasSignedInToday(true);
        message = `签到成功！获得${reward}经验和${wealthReward}财富`;
        logType = 'reward';
        break;
      }
      case 'crit_bonus': {
        const crit = Math.random() > 0.7;
        const reward = crit ? Math.floor(Math.random() * 200) + 100 : Math.floor(Math.random() * 50) + 20;
        player!.stats.exp += reward;
        message = crit ? `暴击签到！获得${reward}经验！` : `签到获得${reward}经验`;
        logType = 'reward';
        break;
      }
      case 'scan_enemy': {
        const enemyPower = Math.floor(player!.stats.combatPower * (0.8 + Math.random() * 0.6));
        const weakness = Math.random() > 0.5 ? '灵力攻击' : '物理攻击';
        message = `扫描结果：附近存在战力约${enemyPower}的敌人，弱点：${weakness}`;
        logType = 'info';
        break;
      }
      case 'weakness_analysis': {
        message = '分析完成：建议优先提升灵力防御，当前区域敌人偏向灵力攻击';
        logType = 'info';
        break;
      }
      case 'basic_lottery': {
        const cost = 100;
        if (player!.stats.wealth >= cost) {
          player!.stats.wealth -= cost;
          const roll = Math.random();
          if (roll > 0.9) {
            const bigReward = Math.floor(Math.random() * 500) + 200;
            player!.stats.exp += bigReward;
            message = `抽奖大奖！获得${bigReward}经验！`;
          } else if (roll > 0.6) {
            player!.stats.wealth += 200;
            message = '抽奖获得200财富！';
          } else {
            const smallReward = Math.floor(Math.random() * 50) + 10;
            player!.stats.exp += smallReward;
            message = `抽奖获得${smallReward}经验`;
          }
          logType = 'reward';
        } else {
          message = '财富不足，需要100财富才能抽奖';
          logType = 'warning';
        }
        break;
      }
      case 'normal_dungeon': {
        const dungeonDiff = Math.floor(Math.random() * 3) + 1;
        const success = Math.random() > 0.3;
        if (success) {
          const exp = dungeonDiff * 80;
          const wealth = dungeonDiff * 40;
          player!.stats.exp += exp;
          player!.stats.wealth += wealth;
          message = `副本通关！获得${exp}经验和${wealth}财富`;
          logType = 'reward';
        } else {
          const damage = dungeonDiff * 15;
          player!.stats.hp = Math.max(1, player!.stats.hp - damage);
          message = `副本挑战失败，受到${damage}点伤害`;
          logType = 'warning';
        }
        break;
      }
      case 'basic_shop': {
        const items = ['小还丹(50财富)', '回灵散(40财富)', '铁剑(100财富)'];
        message = `商城商品：${items.join('、')}——功能开发中，敬请期待`;
        logType = 'info';
        break;
      }
      case 'discount': {
        message = '当前享受9折优惠！商城消费减少10%';
        logType = 'info';
        break;
      }
      case 'basic_alchemy': {
        if (player!.stats.mp >= 10) {
          player!.stats.mp -= 10;
          const success = Math.random() > 0.3;
          if (success) {
            player!.stats.hp = Math.min(player!.stats.maxHp, player!.stats.hp + 40);
            message = '炼丹成功！炼制出小还丹，恢复40点生命';
            logType = 'reward';
          } else {
            message = '炼丹失败...火候没控制好';
            logType = 'warning';
          }
        } else {
          message = '灵力不足，需要10点MP才能炼丹';
          logType = 'warning';
        }
        break;
      }
      case 'pet_catch': {
        const catchRoll = Math.random();
        if (catchRoll > 0.6) {
          player!.stats.combatPower += 15;
          message = '捕捉成功！灵宠加入，战斗力+15';
          logType = 'reward';
        } else {
          message = '捕捉失败，灵宠逃走了...';
          logType = 'warning';
        }
        break;
      }
      case 'summon': {
        player!.stats.mp = Math.max(0, player!.stats.mp - 15);
        player!.stats.combatPower += 20;
        message = '召唤成功！战斗伙伴加入，战斗力+20';
        logType = 'reward';
        break;
      }
      default:
        message = `功能【${feature}】正在开发中`;
    }

    // Narrative system triggers
    if (player) {
      switch (feature) {
        case 'daily_reward':
        case 'basic_feature':
          if (!hasSignedInToday) {
            triggerSignInDialogue(player, '每日首次签到');
          }
          break;
        case 'crit_bonus':
          triggerSignInDialogue(player, '周签到完成');
          break;
        case 'basic_lottery': {
          const rollType = message.includes('大奖')
            ? '抽到传说奖励'
            : message.includes('200财富')
            ? '抽到稀有奖励'
            : '抽到普通奖励';
          triggerLotteryDialogue(player, rollType as any);
          break;
        }
        case 'normal_dungeon': {
          const dungeonSuccess = !message.includes('失败');
          triggerCopyDialogue(
            player,
            dungeonSuccess ? '副本通关' : '进入副本',
            { rating: dungeonSuccess ? 'S' : undefined }
          );
          break;
        }
        case 'basic_alchemy': {
          const alchemySuccess = message.includes('成功');
          triggerAlchemyDialogue(
            player,
            alchemySuccess ? '炼丹成功' : '炼丹失败',
            { quality: alchemySuccess ? '上品' : undefined }
          );
          break;
        }
        case 'pet_catch': {
          const petSuccess = message.includes('成功');
          const petPotential = ['凡品', '良品', '上品', '极品', '仙品'][Math.floor(Math.random() * 5)];
          triggerPetDialogue(
            player,
            petSuccess ? '获得宠物' : '宠物升级',
            { petName: petSuccess ? '未知灵宠' : undefined, potential: petPotential }
          );
          break;
        }
        case 'summon': {
          const summonPotential = ['凡品', '良品', '上品', '极品', '仙品'][Math.floor(Math.random() * 5)];
          triggerPetDialogue(player, '获得宠物', { petName: '召唤兽', potential: summonPotential });
          break;
        }
        case 'basic_shop':
          triggerShopDialogue(player, '打开商店');
          break;
      }
    }

    if (player) {
      const newLevel = getLevelFromExp(player.stats.exp);
      if (newLevel > player.stats.level) {
        player.stats.level = newLevel;
        player.stats.maxHp += 20;
        player.stats.maxMp += 10;
        player.stats.hp = player.stats.maxHp;
        player.stats.combatPower += 15;
        message += `，升级至${newLevel}级！`;
        logType = 'upgrade';
      }
    }

    setSystemMessage(message);
    setShowSystemMsg(true);
    addSystemLog(logType, message);
    setTimeout(() => setShowSystemMsg(false), 3000);
  };

  // Initial turn
  useEffect(() => {
    if (player && sceneText === '') {
      startNewTurn();
    }
  }, []);

  const handleExportSave = () => {
    if (!player) return;
    const data = exportSave(player);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rebirth_save_${player.name}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setSystemMessage('存档已导出！');
    setShowSystemMsg(true);
    setTimeout(() => setShowSystemMsg(false), 3000);
  };

  const handleImportSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      const imported = importSave(data);
      if (imported) {
        setPlayer(imported);
        setSystemMessage('存档导入成功！');
        setShowSystemMsg(true);
        setTimeout(() => setShowSystemMsg(false), 3000);
        setShowSettings(false);
        setImportError('');
      } else {
        setImportError('导入失败：无效的存档文件');
      }
    };
    reader.readAsText(file);
  };

  const addSystemLog = useCallback((type: 'info' | 'warning' | 'reward' | 'upgrade' | 'error', text: string) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSystemLogs((prev) => [...prev.slice(-49), { id: Date.now(), type, text, time }]);
  }, []);

  const startNewTurn = useCallback(async () => {
    const currentPlayer = usePlayerStore.getState().player;
    if (!currentPlayer) return;
    setIsProcessing(true);

    try {
      const turnResult = await processTurn(currentPlayer);
      lastTurnResult.current = turnResult;

      const rhythmState = rhythmRef.current.tick(currentPlayer.progress.round, currentPlayer);
      if (rhythmState.isPeak && rhythmState.nextPeakType) {
        const peakType = rhythmState.nextPeakType;
        const realmIndexLocal = Math.min(
          Math.floor((currentPlayer.stats.level - 1) / 10),
          (scene?.realmNames.length || 1) - 1
        );
        const currentRealmLocal = scene?.realmNames[realmIndexLocal] || '凡人';

        const memeCtx: Record<string, unknown> = {
          realmName: currentRealmLocal,
          itemName: turnResult.droppedItems[0]?.name,
          rarity: turnResult.droppedItems[0]?.rarity,
          enemyName: turnResult.combatResult?.enemyName,
        };

        const eventType = peakType === 'loot_explosion' ? 'loot_explosion'
          : peakType === 'breakthrough' ? 'breakthrough_success'
          : peakType === 'face_slap' ? 'face_slap'
          : 'fortune_event';

        const meme = packageEvent(eventType, memeCtx);

        setSystemMessage(meme.systemMessage);
        setShowSystemMsg(true);
        setTimeout(() => setShowSystemMsg(false), 4000);
        addSystemLog('upgrade', meme.systemMessage);

        if (effectLevel !== 'off') {
          const peakText = peakType === 'loot_explosion' ? '出货！！！'
            : peakType === 'breakthrough' ? `${currentRealmLocal}！！`
            : peakType === 'face_slap' ? '就这？'
            : '？';

          setPeakOnomatopoeia({
            text: peakText,
            variant: 'meme',
            color: peakType === 'loot_explosion' ? '#e74c3c'
              : peakType === 'breakthrough' ? '#d4a017'
              : peakType === 'face_slap' ? '#1a1a1a'
              : '#8e44ad',
          });
          setTimeout(() => setPeakOnomatopoeia(null), 1500);

          if (effectLevel === 'full') {
            addBarrage({ text: meme.toastText, icon: meme.icon, color: meme.color });
          }
        }
      }

      setSceneText(turnResult.sceneText);
      setChoices(turnResult.choices);
      setCurrentEvent(turnResult.event);
      setShowEvent(!!turnResult.event);

      syncNarrativeProgress(currentPlayer);
      checkAndTriggerStoryNode(currentPlayer);

      if (turnResult.systemMessage) {
        setSystemMessage(turnResult.systemMessage);
        setShowSystemMsg(true);
        setTimeout(() => setShowSystemMsg(false), 4000);
        addSystemLog('info', turnResult.systemMessage);
      }

      if (turnResult.usedFallback) {
        addSystemLog('warning', 'AI 服务暂不可用，已切换至本地模板');
      }

      for (const task of turnResult.newTasks) {
        addTask(task);
      }

      if (turnResult.droppedItems.length > 0) {
        for (const item of turnResult.droppedItems) {
          addItem(item);
        }
        const itemNames = turnResult.droppedItems.map(i => i.name).join('、');
        addSystemLog('reward', `获得道具：${itemNames}`);
      }

      if (turnResult.newAchievements.length > 0) {
        setShowAchievements(turnResult.newAchievements);
        for (const achId of turnResult.newAchievements) {
          addAchievement(achId);
        }
        setTimeout(() => setShowAchievements([]), 5000);
      }

      addLog(`[第${currentPlayer.progress.round}回合] ${turnResult.sceneText.substring(0, 60)}...`);
      if (turnResult.event) {
        addLog(`[事件] ${turnResult.event.description.substring(0, 60)}...`);
      }
    } catch (e) {
      console.error('Turn processing failed:', e);
      addSystemLog('error', '回合处理失败，请刷新页面重试');
    } finally {
      setIsProcessing(false);
    }
  }, [addLog, setSystemMessage, addTask, addItem, addAchievement, addSystemLog]);

  const handleImpactContinue = useCallback(() => {
    setImpactEvent(null);
    setShowEvent(false);
    setCurrentEvent(null);
    setIsProcessing(false);
    startNewTurn();
  }, [startNewTurn]);

  const handleChoice = async (choiceId: string) => {
    if (!player || isProcessing) return;
    setIsProcessing(true);

    const choiceResult = processChoice(player, choiceId, currentEvent);

    const turnResult = lastTurnResult.current || {
      sceneText: '',
      event: null,
      choices: [],
      systemMessage: null,
      newTasks: [],
      newAchievements: [],
      achievementMessages: [],
      effects: {
        hpChange: 0,
        mpChange: 0,
        expGain: 0,
        wealthChange: 0,
        fameChange: 0,
        systemExpGain: 0,
      },
      usedFallback: false,
      combatResult: null,
      completedTasks: [],
      droppedItems: [],
    };

    const updated = updatePlayerAfterTurn(player, turnResult, choiceResult, choiceId);

    const statDiffs: ImpactStat[] = [];
    if (prevStats) {
      const newFloaters: typeof floaters = [];
      let id = Date.now();
      const hpDiff = updated.stats.hp - prevStats.hp;
      if (hpDiff !== 0) { newFloaters.push({ id: id++, value: hpDiff, label: 'HP', color: hpDiff > 0 ? '#27ae60' : '#c0392b' }); statDiffs.push({ label: 'HP', value: hpDiff }); }
      const mpDiff = updated.stats.mp - prevStats.mp;
      if (mpDiff !== 0) { newFloaters.push({ id: id++, value: mpDiff, label: 'MP', color: '#2980b9' }); statDiffs.push({ label: 'MP', value: mpDiff }); }
      const expDiff = updated.stats.exp - prevStats.exp;
      if (expDiff > 0) { newFloaters.push({ id: id++, value: expDiff, label: 'EXP', color: '#d4a017' }); statDiffs.push({ label: 'EXP', value: expDiff }); }
      const wealthDiff = updated.stats.wealth - prevStats.wealth;
      if (wealthDiff !== 0) { newFloaters.push({ id: id++, value: wealthDiff, label: '财富', color: wealthDiff > 0 ? '#27ae60' : '#c0392b' }); statDiffs.push({ label: '财富', value: wealthDiff }); }
      if (newFloaters.length > 0) {
        setFloaters((prev) => [...prev, ...newFloaters]);
      }
    }
    setPrevStats(updated.stats);
    setPrevLevel(updated.stats.level);
    setPlayer(updated);

    // Update character mood based on choice result
    let newExpression: CharacterMood['expression'] = 'neutral';
    let intensity = 0.5;
    if (choiceResult.combatResult) {
      if (choiceResult.combatResult.isVictory) {
        newExpression = 'triumphant';
        intensity = 0.8;
      } else if (choiceResult.combatResult.isEscape) {
        newExpression = 'worried';
        intensity = 0.4;
      } else {
        newExpression = 'injured';
        intensity = 0.9;
      }
    } else if (choiceId.startsWith('goto_')) {
      newExpression = 'awe';
      intensity = 0.7;
    } else if (updated.stats.level > (prevLevel || 1)) {
      newExpression = 'happy';
      intensity = 0.6;
    } else if (choiceResult.droppedItems.length > 0) {
      newExpression = 'surprised';
      intensity = 0.5;
    } else if ((updated.stats.hp / updated.stats.maxHp) < 0.3) {
      newExpression = 'injured';
      intensity = 0.7;
    } else {
      const totalGain = choiceResult.effects.expGain + choiceResult.effects.wealthChange + choiceResult.effects.fameChange;
      if (totalGain >= 30) {
        newExpression = 'happy';
        intensity = 0.5;
      } else if (totalGain <= -10) {
        newExpression = 'sad';
        intensity = 0.5;
      }
    }
    setCharacterMood({ expression: newExpression, intensity });

    const gameOver = checkGameOver(updated);
    if (gameOver) {
      setTimeout(() => {
        setScreen('game_over');
      }, 2000);
      return;
    }

    let impact: { eventType: ImpactEventType; title: string; description: string } | null = null;
    const impactItems: ImpactItem[] = [];

    if (choiceResult.combatResult) {
      if (choiceResult.combatResult.isVictory) {
        const hasRareLoot = choiceResult.droppedItems.some(
          (item) => item.rarity === 'legendary' || item.rarity === 'epic'
        );
        if (hasRareLoot) {
          impact = { eventType: 'loot_explosion', title: '稀有战利品！', description: choiceResult.resultText };
        } else {
          impact = { eventType: 'combat_victory', title: '战斗胜利！', description: choiceResult.resultText };
        }
      } else if (!choiceResult.combatResult.isEscape) {
        impact = { eventType: 'combat_defeat', title: '战斗败北', description: choiceResult.resultText };
      }
    } else if (choiceId.startsWith('goto_')) {
      impact = { eventType: 'world_transition', title: '世界穿越', description: choiceResult.resultText };
    } else if (updated.stats.level > (prevLevel || 1)) {
      impact = { eventType: 'level_up', title: '等级提升！', description: choiceResult.resultText };
    }

    for (const item of choiceResult.droppedItems) {
      impactItems.push({ name: item.name, rarity: item.rarity });
    }

    if (impact) {
      setImpactEvent({
        ...impact,
        stats: statDiffs,
        items: impactItems,
      });
    } else {
      setResultText(choiceResult.resultText);
      setShowResult(true);

      setTimeout(() => {
        setShowResult(false);
        setShowEvent(false);
        setCurrentEvent(null);
        startNewTurn();
      }, 1500);
    }
  };

  const getFeatureDisplayName = (feature: string): string => {
    const nameMap: Record<string, string> = {
      basic_feature: '每日签到', daily_reward: '每日签到',
      crit_bonus: '暴击签到', cultivation_reward: '修为奖励', fortune_reset: '改运',
      dao_insight: '悟道', view_stats: '查看属性', scan_enemy: '扫描敌人',
      weakness_analysis: '弱点分析', hidden_stats: '隐藏属性', future_sim: '未来推演',
      true_sight: '天道之眼', daily_tasks: '日常任务', main_quests: '主线任务',
      hidden_quests: '隐藏任务', chain_quests: '连锁任务', world_quests: '世界任务',
      destiny_quests: '天命任务', basic_lottery: '普通抽奖', advanced_pool: '高级奖池',
      pity_system: '保底机制', limited_pool: '限定奖池', destiny_wheel: '命运转盘',
      chaos_lottery: '混沌抽奖', normal_dungeon: '普通副本', elite_dungeon: '精英副本',
      team_dungeon: '组队副本', abyss_dungeon: '深渊副本', world_boss: '世界BOSS',
      endless_tower: '无尽塔', basic_shop: '基础商城', skill_shop: '技能商店',
      discount: '会员折扣', rare_items: '稀有商品', auction: '拍卖行',
      heaven_shop: '天道商店', basic_alchemy: '基础炼丹', weapon_craft: '法宝打造',
      advanced_recipes: '高级丹方', master_craft: '宗师炼制', god_craft: '神级炼制',
      creation: '造化之手', pet_catch: '捕捉灵宠', summon: '召唤伙伴',
      pet_evolve: '灵宠进化', divine_summon: '神兽召唤', telepathy: '心灵感应',
      beast_king: '万兽之王', basic_devour: '基础吞噬', ability_steal: '能力掠夺',
      aoe_devour: '群体吞噬', law_devour: '法则吞噬', world_devour: '世界吞噬',
      chaos_devour: '混沌吞噬', time_sense: '时间感知', time_accel: '时间加速',
      time_slow: '时间减速', time_rewind: '时间回溯', time_stop: '时间停止',
      time_river: '时间长河',
    };
    return nameMap[feature] || feature;
  };

  if (!player) return null;

  const realmIndex = Math.min(
    Math.floor((player.stats.level - 1) / 10),
    (scene?.realmNames.length || 1) - 1
  );
  const currentRealm = scene?.realmNames[realmIndex] || '凡人';

  return (
    <div className="h-screen flex flex-col paper-bg overflow-hidden">
      <SpeedLines active={currentEvent !== null} intensity="low" />

      {/* Top bar */}
      <MangaPanel className="px-4 py-3 !shadow-none !border-t-0 !border-x-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-bold text-lg">{player.name}</div>
            <div className="text-xs text-game-text-muted">
              {scene?.name} · {player.progress.age}岁 · 第{player.progress.round}回合
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-24">
              <HalftoneBar value={player.stats.hp} max={player.stats.maxHp} label="HP" color="green" />
            </div>
            <div className="w-24">
              <HalftoneBar value={player.stats.mp} max={player.stats.maxMp} label="MP" color="blue" />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="manga-badge">Lv.{player.stats.level}</span>
              <span className="manga-badge" style={{ background: '#d4a017', color: '#1a1a1a' }}>
                ¥{Math.floor(player.stats.wealth)}
              </span>
              <span className="manga-badge">战力 {Math.floor(player.stats.combatPower)}</span>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-[#f0ebe0] transition-colors"
                title="设置"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </MangaPanel>

      {/* Main content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-3 py-3 grid grid-cols-12 gap-3 overflow-hidden">
        {/* Left column - Portrait + Attributes + Equipment */}
        <div className="col-span-3 space-y-3 overflow-y-auto pr-1">
          {/* Character Portrait */}
          {portraitState && (
            <MangaPanel className="!p-3">
              <div className="flex justify-center">
                <CharacterPortrait
                  state={portraitState}
                  spritesheetUrl={spriteUrl}
                  size={180}
                />
              </div>
            </MangaPanel>
          )}

          {/* Attributes */}
          <MangaPanel className="!p-3">
            <h3 className="font-bold mb-2 manga-title text-sm">属性面板</h3>
            <div className="space-y-1.5">
              {Object.entries(player.attributes).map(([key, value]) => {
                const attrNames: Record<string, string> = {
                  talent: '天赋', appearance: '颜值', intelligence: '智商',
                  physique: '体质', family: '家境', luck: '运气',
                };
                return (
                  <div key={key}>
                    <HalftoneBar value={value} max={10} label={attrNames[key] || key} color="ink" />
                  </div>
                );
              })}
            </div>
          </MangaPanel>

          {/* Equipment */}
          <MangaPanel className="!p-3">
            <h3 className="font-bold mb-2 flex items-center gap-1.5 manga-title text-sm">
              <Shield className="w-3.5 h-3.5" />
              装备栏
            </h3>
            <div className="space-y-1.5">
              {(['weapon', 'armor', 'accessory'] as const).map((slot) => {
                const equipped = player.equipment[slot];
                const slotNames = { weapon: '武器', armor: '防具', accessory: '饰品' };
                const slotColors: Record<string, string> = { weapon: '#c0392b', armor: '#2980b9', accessory: '#d4a017' };
                const slotIcons = {
                  weapon: <Sword className="w-3.5 h-3.5" style={{ color: slotColors.weapon }} />,
                  armor: <Shield className="w-3.5 h-3.5" style={{ color: slotColors.armor }} />,
                  accessory: <Sparkles className="w-3.5 h-3.5" style={{ color: slotColors.accessory }} />,
                };
                return (
                  <div key={slot} className={`flex items-center justify-between p-1.5 ink-border ${equipped ? 'bg-white' : 'bg-white/40'}`}>
                    <div className="flex items-center gap-1.5">
                      {slotIcons[slot]}
                      <span className="text-xs font-medium">{equipped ? equipped.name : `未装备${slotNames[slot]}`}</span>
                    </div>
                    {equipped && (
                      <button
                        onClick={() => {
                          const res = unequipItem(slot);
                          if (res.success) {
                            setSystemMessage(res.message);
                            setShowSystemMsg(true);
                            addSystemLog('info', res.message);
                            setTimeout(() => setShowSystemMsg(false), 3000);
                          }
                        }}
                        className="px-1.5 py-0.5 text-xs ink-border bg-white hover:bg-gray-100"
                        style={{ color: '#c0392b' }}
                      >
                        卸下
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </MangaPanel>
        </div>

        {/* Center column - Main game */}
        <div className="col-span-6 space-y-3 overflow-y-auto">
          {/* Settings panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <MangaPanel>
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  游戏设置
                </h3>
                <div className="flex flex-wrap gap-4 mb-4">
                  <button
                    onClick={handleExportSave}
                    className="manga-btn-outline flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    导出存档
                  </button>
                  <label className="manga-btn-outline flex items-center gap-2 text-sm cursor-pointer">
                    <Upload className="w-4 h-4" />
                    导入存档
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleImportSave}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setShowAiSettings(!showAiSettings)}
                    className="manga-btn-outline flex items-center gap-2 text-sm"
                  >
                    <Brain className="w-4 h-4" />
                    AI 设置
                  </button>
                </div>
                {importError && (
                  <p className="text-sm mt-2" style={{ color: '#c0392b' }}>{importError}</p>
                )}

                <AnimatePresence>
                  {showAiSettings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t-3 mt-4 pt-4 space-y-3"
                      style={{ borderColor: '#1a1a1a' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4" />
                        <span className="font-medium">AI 内容生成</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAiConfig({ ...aiConfig, type: 'deepseek' })}
                          className={`px-3 py-1.5 text-sm transition-colors ${
                            aiConfig.type === 'deepseek'
                              ? 'manga-btn text-xs'
                              : 'manga-btn-outline text-xs'
                          }`}
                        >
                          DeepSeek AI
                        </button>
                        <button
                          onClick={() => setAiConfig({ ...aiConfig, type: 'fallback' })}
                          className={`px-3 py-1.5 text-sm transition-colors ${
                            aiConfig.type === 'fallback'
                              ? 'manga-btn text-xs'
                              : 'manga-btn-outline text-xs'
                          }`}
                        >
                          本地模板
                        </button>
                      </div>
                      {aiConfig.type === 'deepseek' && (
                        <div className="space-y-2">
                          <input
                            type="password"
                            placeholder="DeepSeek API Key (sk-...)"
                            value={aiConfig.apiKey || ''}
                            onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                            className="manga-input w-full text-sm"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            try {
                              saveProviderConfig(aiConfig);
                              setAiError('');
                              setSystemMessage('AI 配置已保存！');
                              setShowSystemMsg(true);
                              setTimeout(() => setShowSystemMsg(false), 3000);
                            } catch (e) {
                              setAiError('保存失败');
                            }
                          }}
                          className="manga-btn text-sm px-4 py-1.5"
                        >
                          保存配置
                        </button>
                      </div>
                      {aiError && <p className="text-xs" style={{ color: '#c0392b' }}>{aiError}</p>}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="border-t-3 mt-4 pt-4" style={{ borderColor: '#1a1a1a' }}>
                  <span className="text-sm font-bold">特效强度</span>
                  <div className="flex gap-2 mt-2">
                    {(['full', 'text-only', 'off'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => {
                          setEffectLevel(level);
                          localStorage.setItem('game_effect_level', level);
                        }}
                        className={`text-xs px-3 py-1.5 transition-colors ${
                          effectLevel === level ? 'manga-btn' : 'manga-btn-outline'
                        }`}
                      >
                        {level === 'full' ? '全开' : level === 'text-only' ? '仅大字幕' : '关闭'}
                      </button>
                    ))}
                  </div>
                </div>
                </MangaPanel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scene display */}
          <MangaPanel className="min-h-[200px]">
            <div className="flex items-center gap-2 mb-4 text-game-text-muted">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{scene?.name}</span>
              <span className="text-xs">·</span>
              <span className="text-xs font-bold" style={{ color: '#1a1a1a' }}>{currentRealm}</span>
              <span className="text-xs">·</span>
              <span className="text-xs">第{player.progress.sceneLevel}层天</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={sceneText}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-lg leading-relaxed mb-6"
              >
                <TypewriterText text={sceneText} speed={20} />
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {showEvent && currentEvent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="ink-border p-4 mb-4 bg-white"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4" style={{ color: '#1a1a1a' }} />
                    <span className="font-bold">{currentEvent.title}</span>
                  </div>
                  <p className="text-game-text-muted">{currentEvent.description}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showEvent && currentEvent && (
                <div className="absolute top-4 right-8 z-50 pointer-events-none">
                  <Onomatopoeia text="ドン！" variant="impact" />
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 font-bold"
                  style={{ color: '#27ae60' }}
                >
                  {resultText}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Choices with character portrait */}
            {!showResult && (
              <>
                {/* Mobile portrait above choices */}
                {portraitState && (
                  <motion.div
                    className="md:hidden flex justify-center w-full mb-3"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <CharacterPortrait
                      state={portraitState}
                      spritesheetUrl={spriteUrl}
                      size={140}
                    />
                  </motion.div>
                )}
                <div className="flex gap-4 items-start">
                  {/* Desktop portrait beside choices */}
                  {portraitState && (
                    <motion.div
                      className="flex-shrink-0 hidden md:block"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05 }}
                    >
                      <CharacterPortrait
                        state={portraitState}
                        spritesheetUrl={spriteUrl}
                        size={180}
                      />
                    </motion.div>
                  )}
                  <div className="space-y-2 flex-1">
                    {choices.map((choice, index) => (
                      <motion.button
                        key={choice.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleChoice(choice.id)}
                        disabled={isProcessing}
                        className="manga-btn w-full text-left flex items-center justify-between"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div>
                          <span className="font-bold">{choice.text}</span>
                          {choice.consequence && (
                            <div className="text-xs text-game-text-muted mt-1">{choice.consequence}</div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50 flex-shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {isProcessing && (
              <div className="text-center text-game-text-muted py-4">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  系统推演中...
                </motion.div>
              </div>
            )}
          </MangaPanel>

          {/* Logs */}
          <MangaPanel>
            <h3 className="font-bold mb-3 flex items-center gap-2 manga-title">
              <Scroll className="w-4 h-4" />
              历史记录
            </h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {logs.slice(-10).map((log, i) => (
                <div key={i} className="log-entry">{log}</div>
              ))}
            </div>
          </MangaPanel>
        </div>

        {/* Right panel - Stats & info */}
        <div className="col-span-3 space-y-3 overflow-y-auto">
          <MangaPanel>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2 manga-title">
                <Terminal className="w-4 h-4" />
                系统记录
              </h3>
              <span className="text-xs text-game-text-muted">{systemLogs.length} 条</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {systemLogs.length === 0 ? (
                <div className="text-sm text-game-text-muted">暂无系统记录</div>
              ) : (
                systemLogs.slice(-20).map((log) => {
                  const iconMap: Record<string, React.ReactNode> = {
                    info: <Info className="w-3 h-3" style={{ color: '#2980b9' }} />,
                    warning: <AlertTriangle className="w-3 h-3" style={{ color: '#d4a017' }} />,
                    reward: <Gift className="w-3 h-3" style={{ color: '#d4a017' }} />,
                    upgrade: <Zap className="w-3 h-3" style={{ color: '#1a1a1a' }} />,
                    error: <AlertTriangle className="w-3 h-3" style={{ color: '#c0392b' }} />,
                  };
                  const colorMap: Record<string, string> = {
                    info: '#2980b9', warning: '#d4a017', reward: '#d4a017',
                    upgrade: '#1a1a1a', error: '#c0392b',
                  };
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="text-xs text-game-text-muted mt-0.5">[{log.time}]</span>
                      {iconMap[log.type]}
                      <span style={{ color: colorMap[log.type] }}>{log.text}</span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </MangaPanel>

          <MangaPanel>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-5 h-5" />
              <h3 className="font-bold manga-title">{systemDef?.name}</h3>
            </div>
            <div className="text-sm text-game-text-muted mb-2">
              等级: {player.system.level} / {systemDef?.maxLevel || 10}
            </div>
            <HalftoneBar
              value={player.system.exp}
              max={player.system.level * 50}
              label="EXP"
              color="ink"
              className="mb-3"
            />
            <div className="flex flex-wrap gap-1.5 mt-3">
              {player.system.features.map((feature) => (
                <button
                  key={feature}
                  onClick={() => handleSystemFeature(feature)}
                  className="manga-btn-outline text-xs py-1 px-2"
                >
                  {getFeatureDisplayName(feature)}
                </button>
              ))}
            </div>
          </MangaPanel>

          <MangaPanel>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2 manga-title">
                <Package className="w-4 h-4" style={{ color: '#1a1a1a' }} />
                背包
              </h3>
              <span className="text-xs text-game-text-muted">{player.inventory.length} 物品</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {player.inventory.length === 0 ? (
                <div className="text-sm text-game-text-muted">背包空空如也</div>
              ) : (
                player.inventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 ink-border bg-white"
                  >
                    <div className="flex items-center gap-2">
                      {itemTypeIcons[item.type]}
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.name}</div>
                        <div className="text-xs text-game-text-muted">{item.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {(item.type === 'weapon' || item.type === 'armor' || item.type === 'skill_book') && (
                        <button
                          onClick={() => {
                            const res = equipItem(item.id);
                            if (res.success) {
                              setSystemMessage(res.message);
                              setShowSystemMsg(true);
                              addSystemLog('info', res.message);
                              setTimeout(() => setShowSystemMsg(false), 3000);
                            }
                          }}
                          className="manga-btn text-xs py-1 px-2"
                        >
                          装备
                        </button>
                      )}
                      {item.type === 'consumable' && (
                        <button
                          onClick={() => handleUseItem(item.id)}
                          className="manga-btn text-xs py-1 px-2"
                        >
                          使用
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </MangaPanel>

          <MangaPanel>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2 manga-title">
                <Scroll className="w-4 h-4" style={{ color: '#1a1a1a' }} />
                任务列表
              </h3>
              <span className="text-xs text-game-text-muted">{player.activeTasks.length} 进行中</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {player.activeTasks.length === 0 ? (
                <div className="text-sm text-game-text-muted">暂无任务</div>
              ) : (
                player.activeTasks.map((task) => (
                  <div key={task.id} className="ink-border bg-white p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{task.name}</span>
                      <span className="manga-badge text-xs">
                        {task.type === 'main' ? '主线' : task.type === 'side' ? '支线' : '日常'}
                      </span>
                    </div>
                    <p className="text-xs text-game-text-muted mb-2">{task.description}</p>
                    <div className="mb-2">
                      <HalftoneBar
                        value={task.progress}
                        max={task.targetRounds}
                        label="进度"
                        color="ink"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span style={{ color: '#d4a017' }}>EXP +{task.reward.exp}</span>
                      <span style={{ color: '#27ae60' }}>财富 +{task.reward.wealth}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </MangaPanel>

          <AnimatePresence>
            {showAchievements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <MangaPanel>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5" style={{ color: '#d4a017' }} />
                    <span className="font-bold" style={{ color: '#d4a017' }}>解锁成就!</span>
                  </div>
                  {showAchievements.map((achId) => (
                    <div key={achId} className="text-sm" style={{ color: '#1a1a1a' }}>{achId}</div>
                  ))}
                </MangaPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {floaters.map((f, i) => (
          <FloatingNumber
            key={f.id}
            value={f.value}
            label={f.label}
            color={f.color}
            x={(i % 3 - 1) * 80}
            y={-20}
            onComplete={() =>
              setFloaters((prev) => prev.filter((x) => x.id !== f.id))
            }
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {showSystemMsg && systemMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 max-w-md"
          >
            <MangaPanel className="ink-shadow">
              <div className="flex items-center gap-2 font-medium mb-1" style={{ color: '#1a1a1a' }}>
                <Sparkles className="w-4 h-4" />
                <span>系统提示</span>
              </div>
              <p className="text-sm">{systemMessage}</p>
            </MangaPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <SystemDialogue />
      <NarrativeEvent />
      <DemoOverlay />

      {impactEvent && (
        <ImpactFrame
          eventType={impactEvent.eventType}
          title={impactEvent.title}
          description={impactEvent.description}
          stats={impactEvent.stats}
          items={impactEvent.items}
          onContinue={handleImpactContinue}
        />
      )}

      <AnimatePresence>
        {peakOnomatopoeia && (
          <Onomatopoeia
            text={peakOnomatopoeia.text}
            variant="meme"
            color={peakOnomatopoeia.color}
            className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {effectLevel !== 'off' && <BarrageToast items={barrages} />}
    </div>
  );
}
