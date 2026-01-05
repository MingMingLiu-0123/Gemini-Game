
import { GooseType, LevelConfig } from './types';

export type ExtendedGooseType = GooseType & { points: number; isGoose: boolean; gradient: string };

export const GOOSE_TYPES: ExtendedGooseType[] = [
  { id: 'white', emoji: '🪿', label: '大白鹅', color: 'text-white', rarity: 'common', points: 500, isGoose: true, gradient: 'from-blue-100 to-blue-300' },
  { id: 'golden', emoji: '👑', label: '至尊金鹅', color: 'text-yellow-100', rarity: 'legendary', points: 2000, isGoose: true, gradient: 'from-yellow-300 via-orange-400 to-yellow-600' },
  { id: 'swan', emoji: '🦢', label: '黑嘴天鹅', color: 'text-slate-100', rarity: 'rare', points: 800, isGoose: true, gradient: 'from-slate-200 to-indigo-300' },
  { id: 'penguin', emoji: '🐧', label: '极地企鹅', color: 'text-white', rarity: 'rare', points: 600, isGoose: true, gradient: 'from-blue-400 to-blue-800' },
  { id: 'duck', emoji: '🦆', label: '小野鸭', color: 'text-green-100', rarity: 'common', points: 100, isGoose: false, gradient: 'from-green-200 to-emerald-500' },
  { id: 'chick', emoji: '🐥', label: '萌萌哒小鸡', color: 'text-yellow-100', rarity: 'common', points: 50, isGoose: false, gradient: 'from-yellow-100 to-amber-400' },
  { id: 'chicken', emoji: '🐓', label: '战斗大公鸡', color: 'text-red-100', rarity: 'common', points: 150, isGoose: false, gradient: 'from-red-300 to-rose-600' },
  { id: 'dove', emoji: '🕊️', label: '和平鸽', color: 'text-slate-100', rarity: 'rare', points: 200, isGoose: false, gradient: 'from-slate-100 to-blue-200' },
  { id: 'owl', emoji: '🦉', label: '智慧猫头鹰', color: 'text-amber-100', rarity: 'rare', points: 250, isGoose: false, gradient: 'from-amber-200 to-brown-600' },
  { id: 'turkey', emoji: '🦃', label: '火爆火鸡', color: 'text-orange-100', rarity: 'common', points: 120, isGoose: false, gradient: 'from-orange-200 to-red-500' },
  { id: 'parrot', emoji: '🦜', label: '话痨鹦鹉', color: 'text-green-100', rarity: 'rare', points: 300, isGoose: false, gradient: 'from-green-300 via-yellow-300 to-red-400' },
  { id: 'flamingo', emoji: '🦩', label: '火烈鸟', color: 'text-pink-100', rarity: 'rare', points: 400, isGoose: false, gradient: 'from-pink-200 to-rose-400' },
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

export const ITEM_SIZE = 82; // 显著增大动物尺寸
export const BOARD_WIDTH = 360; // 略微加宽
export const BOARD_HEIGHT = 580; // 略微加高以适应大尺寸
