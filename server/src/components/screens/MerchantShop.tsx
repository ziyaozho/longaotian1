import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player, Item } from '../../types';
import type { MerchantItem } from '../../data/artifacts';
import { MERCHANT_ITEMS } from '../../data/artifacts';
import { MangaPanel, Onomatopoeia } from '../manga';
import { X, ShoppingBag, Sparkles, Sword, Shield, FlaskConical, Map, Star } from 'lucide-react';

interface MerchantShopProps {
  visible: boolean;
  player: Player;
  onBuy: (item: MerchantItem) => void;
  onClose: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#7f8c8d',
  rare: '#2980b9',
  epic: '#8e44ad',
  legendary: '#d4a017',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  consumable: <FlaskConical className="w-4 h-4" />,
  equipment: <Sword className="w-4 h-4" />,
  intel: <Map className="w-4 h-4" />,
  artifact: <Star className="w-4 h-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  consumable: '消耗品',
  equipment: '装备',
  intel: '情报',
  artifact: '奇物',
};

/** 基于玩家等级和运气筛选并定价 */
function getShopItems(player: Player): MerchantItem[] {
  const shuffled = [...MERCHANT_ITEMS].sort(() => Math.random() - 0.5);

  // 稀有度概率：基础 + 运气加成 + 等级加成
  const luckBonus = player.attributes.luck * 0.03;
  const levelBonus = Math.floor(player.stats.level / 10) * 0.05;
  const legendaryChance = 0.05 + luckBonus + levelBonus;
  const epicChance = 0.15 + luckBonus;
  const rareChance = 0.3;

  return shuffled.filter((item) => {
    const roll = Math.random();
    if (item.rarity === 'legendary') return roll < legendaryChance;
    if (item.rarity === 'epic') return roll < epicChance;
    if (item.rarity === 'rare') return roll < rareChance;
    return true; // common always available
  }).slice(0, 6);
}

export default function MerchantShop({ visible, player, onBuy, onClose }: MerchantShopProps) {
  const [selectedItem, setSelectedItem] = useState<MerchantItem | null>(null);
  const [bargaining, setBargaining] = useState(false);
  const [items] = useState(() => getShopItems(player));

  const handleBuy = (item: MerchantItem) => {
    if (player.stats.wealth >= item.price) {
      onBuy(item);
      setSelectedItem(null);
      setBargaining(false);
    }
  };

  const handleBargain = (item: MerchantItem) => {
    setBargaining(true);
    // 魅力检定：appearance >= 6 → 8折
    if (player.attributes.appearance >= 6) {
      const discount = Math.floor(item.price * 0.8);
      const discountedItem = { ...item, price: discount };
      setSelectedItem(discountedItem);
    } else {
      setSelectedItem({ ...item, price: Math.floor(item.price * 1.1) }); // 加价10%
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
            className="w-full max-w-xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <MangaPanel className="!p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" style={{ color: '#d4a017' }} />
                  <h2 className="text-lg font-bold manga-title">神秘商人</h2>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-sm font-bold" style={{ color: '#d4a017' }}>
                    ¥{player.stats.wealth}
                  </span>
                  <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Items grid */}
              <div className="grid grid-cols-2 gap-2 mb-4 max-h-60 overflow-y-auto">
                {items.map((item) => {
                  const canAfford = player.stats.wealth >= item.price;
                  const isSelected = selectedItem === item;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`ink-border p-2.5 cursor-pointer transition-all ${
                        isSelected ? 'ring-2' : ''
                      }`}
                      style={{
                        borderColor: isSelected ? '#d4a017' : undefined,
                        opacity: canAfford || bargaining ? 1 : 0.5,
                      }}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {TYPE_ICONS[item.type]}
                        <span className="text-xs font-bold">{item.name}</span>
                        <span
                          className="text-[10px] px-1 rounded text-white ml-auto"
                          style={{ backgroundColor: RARITY_COLORS[item.rarity] }}
                        >
                          {item.rarity === 'legendary' ? '传说' : item.rarity === 'epic' ? '史诗' : item.rarity === 'rare' ? '稀有' : '普通'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mb-1.5">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: canAfford ? '#d4a017' : '#c0392b' }}>
                          ¥{item.price}
                        </span>
                        <span className="text-[10px] text-gray-400">{TYPE_LABELS[item.type]}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => selectedItem && handleBuy(selectedItem)}
                  disabled={!selectedItem || player.stats.gold < (selectedItem?.price || Infinity)}
                  className="manga-btn flex items-center gap-1.5 text-sm px-4 flex-1 disabled:opacity-30"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {selectedItem ? `购买「${selectedItem.name}」` : '选择一件商品'}
                </button>
                <button
                  onClick={() => selectedItem && handleBargain(selectedItem)}
                  disabled={!selectedItem || bargaining}
                  className="manga-btn-outline flex items-center gap-1 text-sm px-3 disabled:opacity-30"
                >
                  讨价还价
                </button>
              </div>

              {bargaining && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs mt-2 text-center"
                  style={{ color: player.attributes.appearance >= 6 ? '#27ae60' : '#c0392b' }}
                >
                  {player.attributes.appearance >= 6
                    ? `魅力检定成功！商人给了你8折优惠！`
                    : `魅力检定失败...商人冷笑："就你也想砍价？加价10%！"`}
                </motion.p>
              )}
            </MangaPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
