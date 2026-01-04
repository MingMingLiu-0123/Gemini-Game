
export type GooseType = {
  id: string;
  emoji: string;
  label: string;
  color: string;
  rarity: 'common' | 'rare' | 'legendary';
};

export type GameItem = {
  id: number;
  type: string;
  x: number;
  y: number;
  z: number;
  status: 'board' | 'tray' | 'cleared' | 'holding';
  isCovered: boolean;
  isSpecial?: boolean;
};

export type GameState = 'start' | 'playing' | 'won' | 'lost' | 'paused';

export interface LevelConfig {
  uniqueTypes: number;
  totalSets: number;
  layers: number;
  name: string;
}
