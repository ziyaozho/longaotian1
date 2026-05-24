export interface SystemUpgrade {
  level: number;
  name: string;
  description: string;
  unlockedFeatures: string[];
  bonuses: Record<string, number>;
}

export interface SystemDefinition {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'hidden';
  unlockRequirement?: string;
  upgrades: SystemUpgrade[];
  personality: string;
  catchphrase: string;
  maxLevel: number;
}

export interface AchievementReward {
  unlockScene?: string;
  unlockSystem?: string;
  attributeBonus?: Partial<import('./game').Attributes>;
  title?: string;
  wealth?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'progress' | 'combat' | 'social' | 'secret' | 'system' | 'explore';
  hidden: boolean;
  condition: AchievementCondition;
  reward: AchievementReward;
  icon: string;
}

export type AchievementCondition =
  | { type: 'reach_level'; level: number }
  | { type: 'complete_tasks'; count: number }
  | { type: 'survive_rounds'; rounds: number }
  | { type: 'attribute_threshold'; attribute: string; value: number }
  | { type: 'specific_choice'; scene: string; choice: string }
  | { type: 'combo'; achievements: string[] }
  | { type: 'reach_age'; age: number }
  | { type: 'obtain_wealth'; amount: number }
  | { type: 'combat_power'; value: number }
  | { type: 'system_level'; level: number }
  | { type: 'custom'; description: string };
