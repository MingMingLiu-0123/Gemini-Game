
import { GooseType, LevelConfig } from './types';

export type ExtendedGooseType = GooseType & { points: number; isGoose: boolean };

export const GOOSE_TYPES: ExtendedGooseType[] = [
  { id: 'white', emoji: '🪿', label: '大白鹅', color: 'text-white', rarity: 'common', points: 500, isGoose: true },
  { id: 'golden', emoji: '👑', label: '至尊金鹅', color: 'text-yellow-400', rarity: 'legendary', points: 2000, isGoose: true },
  { id: 'swan', emoji: '🦢', label: '黑嘴天鹅', color: 'text-slate-100', rarity: 'rare', points: 800, isGoose: true },
  { id: 'penguin', emoji: '🐧', label: '极地企鹅', color: 'text-gray-200', rarity: 'rare', points: 600, isGoose: true },
  { id: 'duck', emoji: '🦆', label: '小野鸭', color: 'text-green-600', rarity: 'common', points: 100, isGoose: false },
  { id: 'chick', emoji: '🐥', label: '萌萌哒小鸡', color: 'text-yellow-300', rarity: 'common', points: 50, isGoose: false },
  { id: 'chicken', emoji: '🐓', label: '战斗大公鸡', color: 'text-red-500', rarity: 'common', points: 150, isGoose: false },
  { id: 'dove', emoji: '🕊️', label: '和平鸽', color: 'text-slate-300', rarity: 'rare', points: 200, isGoose: false },
  { id: 'owl', emoji: '🦉', label: '智慧猫头鹰', color: 'text-amber-700', rarity: 'rare', points: 250, isGoose: false },
  { id: 'turkey', emoji: '🦃', label: '火爆火鸡', color: 'text-orange-600', rarity: 'common', points: 120, isGoose: false },
  { id: 'parrot', emoji: '🦜', label: '话痨鹦鹉', color: 'text-green-400', rarity: 'rare', points: 300, isGoose: false },
  { id: 'flamingo', emoji: '🦩', label: '火烈鸟', color: 'text-pink-400', rarity: 'rare', points: 400, isGoose: false },
];

export const TRAY_SIZE = 7;

export interface ExtendedLevelConfig extends LevelConfig {
  bgGradient: string;
  patternEmoji: string;
}

export const LEVELS: ExtendedLevelConfig[] = [
  { 
    name: '农场早晨', 
    uniqueTypes: 4, 
    totalSets: 5, 
    layers: 2,
    bgGradient: 'from-[#fdfbfb] to-[#ebedee]',
    patternEmoji: '🌾'
  },
  { 
    name: '百鸟争鸣', 
    uniqueTypes: 7, 
    totalSets: 12, 
    layers: 4,
    bgGradient: 'from-[#e0f2f1] to-[#b2dfdb]',
    patternEmoji: '🌳'
  },
  { 
    name: '疯狂鹅群', 
    uniqueTypes: 10, 
    totalSets: 22, 
    layers: 7,
    bgGradient: 'from-[#fff1eb] to-[#ace0f9]',
    patternEmoji: '🚜'
  },
  { 
    name: '鹅王禁地', 
    uniqueTypes: 12, 
    totalSets: 35, 
    layers: 10,
    bgGradient: 'from-[#c1dfc4] to-[#deecdd]',
    patternEmoji: '🏰'
  },
];

export const ITEM_SIZE = 64;
export const BOARD_WIDTH = 340;
export const BOARD_HEIGHT = 520;
