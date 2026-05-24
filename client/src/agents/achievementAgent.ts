import type { Player, Achievement } from '../types';
import { ACHIEVEMENTS, checkAchievement } from '../data/achievements';
import { getVisitedScenes } from '../utils/storage';

export interface AchievementCheckResult {
  newAchievements: Achievement[];
  messages: string[];
}

export const checkAllAchievements = (
  player: Player,
  globalAchievements: string[]
): AchievementCheckResult => {
  const newAchievements: Achievement[] = [];
  const messages: string[] = [];

  const allUnlocked = new Set([...player.achievements, ...globalAchievements]);

  for (const achievement of ACHIEVEMENTS) {
    if (allUnlocked.has(achievement.id)) continue;

    let achieved = false;

    // 特殊成就需要自定义检查
    if (achievement.condition.type === 'custom') {
      achieved = checkCustomAchievement(achievement, player, globalAchievements);
    } else {
      achieved = checkAchievement(achievement, player);
    }

    if (achieved) {
      newAchievements.push(achievement);
      messages.push(`🏆 解锁成就：${achievement.name} - ${achievement.description}`);
    }
  }

  return { newAchievements, messages };
};

const checkCustomAchievement = (
  achievement: Achievement,
  player: Player,
  globalAchievements: string[]
): boolean => {
  switch (achievement.id) {
    case 'ach_all_scenes': {
      const visited = getVisitedScenes();
      const baseScenes = ['modern_city', 'cultivation', 'urban_fantasy', 'apocalypse', 'apoc_fantasy'];
      return baseScenes.every((s) => visited.includes(s));
    }
    case 'ach_immortal_path': {
      return (
        player.progress.sceneType === 'cultivation' &&
        player.stats.level >= 50
      );
    }
    case 'ach_cyber_pioneer': {
      return (
        player.progress.sceneType === 'modern_city' &&
        player.stats.wealth >= 500000 &&
        player.attributes.intelligence >= 15
      );
    }
    case 'ach_demon_heart': {
      return player.history.filter((h) => h.description.includes('黑暗') || h.description.includes('邪恶')).length >= 10;
    }
    case 'ach_devourer': {
      return (
        player.progress.sceneType === 'apocalypse' &&
        player.history.filter((h) => h.description.includes('吞噬')).length >= 100
      );
    }
    case 'ach_time_lord': {
      return (
        player.progress.age >= 100 &&
        globalAchievements.filter((id) => id.startsWith('ach_reach_level_50')).length >= 3
      );
    }
    case 'ach_perfect_start': {
      return Object.values(player.attributes).every((v) => v >= 3);
    }
    default:
      return false;
  }
};

export const applyAchievementRewards = (
  achievement: Achievement,
  player: Player
): Player => {
  const reward = achievement.reward;
  const updated = { ...player };

  if (reward.attributeBonus) {
    updated.attributes = { ...updated.attributes };
    for (const [key, value] of Object.entries(reward.attributeBonus)) {
      (updated.attributes as unknown as Record<string, number>)[key] += value;
    }
  }

  if (reward.wealth) {
    updated.stats = { ...updated.stats, wealth: updated.stats.wealth + reward.wealth };
  }

  if (reward.title) {
    updated.progress = { ...updated.progress };
    // title can be stored in storyFlags
    updated.progress.storyFlags = [...updated.progress.storyFlags, `title_${reward.title}`];
  }

  return updated;
};
