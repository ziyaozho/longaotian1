import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { processTurn, processChoice, updatePlayerAfterTurn, checkGameOver } from '../../agents/orchestrator';
import type { TurnResult } from '../../agents/orchestrator';
import { getSceneById } from '../../data/scenes';
import { getSystemById } from '../../data/systems';
import { getLevelFromExp } from '../../config/gameConfig';
import type { GameEvent, Choice, Talent, Item } from '../../types';
import TalentSelect from './TalentSelect';
import { calcSynergies, getSynergyStrengthColor } from '../../utils/talentSync';
import { RARITY_LABELS } from '../../config/gameConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { saveGame as saveGameToDB } from '../../utils/database';
import { exportSave, importSave } from '../../utils/storage';
import TypewriterText from '../TypewriterText';
import FloatingNumber from '../FloatingNumber';
import BarrageToast from '../BarrageToast';
import LoadingScreen from '../LoadingScreen';
import { processMemoryAfterTurn } from '../../engine/memoryCompression';
import MerchantShop from './MerchantShop';
import type { MerchantItem } from '../../data/artifacts';
import { createInitialSystemHistory, recordReward, type SystemHistory } from '../../engine/systemHistory';
import { selectEndingByAttributes } from '../../engine/endingTracker';
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
import { AlertTriangle, Gift, Info, Terminal } from 'lucide-react';
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

// ending.md.txt: 命运预感模糊提示词库
const ENDING_HINTS: Record<string, string[]> = {
  ending_modern_king: [
    '你隐约感到，权力的巅峰正在远方召唤...',
    '财富与声望如潮水般涌来，但你心中有一个更大的野心...',
    '这座城市似乎在等待一个新的主人...',
  ],
  ending_immortal_hermit: [
    '你感到内心深处渴望远离纷争，寻找一片宁静之地...',
    '某个人的身影总是在你修炼时浮现在脑海...',
    '你发现自己在收集炼丹材料时，总会多准备一份...',
  ],
  ending_urban_legend: [
    '有人开始在暗中调查你的来历...',
    '你感觉到自己正在成为这座城市的一个"传说"...',
    '街头的巷议中，出现了一个与你相似的神秘身影...',
  ],
  ending_apocalypse_savior: [
    '幸存者们开始用期盼的眼神看着你...',
    '你感到肩上的责任越来越重...',
    '在这片废土上，人们需要一盏明灯...',
  ],
  ending_apoc_fantasy_rider: [
    '你的血脉中似乎有什么正在觉醒...',
    '末日预言的片段不断在你梦中浮现...',
    '你感觉到一股来自远古的力量正在呼唤你...',
  ],
  ending_hidden_immortal: [
    '天地间的灵气似乎在向你汇聚...',
    '你隐约听到大道之音在耳边回响...',
    '追求永生的道路上，你越走越远...',
  ],
  ending_cyber_god: [
    '数字世界的边界在你面前逐渐消融...',
    '你开始质疑肉体的局限性...',
    '某个超级AI向你发出了一个无法拒绝的邀请...',
  ],
  ending_demon_overlord: [
    '深渊中的存在对你投来了注视...',
    '你感到体内有一股力量渴望被释放...',
    '毁灭与新生的循环，似乎与你的命运紧密相连...',
  ],
};

function getEndingHint(endingId: string, round: number): string {
  const hints = ENDING_HINTS[endingId] || ['命运的齿轮正在转动...'];
  const index = Math.min(Math.floor(round / 10), hints.length - 1);
  return hints[index];
}

const itemTypeIcons: Record<string, React.ReactNode> = {
  consumable: <FlaskConical className="w-3 h-3" />,
  weapon: <Sword className="w-3 h-3" />,
  armor: <Shield className="w-3 h-3" />,
  skill_book: <BookOpen className="w-3 h-3" />,
  material: <Package className="w-3 h-3" />,
};

export default function GameMain() {
  const { setScreen, addLog, logs, systemMessage, setSystemMessage, characterMood, setCharacterMood } = useGameStore();
  const {
    player, setPlayer, addAchievement, addItem, useItem, equipItem, unequipItem, addTalent,
    updateStoryMemory, addRecentEvent, addDecisionLog, updateWorldState, setGlobalFlag,
    updateEndingProgress, updateExtendedSystem, addOrUpdateNPC, updateNPCRelationship,
    updateNPCStatus, updateNPCMemory,
  } = usePlayerStore();

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
  const [showLoading, setShowLoading] = useState(false);
  const [importError, setImportError] = useState('');

  // 系统agent设计.txt: 系统历史记录
  const systemHistoryRef = useRef<SystemHistory>(createInitialSystemHistory());
  const [floaters, setFloaters] = useState<{ id: string; value: number; label: string; color: string }[]>([]);
  const [prevStats, setPrevStats] = useState(player?.stats);
  const [prevLevel, setPrevLevel] = useState(player?.stats.level || 1);
  const [systemLogs, setSystemLogs] = useState<Array<{ id: number; type: 'info' | 'warning' | 'reward' | 'upgrade' | 'error'; text: string; time: string }>>([]);
  const [hasSignedInToday, setHasSignedInToday] = useState(false);
  const [aiOnline, setAiOnline] = useState(true);
  const [spriteUrl, setSpriteUrl] = useState<string | null>(null);
  const lastTurnResult = useRef<TurnResult | null>(null);
  const rhythmRef = useRef(createRhythmController());
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showTalentSelect, setShowTalentSelect] = useState(false);
  const [talentCandidates, setTalentCandidates] = useState<Talent[]>([]);

  // 系统紧急支援弹窗
  const [sysIntervention, setSysIntervention] = useState<GameEvent | null>(null);
  const [showSysIntervention, setShowSysIntervention] = useState(false);
  const [showMerchantShop, setShowMerchantShop] = useState(false);

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
    const store = usePlayerStore.getState();
    const currentPlayer = store.player;
    if (!currentPlayer) return;

    let message = '';
    let logType: 'info' | 'reward' | 'warning' | 'upgrade' = 'info';
    let newStats = { ...currentPlayer.stats };
    let newSystem = { ...currentPlayer.system };
    let newHasSignedIn = hasSignedInToday;

    switch (feature) {
      case 'daily_reward':
      case 'basic_feature': {
        if (newHasSignedIn) {
          message = '今日已签到，请明天再来';
          logType = 'info';
          break;
        }
        // 龙傲天级签到：数值膨胀100倍 + 新手大礼包
        const newStreak = systemHistoryRef.current.checkInStreak + 1;
        const isFirstSignIn = systemHistoryRef.current.totalCheckIns === 0;

        // 签到奖励指数级膨胀
        const rewardWealth = isFirstSignIn
          ? 10000000  // 首次签到：一千万！
          : newStreak >= 7 ? 100000
          : newStreak >= 3 ? 30000
          : newStreak >= 2 ? 10000
          : 5000;

        const expReward = isFirstSignIn
          ? 5000  // 首次签到直升5级
          : Math.floor(Math.random() * 500) + newStreak * 200;

        const combatBonus = isFirstSignIn ? 1000 : newStreak >= 7 ? 500 : 50;

        newStats.exp += expReward;
        newStats.wealth += rewardWealth;
        newStats.combatPower += combatBonus;
        newHasSignedIn = true;

        systemHistoryRef.current.checkInStreak = newStreak;
        systemHistoryRef.current.totalCheckIns++;

        if (isFirstSignIn) {
          message = `🔔叮！检测到宿主首次激活系统！新手大礼包已发放！\n💰现金：一千万（¥${rewardWealth.toLocaleString()}）\n⚔️战力：+${combatBonus}\n⭐经验：+${expReward}\n📦传说宝箱已解锁！\n\n"从今天起，你就是天选之子。全世界都将为你让路。"`;
          logType = 'reward';
        } else if (newStreak % 7 === 0) {
          message = `叮！连续签到${newStreak}天！系统评定：天选之人！获得¥${rewardWealth.toLocaleString()}、战力+${combatBonus}！传说级道具已发放至背包！宿主，世界正在颤抖！`;
          logType = 'reward';
        } else {
          message = `叮！第${newStreak}天签到成功！¥${rewardWealth.toLocaleString()}已到账，战力+${combatBonus}。宿主，距离称霸世界又近了一步！`;
          logType = 'reward';
        }
        break;
      }
      case 'crit_bonus': {
        const crit = Math.random() > 0.7;
        const reward = crit ? Math.floor(Math.random() * 200) + 100 : Math.floor(Math.random() * 50) + 20;
        newStats.exp += reward;
        message = crit ? `暴击签到！获得${reward}经验！` : `签到获得${reward}经验`;
        logType = 'reward';
        break;
      }
      case 'scan_enemy': {
        const enemyPower = Math.floor(newStats.combatPower * (0.8 + Math.random() * 0.6));
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
        const cost = 500;
        if (newStats.wealth < cost) { message = '财富不足，需要500财富才能抽奖'; logType = 'warning'; break; }
        newStats.wealth -= cost;
        const roll = Math.random();
        if (roll > 0.95) {
          newStats.combatPower += 500; newStats.exp += 2000;
          message = '🎰金色传说！战力+500，经验+2000！系统判定：欧皇本皇！';
        } else if (roll > 0.8) {
          newStats.combatPower += 200; newStats.exp += 500;
          message = '🎰紫色史诗！战力+200，经验+500。不错的手气！';
        } else if (roll > 0.5) {
          newStats.wealth += 800; newStats.exp += 200;
          message = '🎰蓝色稀有！回收800财富+200经验。保本小赚~';
        } else {
          newStats.exp += 50;
          message = '🎰白色普通...获得50经验。宿主，今天运气不太好呢。';
        }
        logType = 'reward';
        break;
      }
      // 吞噬：消耗背包物品转化为战力
      case 'basic_devour': {
        const consumables = currentPlayer?.inventory.filter((i) => i.type === 'consumable' || i.type === 'material') || [];
        if (consumables.length === 0) { message = '背包中没有可吞噬的物品'; logType = 'warning'; break; }
        const target = consumables[Math.floor(Math.random() * consumables.length)];
        const powerGain = target.rarity === 'legendary' ? 500 : target.rarity === 'epic' ? 200 : target.rarity === 'rare' ? 80 : 30;
        newStats.combatPower += powerGain;
        // 移除物品
        const store2 = usePlayerStore.getState();
        if (store2.player) store2.removeItem(target.id);
        message = `吞噬了【${target.name}】！战力永久+${powerGain}！万物皆可吞噬，这就是超级吞噬系统的力量！`;
        logType = 'reward';
        break;
      }
      // 复制：消耗mp复制背包中随机物品
      case 'ability_steal': {
        if (newStats.mp < 20) { message = '灵力不足，需要20点MP'; logType = 'warning'; break; }
        newStats.mp -= 20;
        const toCopy = currentPlayer?.inventory.filter((i) => i.rarity === 'epic' || i.rarity === 'legendary') || [];
        if (toCopy.length === 0) { message = '没有可复制的史诗级以上物品。复制了一张空气...'; logType = 'warning'; break; }
        message = `扫描到可复制目标：${toCopy.map((i) => i.name).join('、')}。复制功能需要AI在线支持——敬请期待！`;
        logType = 'info';
        break;
      }
      case 'normal_dungeon': {
        const dungeonDiff = Math.floor(Math.random() * 3) + 1;
        const success = Math.random() > 0.3;
        if (success) {
          const exp = dungeonDiff * 80;
          const wealth = dungeonDiff * 40;
          newStats.exp += exp;
          newStats.wealth += wealth;
          message = `副本通关！获得${exp}经验和${wealth}财富`;
          logType = 'reward';
        } else {
          const damage = dungeonDiff * 15;
          newStats.hp = Math.max(1, newStats.hp - damage);
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
        if (newStats.mp >= 10) {
          newStats.mp -= 10;
          const success = Math.random() > 0.3;
          if (success) {
            newStats.hp = Math.min(newStats.maxHp, newStats.hp + 40);
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
          newStats.combatPower += 15;
          message = '捕捉成功！灵宠加入，战斗力+15';
          logType = 'reward';
        } else {
          message = '捕捉失败，灵宠逃走了...';
          logType = 'warning';
        }
        break;
      }
      case 'summon': {
        newStats.mp = Math.max(0, newStats.mp - 15);
        newStats.combatPower += 20;
        message = '召唤成功！战斗伙伴加入，战斗力+20';
        logType = 'reward';
        break;
      }
      default:
        message = `功能【${feature}】正在开发中`;
    }

    // 处理升级
    const newLevel = getLevelFromExp(newStats.exp);
    if (newLevel > newStats.level) {
      newStats.level = newLevel;
      newStats.maxHp += 20;
      newStats.maxMp += 10;
      newStats.hp = newStats.maxHp;
      newStats.combatPower += 15;
      message += `，升级至${newLevel}级！`;
      logType = 'upgrade';
    }

    // 更新本地状态
    if (newHasSignedIn !== hasSignedInToday) {
      setHasSignedInToday(newHasSignedIn);
    }

    // 构建新的 player 对象（不可变更新）
    const updatedPlayer = {
      ...currentPlayer,
      stats: newStats,
      system: newSystem,
    };

    // 触发 React 重渲染
    store.setPlayer(updatedPlayer);

    // 自动存档
    saveGameToDB(updatedPlayer).catch(() => {});

    // Narrative system triggers
    switch (feature) {
      case 'daily_reward':
      case 'basic_feature':
        if (!newHasSignedIn) {
          triggerSignInDialogue(updatedPlayer, '每日首次签到');
        }
        break;
      case 'crit_bonus':
        triggerSignInDialogue(updatedPlayer, '周签到完成');
        break;
      case 'basic_lottery': {
        const rollType = message.includes('大奖')
          ? '抽到传说奖励'
          : message.includes('200财富')
          ? '抽到稀有奖励'
          : '抽到普通奖励';
        triggerLotteryDialogue(updatedPlayer, rollType as any);
        break;
      }
      case 'normal_dungeon': {
        const dungeonSuccess = !message.includes('失败');
        triggerCopyDialogue(
          updatedPlayer,
          dungeonSuccess ? '副本通关' : '进入副本',
          { rating: dungeonSuccess ? 'S' : undefined }
        );
        break;
      }
      case 'basic_alchemy': {
        const alchemySuccess = message.includes('成功');
        triggerAlchemyDialogue(
          updatedPlayer,
          alchemySuccess ? '炼丹成功' : '炼丹失败',
          { quality: alchemySuccess ? '上品' : undefined }
        );
        break;
      }
      case 'pet_catch': {
        const petSuccess = message.includes('成功');
        const petPotential = ['凡品', '良品', '上品', '极品', '仙品'][Math.floor(Math.random() * 5)];
        triggerPetDialogue(
          updatedPlayer,
          petSuccess ? '获得宠物' : '宠物升级',
          { petName: petSuccess ? '未知灵宠' : undefined, potential: petPotential }
        );
        break;
      }
      case 'summon': {
        const summonPotential = ['凡品', '良品', '上品', '极品', '仙品'][Math.floor(Math.random() * 5)];
        triggerPetDialogue(updatedPlayer, '获得宠物', { petName: '召唤兽', potential: summonPotential });
        break;
      }
      case 'basic_shop':
        triggerShopDialogue(updatedPlayer, '打开商店');
        break;
    }

    setSystemMessage(message);
    setShowSystemMsg(true);
    addSystemLog(logType, message);
    setTimeout(() => setShowSystemMsg(false), 3000);
  };

  // Initial turn + 开局选定隐藏结局
  useEffect(() => {
    if (player && sceneText === '') {
      // 确保结局已选定（SystemSelect 已选，此处兜底）
      if (!player.endingProgress.targetEndingId) {
        const ending = selectEndingByAttributes(player.attributes);
        updateEndingProgress({ targetEndingId: ending.endingId });
      }
      startNewTurn();
    }
  }, [player]);

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
        saveGameToDB(imported).catch(() => {});
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
    setSystemLogs((prev) => [...prev.slice(-49), { id: crypto.randomUUID(), type, text, time }]);
  }, []);

  const startNewTurn = useCallback(async () => {
    const currentPlayer = usePlayerStore.getState().player;
    if (!currentPlayer) return;
    setIsProcessing(true);
    setShowLoading(true);

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
        setAiOnline(false);
        addSystemLog('warning', 'AI 服务暂不可用，已切换至本地模板');
      }


      if (turnResult.droppedItems.length > 0) {
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

      if (turnResult.talentChoice) {
        setTalentCandidates(turnResult.talentChoice.candidates);
        setShowTalentSelect(true);
      }

      // 系统紧急支援弹窗（不影响主线剧情）
      if (turnResult.systemIntervention) {
        setSysIntervention(turnResult.systemIntervention);
        setShowSysIntervention(true);
      }

      // ending.md.txt: 更新世界状态
      if (turnResult.worldStateUpdate) {
        updateWorldState({ timeline: turnResult.worldStateUpdate.newTimeline });
        for (const flag of turnResult.worldStateUpdate.newFlags) {
          setGlobalFlag(flag, true);
        }
      }

      // ending.md.txt: 提取关键事件并触发记忆压缩（合并为一步，避免竞态）
      const keyEvent = turnResult.event
        ? turnResult.event.description.substring(0, 80)
        : turnResult.sceneText.substring(0, 80);

      processMemoryAfterTurn(
        currentPlayer.storyMemory,
        currentPlayer.progress.round,
        keyEvent
      ).then((newMemory) => {
        updateStoryMemory(newMemory);
      }).catch(() => {
        // 压缩失败时至少保留原始事件
        addRecentEvent(currentPlayer.progress.round, keyEvent);
      });

      // ending.md.txt: NPC 邂逅持久化
      if (turnResult.npcEncounter) {
        addOrUpdateNPC(turnResult.npcEncounter.npc);
        if (turnResult.npcEncounter.isNew) {
          addSystemLog('info', `邂逅新人物：${turnResult.npcEncounter.npc.name}`);
        }
      }

      // 系统agent设计.txt: 处理系统智能体结果
      if (turnResult.systemAgentResult) {
        const sa = turnResult.systemAgentResult;
        // 显示系统对话
        if (sa.systemDialogue) {
          setSystemMessage(sa.systemDialogue);
          setShowSystemMsg(true);
          setTimeout(() => setShowSystemMsg(false), 4000);
          addSystemLog('reward', sa.systemDialogue);
        }
        // 更新历史
        for (const reward of sa.rewards) {
          if (reward.type === 'wealth' && reward.amount) {
            addSystemLog('reward', `获得¥${reward.amount}`);
          }
          if (reward.type === 'artifact' && reward.name) {
            systemHistoryRef.current = recordReward(
              systemHistoryRef.current,
              reward.name,
              reward.itemId || '',
              0
            );
          }
        }
        // 更新签到天数
        const streakMatch = sa.systemNotes.match(/check_in_streak:(\d+)/);
        if (streakMatch) {
          systemHistoryRef.current.checkInStreak = parseInt(streakMatch[1], 10);
        }
        // 新任务
      }

      // ending.md.txt: NPC 自主行动 —— 传闻 + 状态持久化
      if (turnResult.npcAutonomyActions && turnResult.npcAutonomyActions.length > 0) {
        for (const action of turnResult.npcAutonomyActions) {
          addSystemLog('info', `[传闻] ${action.worldHint}`);
          if (action.newStatus) {
            updateNPCStatus(action.npcId, { currentStatus: action.newStatus });
          }
          if (action.newGoal) {
            updateNPCStatus(action.npcId, { currentGoal: action.newGoal });
          }
          if (action.newMemory) {
            updateNPCMemory(action.npcId, action.newMemory);
          }
        }
      }

      // ending.md.txt: 结局触发检测
      if (turnResult.endingTriggered?.triggered) {
        const endingType = turnResult.endingTriggered.isVictory ? '达成' : '失败';
        addSystemLog('upgrade', `隐藏结局${endingType}！`);
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
      setShowLoading(false);
    }
  }, [addLog, setSystemMessage, addItem, addAchievement, addSystemLog]);

  const handleTalentSelect = useCallback((talent: Talent) => {
    addTalent(talent);
    setShowTalentSelect(false);
    setSystemMessage(`获得天赋【${talent.name}】！`);
    setShowSystemMsg(true);
    addSystemLog('upgrade', `觉醒天赋: ${talent.name}`);
    setTimeout(() => setShowSystemMsg(false), 3000);
  }, [addTalent, setSystemMessage, addSystemLog]);

  // 商人商城购买（消耗 wealth 金钱）—— 使用 getState 避免闭包过期
  const handleMerchantBuy = useCallback((item: MerchantItem) => {
    const store = usePlayerStore.getState();
    const currentPlayer = store.player;
    if (!currentPlayer || currentPlayer.stats.wealth < item.price) return;

    const newItem: Item = {
      id: `${item.id}_${Date.now()}`,
      name: item.name,
      description: item.description,
      rarity: item.rarity,
      type: item.type === 'consumable' ? 'consumable' : item.type === 'equipment' ? 'weapon' : 'material',
      effect: item.effect,
    };

    store.setPlayer({
      ...currentPlayer,
      stats: { ...currentPlayer.stats, wealth: currentPlayer.stats.wealth - item.price },
      inventory: [...currentPlayer.inventory, newItem],
    });

    addSystemLog('reward', `购买【${item.name}】，花费${item.price}金钱`);
    setSystemMessage(`成功购买【${item.name}】！`);
    setShowSystemMsg(true);
    setTimeout(() => setShowSystemMsg(false), 3000);
  }, [addSystemLog, setSystemMessage]);

  const handleSysIntervention = useCallback(async (choiceId: string) => {
    if (!player || !sysIntervention || isProcessing) return;
    setIsProcessing(true);

    const turnResult = lastTurnResult.current;
    if (!turnResult) { setIsProcessing(false); return; }

    const choiceResult = processChoice(player, choiceId, sysIntervention, '', sysIntervention.choices);
    const updated = updatePlayerAfterTurn(player, turnResult, choiceResult, choiceId);
    setPlayer(updated);
    saveGameToDB(updated).catch(() => {});

    if (choiceResult.resultText) {
      setSystemMessage(choiceResult.resultText);
      setShowSystemMsg(true);
      setTimeout(() => setShowSystemMsg(false), 4000);
      addSystemLog('info', choiceResult.resultText);
    }

    setShowSysIntervention(false);
    setSysIntervention(null);
    setIsProcessing(false);
  }, [player, sysIntervention, isProcessing, addSystemLog]);

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

    const turnResult = lastTurnResult.current || {
      sceneText: '',
      event: null,
      choices: [],
      systemMessage: null,
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
      droppedItems: [],
    };

    const choiceResult = processChoice(player, choiceId, currentEvent, turnResult.sceneText, turnResult.choices);

    // ending.md.txt: 记录决策日志
    const selectedChoice = currentEvent
      ? currentEvent.choices.find((c) => c.id === choiceId)
      : turnResult.choices.find((c) => c.id === choiceId);
    if (selectedChoice) {
      addDecisionLog(
        player.progress.round,
        selectedChoice.text,
        choiceResult.resultText || selectedChoice.consequence || '无'
      );
    }

    const updated = updatePlayerAfterTurn(player, turnResult, choiceResult, choiceId);

    const statDiffs: ImpactStat[] = [];
    if (prevStats) {
      const newFloaters: typeof floaters = [];
      const hpDiff = updated.stats.hp - prevStats.hp;
      if (hpDiff !== 0) { newFloaters.push({ id: crypto.randomUUID(), value: hpDiff, label: 'HP', color: hpDiff > 0 ? '#27ae60' : '#c0392b' }); statDiffs.push({ label: 'HP', value: hpDiff }); }
      const mpDiff = updated.stats.mp - prevStats.mp;
      if (mpDiff !== 0) { newFloaters.push({ id: crypto.randomUUID(), value: mpDiff, label: 'MP', color: '#2980b9' }); statDiffs.push({ label: 'MP', value: mpDiff }); }
      const expDiff = updated.stats.exp - prevStats.exp;
      if (expDiff > 0) { newFloaters.push({ id: crypto.randomUUID(), value: expDiff, label: 'EXP', color: '#d4a017' }); statDiffs.push({ label: 'EXP', value: expDiff }); }
      const wealthDiff = updated.stats.wealth - prevStats.wealth;
      if (wealthDiff !== 0) { newFloaters.push({ id: crypto.randomUUID(), value: wealthDiff, label: '财富', color: wealthDiff > 0 ? '#27ae60' : '#c0392b' }); statDiffs.push({ label: '财富', value: wealthDiff }); }
      if (newFloaters.length > 0) {
        setFloaters((prev) => [...prev, ...newFloaters]);
      }
    }
    setPrevStats(updated.stats);
    setPrevLevel(updated.stats.level);
    setPlayer(updated);

    // 自动存档到 IndexedDB
    saveGameToDB(updated).catch(() => {});

    // ending.md.txt: 更新 NPC 关系值
    if (choiceResult.npcRelationshipDelta !== undefined && choiceResult.npcName) {
      const npc = player.npcs.find((n) => n.name === choiceResult.npcName);
      if (npc) {
        updateNPCRelationship(npc.npcId, choiceResult.npcRelationshipDelta);
        addSystemLog('info', `${choiceResult.npcName}的关系值${choiceResult.npcRelationshipDelta > 0 ? '+' : ''}${choiceResult.npcRelationshipDelta}`);
      }
    }

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

    if (choiceResult.rewardedTalent) {
      addTalent(choiceResult.rewardedTalent);
      setSystemMessage(`剧情获得天赋【${choiceResult.rewardedTalent.name}】！`);
      setShowSystemMsg(true);
      addSystemLog('upgrade', `觉醒天赋: ${choiceResult.rewardedTalent.name}`);
      setTimeout(() => setShowSystemMsg(false), 3000);
    }

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
      setImpactEvent({
        eventType: 'story_result',
        title: '关卡总结',
        description: choiceResult.resultText || '事情就这样发生了...',
        stats: statDiffs,
        items: impactItems,
      });
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

      {/* ending.md.txt: AI 推理过场动画 */}
      <LoadingScreen visible={showLoading} />

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
              <span
                className="manga-badge text-xs"
                style={{ background: aiOnline ? '#2d8a4e' : '#8a2d2d', color: '#fff', cursor: 'help' }}
                title={aiOnline ? 'AI 内容生成正常' : 'AI 离线，使用本地模板'}
              >
                {aiOnline ? 'AI' : '本地'}
              </span>
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

          {/* Talents & Synergies */}
          {player.talents.length > 0 && (
            <MangaPanel className="!p-3">
              <h3 className="font-bold mb-2 manga-title text-sm">天赋特质</h3>
              <div className="space-y-1.5">
                {player.talents.map((talent) => {
                  const synergyTag = calcSynergies(player.talents).find(
                    (l) => l.talentA === talent.id || l.talentB === talent.id,
                  );
                  return (
                    <div key={talent.id} className="ink-border p-1.5 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{talent.name}</span>
                        <span className="text-[10px] manga-badge">{RARITY_LABELS[talent.rarity]}</span>
                      </div>
                      <p className="text-[10px] text-game-text-muted mt-0.5">{talent.description}</p>
                      {synergyTag && (
                        <div
                          className="text-[10px] mt-1 font-medium"
                          style={{ color: getSynergyStrengthColor(synergyTag.strength) }}
                        >
                          协同: {synergyTag.comboName} ({synergyTag.strength === 'legendary' ? '传说' : synergyTag.strength === 'strong' ? '强' : '弱'})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </MangaPanel>
          )}

          {/* ending.md.txt: 世界状态 */}
          <MangaPanel className="!p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-game-text-muted">
                <MapPin className="w-3 h-3" /> {player.worldState.currentLocation}
              </span>
              <span className="text-game-text-muted">{player.worldState.timeline}</span>
            </div>
            {Object.keys(player.worldState.globalFlags).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.entries(player.worldState.globalFlags)
                  .filter(([, v]) => v)
                  .slice(0, 3)
                  .map(([flag]) => (
                    <span key={flag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 ink-border">
                      {flag}
                    </span>
                  ))}
              </div>
            )}
          </MangaPanel>

          {/* ending.md.txt: 已知 NPC */}
          {player.npcs.length > 0 && (
            <MangaPanel className="!p-3">
              <h3 className="font-bold mb-2 manga-title text-sm">已知人物 ({player.npcs.length})</h3>
              <div className="space-y-1.5">
                {player.npcs
                  .filter((n) => n.isAlive)
                  .map((npc) => (
                    <div key={npc.npcId} className="ink-border p-1.5 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{npc.name}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded text-white"
                          style={{
                            backgroundColor:
                              npc.relationship >= 80 ? '#e74c3c'
                              : npc.relationship >= 50 ? '#f39c12'
                              : npc.relationship >= 10 ? '#27ae60'
                              : npc.relationship >= -10 ? '#7f8c8d'
                              : npc.relationship >= -50 ? '#2980b9'
                              : '#8e44ad',
                          }}
                        >
                          {npc.relationship >= 80 ? '羁绊'
                            : npc.relationship >= 50 ? '亲近'
                            : npc.relationship >= 10 ? '友善'
                            : npc.relationship >= -10 ? '中立'
                            : npc.relationship >= -50 ? '冷淡'
                            : '敌对'}{' '}
                          {npc.relationship}
                        </span>
                      </div>
                      <p className="text-[10px] text-game-text-muted mt-0.5">{npc.role}</p>
                      <p className="text-[10px] text-game-text-muted">{npc.currentStatus}</p>
                    </div>
                  ))}
              </div>
            </MangaPanel>
          )}

          {/* ending.md.txt: 近期事件 */}
          {player.storyMemory.recentEvents.length > 0 && (
            <MangaPanel className="!p-3">
              <h3 className="font-bold mb-2 manga-title text-sm">近期事件</h3>
              <div className="space-y-1">
                {player.storyMemory.recentEvents.slice(-3).map((e) => (
                  <div key={e.round + e.event.slice(0, 12)} className="text-[10px] text-gray-600 flex items-center gap-1">
                    <span className="text-gray-400">第{e.round}回合</span>
                    <span className="truncate">{e.event}</span>
                  </div>
                ))}
              </div>
            </MangaPanel>
          )}

          {/* ending.md.txt: 命运预感（结局线索） */}
          {player.endingProgress.targetEndingId && (
            <MangaPanel className="!p-3" style={{ borderColor: '#8e44ad' }}>
              <h3 className="font-bold text-sm" style={{ color: '#8e44ad' }}>命运预感</h3>
              <p className="text-xs text-gray-600 mt-1 italic">
                {getEndingHint(player.endingProgress.targetEndingId, player.progress.round)}
              </p>
            </MangaPanel>
          )}
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

                </div>
                {importError && (
                  <p className="text-sm mt-2" style={{ color: '#c0392b' }}>{importError}</p>
                )}


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

            {/* 事件信息已整合到 sceneText 中，不再单独显示事件框 */}

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

            {/* Choices */}
            {!showResult && (
              <>
                <div className="space-y-2">
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
              等级: {player.system.level} / {systemDef?.maxLevel || 10} · 签到第{systemHistoryRef.current.checkInStreak}天
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

      {/* 系统提示弹窗 —— 网文沉浸式通知 */}
      <AnimatePresence>
        {showSystemMsg && systemMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-[380px] max-w-[92vw]"
          >
            {/* 扫描线 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
              <motion.div
                className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            {/* 通知体 */}
            <div className="relative rounded-lg overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(10,20,40,0.97), rgba(15,30,60,0.97))',
                border: '1px solid rgba(0,200,255,0.3)',
                boxShadow: '0 0 30px rgba(0,150,255,0.2), inset 0 0 30px rgba(0,100,200,0.05)',
              }}
            >
              {/* 顶栏 */}
              <div className="flex items-center gap-2 px-4 py-2.5"
                style={{
                  background: 'linear-gradient(90deg, rgba(0,150,255,0.15), transparent)',
                  borderBottom: '1px solid rgba(0,200,255,0.15)',
                }}
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: '#0cf' }} />
                </motion.div>
                <span className="text-xs font-bold tracking-widest" style={{ color: '#0cf' }}>
                  系统通知
                </span>
                <span className="ml-auto text-[10px] opacity-50" style={{ color: '#0cf' }}>
                  SYSTEM
                </span>
              </div>

              {/* 内容 */}
              <div className="px-4 py-3">
                <p className="text-sm leading-relaxed" style={{ color: '#d0e8ff', textShadow: '0 0 10px rgba(0,150,255,0.2)' }}>
                  {systemMessage}
                </p>
              </div>

              {/* 底部闪烁条 */}
              <div className="h-px mx-4 mb-2" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.4), transparent)' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SystemDialogue />
      <NarrativeEvent />
      <DemoOverlay />

      <TalentSelect
        talents={talentCandidates}
        onSelect={handleTalentSelect}
        visible={showTalentSelect}
      />

      {/* 系统紧急支援弹窗 */}
      {showSysIntervention && sysIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border-2 border-yellow-500/50 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
          >
            <div className="text-center mb-4">
              <div className="text-yellow-400 text-2xl font-bold mb-1">⚡系统紧急支援⚡</div>
              <div className="text-gray-300 text-sm">{sysIntervention.description}</div>
            </div>
            <div className="space-y-2">
              {sysIntervention.choices.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => handleSysIntervention(c.id)}
                  disabled={isProcessing}
                  className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500/50 rounded-lg p-3 transition-colors"
                >
                  <div className="text-white font-medium">{c.text}</div>
                  <div className="text-gray-400 text-xs mt-1">{c.consequence}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      <MerchantShop
        visible={showMerchantShop}
        player={player}
        onBuy={handleMerchantBuy}
        onClose={() => setShowMerchantShop(false)}
      />

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
