
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GOOSE_TYPES, TRAY_SIZE, LEVELS, ITEM_SIZE, BOARD_WIDTH, BOARD_HEIGHT } from './constants';
import { GameItem, GameState } from './types';

// 增强版音频引擎，适配移动端
class SimpleMusic {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async start() {
    await this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playLoop();
  }

  private async playLoop() {
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
    let i = 0;
    while (this.isPlaying && this.ctx) {
      try {
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[i % notes.length], this.ctx.currentTime);
        g.gain.setValueAtTime(0.03, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
        i++;
        await new Promise(r => setTimeout(r, 600));
      } catch (e) { break; }
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

const musicPlayer = new SimpleMusic();

const FloatingScore: React.FC<{ score: number; x: number; y: number; onComplete: () => void }> = ({ score, x, y, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="absolute pointer-events-none font-black text-2xl text-yellow-500 animate-bounce"
      style={{ left: x, top: y, zIndex: 1000, textShadow: '2px 2px 0 #000' }}
    >
      +{score}
    </div>
  );
};

const GooseCard: React.FC<{
  item: GameItem;
  onClick: (item: GameItem) => void;
  isTray?: boolean;
}> = ({ item, onClick, isTray }) => {
  const gooseType = GOOSE_TYPES.find(t => t.id === item.type);
  const [isWiggling, setIsWiggling] = useState(false);
  const [isHonking, setIsHonking] = useState(false);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    // 防止移动端双击缩放或其他默认行为
    if (e.cancelable) e.preventDefault();
    
    if (item.isCovered || item.status !== 'board') {
      setIsWiggling(true);
      setTimeout(() => setIsWiggling(false), 500);
      return;
    }
    
    if (gooseType?.isGoose) {
      setIsHonking(true);
      setTimeout(() => setIsHonking(false), 800);
    }
    onClick(item);
  };

  const getShaped3DStyle = (): React.CSSProperties => {
    if (item.isCovered) {
      return {
        filter: 'brightness(0.2) grayscale(0.8) opacity(0.5)',
        transform: `translateY(8px) scale(0.9)`,
        transition: 'all 0.4s ease'
      };
    }

    const depth = 6;
    let shadowStr = '';
    for (let i = 1; i <= depth; i++) {
      shadowStr += `0px ${i}px 0px rgba(0,0,0,0.15)${i === depth ? '' : ','}`;
    }

    return {
      textShadow: shadowStr,
      transform: isTray 
        ? 'scale(0.8)' 
        : `translateY(-6px) rotateZ(${item.id % 2 === 0 ? '4deg' : '-4deg'})`,
      filter: 'drop-shadow(0 10px 8px rgba(0,0,0,0.2))',
      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    };
  };

  return (
    <div
      onClick={handleClick}
      onTouchEnd={handleClick}
      className={`absolute flex items-center justify-center transition-all touch-none
        ${isWiggling ? 'animate-pulse scale-110' : ''}
        ${isHonking ? 'scale-150 -rotate-12' : ''}`}
      style={{
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        left: isTray ? 'auto' : item.x,
        top: isTray ? 'auto' : item.y,
        zIndex: isTray ? 100 : item.z * 10,
        position: isTray ? 'relative' : 'absolute',
        ...getShaped3DStyle()
      }}
    >
      {isHonking && (
        <div className="absolute -top-16 bg-white border-4 border-black px-4 py-1.5 rounded-3xl shadow-2xl z-[300] animate-bounce">
          <span className="text-base font-black text-red-600 italic whitespace-nowrap">嘎!!</span>
        </div>
      )}

      <span className={`select-none text-6xl cursor-pointer ${gooseType?.color}`}>
        {gooseType?.emoji}
      </span>
      
      {gooseType?.isGoose && !item.isCovered && !isTray && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-[10px] font-black px-1.5 py-0.5 rounded-lg text-white shadow-lg border-2 border-white animate-bounce-subtle z-50">
          BOSS
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [levelIdx, setLevelIdx] = useState(0);
  const [gameState, setGameState] = useState<GameState>('start');
  const [items, setItems] = useState<GameItem[]>([]);
  const [tray, setTray] = useState<GameItem[]>([]);
  const [holdingArea, setHoldingArea] = useState<GameItem[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [boosters, setBoosters] = useState({ undo: 3, shuffle: 3, clear: 2 });
  const [floatingScores, setFloatingScores] = useState<{ id: number; val: number; x: number; y: number }[]>([]);
  const [musicEnabled, setMusicEnabled] = useState(false);
  
  const comboTimeout = useRef<number | null>(null);
  const currentLevel = LEVELS[Math.min(levelIdx, LEVELS.length - 1)];

  const initLevel = useCallback((idx: number) => {
    const config = LEVELS[Math.min(idx, LEVELS.length - 1)];
    const typesToUse = GOOSE_TYPES.slice(0, config.uniqueTypes);
    let generated: GameItem[] = [];
    let idCounter = 0;
    
    // 适配小屏幕：动态计算高度
    const viewHeight = window.innerHeight;
    const SAFE_BOARD_HEIGHT = Math.min(BOARD_HEIGHT, viewHeight - 280); 

    for (let i = 0; i < config.totalSets; i++) {
      const type = typesToUse[Math.floor(Math.random() * typesToUse.length)];
      for (let j = 0; j < 3; j++) {
        const layer = Math.floor(Math.random() * config.layers);
        const gridX = Math.floor(Math.random() * 5);
        const gridY = Math.floor(Math.random() * 6); 
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 60;
        
        generated.push({
          id: idCounter++,
          type: type.id,
          x: Math.max(10, Math.min(BOARD_WIDTH - ITEM_SIZE - 10, gridX * 60 + 20 + offsetX)),
          y: Math.max(10, Math.min(SAFE_BOARD_HEIGHT - ITEM_SIZE, gridY * 60 + 10 + offsetY)),
          z: layer,
          status: 'board',
          isCovered: false
        });
      }
    }

    const checkCoverage = (all: GameItem[]) => {
      return all.map(item => {
        if (item.status !== 'board') return { ...item, isCovered: false };
        return {
          ...item,
          isCovered: all.some(other => 
            other.status === 'board' && 
            other.z > item.z && 
            Math.abs(other.x - item.x) < ITEM_SIZE * 0.5 && 
            Math.abs(other.y - item.y) < ITEM_SIZE * 0.5
          )
        };
      });
    };

    setItems(checkCoverage(generated));
    setTray([]);
    setHoldingArea([]);
    setGameState('playing');
    setScore(0);
    setCombo(0);
  }, []);

  const handleItemClick = (clickedItem: GameItem) => {
    if (gameState !== 'playing' || tray.length >= TRAY_SIZE) return;
    const newTray = [...tray, { ...clickedItem, status: 'tray' as const }];
    const newItems = items.map(item => 
      item.id === clickedItem.id ? { ...item, status: 'tray' as const } : item
    );
    const updateCoverage = (all: GameItem[]) => {
      return all.map(item => {
        if (item.status !== 'board') return { ...item, isCovered: false };
        return {
          ...item,
          isCovered: all.some(other => 
            other.status === 'board' && 
            other.z > item.z && 
            Math.abs(other.x - item.x) < ITEM_SIZE * 0.5 && 
            Math.abs(other.y - item.y) < ITEM_SIZE * 0.5
          )
        };
      });
    };
    setItems(updateCoverage(newItems));
    setTray(newTray);
    setCombo(c => c + 1);
    if (comboTimeout.current) clearTimeout(comboTimeout.current);
    comboTimeout.current = window.setTimeout(() => setCombo(0), 1200);
  };

  useEffect(() => {
    if (tray.length === 0) return;
    const counts: Record<string, number> = {};
    tray.forEach(i => counts[i.type] = (counts[i.type] || 0) + 1);
    const match = Object.keys(counts).find(t => counts[t] >= 3);
    if (match) {
      setTimeout(() => {
        const matchingType = GOOSE_TYPES.find(gt => gt.id === match);
        const basePoints = matchingType?.points || 100;
        const totalGain = basePoints + (combo * 150);
        setFloatingScores(prev => [...prev, { id: Date.now(), val: totalGain, x: BOARD_WIDTH/2 - 20, y: BOARD_HEIGHT/2 }]);
        setTray(prev => {
          let count = 0;
          const filtered = [];
          for(const item of prev) {
            if (item.type === match && count < 3) count++;
            else filtered.push(item);
          }
          return filtered;
        });
        setItems(prev => prev.map(i => i.type === match && i.status === 'tray' ? { ...i, status: 'cleared' as const } : i));
        setScore(s => s + totalGain);
      }, 300);
    } else if (tray.length === TRAY_SIZE) {
      setGameState('lost');
    }
  }, [tray, combo]);

  const toggleMusic = async () => {
    if (musicEnabled) musicPlayer.stop();
    else await musicPlayer.start();
    setMusicEnabled(!musicEnabled);
  };

  const useShuffle = () => {
    if (boosters.shuffle <= 0) return;
    setItems(prev => {
      const boardItems = prev.filter(i => i.status === 'board');
      const types = boardItems.map(i => i.type).sort(() => Math.random() - 0.5);
      let typeIdx = 0;
      return prev.map(item => item.status === 'board' ? { ...item, type: types[typeIdx++] } : item);
    });
    setBoosters(b => ({ ...b, shuffle: b.shuffle - 1 }));
  };

  const useUndo = () => {
    if (boosters.undo <= 0 || tray.length === 0) return;
    const last = tray[tray.length - 1];
    setTray(prev => prev.slice(0, -1));
    setItems(prev => {
      const updated = prev.map(i => i.id === last.id ? { ...i, status: 'board' as const } : i);
      return updated.map(item => {
        if (item.status !== 'board') return { ...item, isCovered: false };
        return {
          ...item,
          isCovered: updated.some(other => 
            other.status === 'board' && 
            other.z > item.z && 
            Math.abs(other.x - item.x) < ITEM_SIZE * 0.45 && 
            Math.abs(other.y - item.y) < ITEM_SIZE * 0.45
          )
        };
      });
    });
    setBoosters(b => ({ ...b, undo: b.undo - 1 }));
  };

  const useClear = () => {
    if (boosters.clear <= 0 || tray.length < 3) return;
    const toHold = tray.slice(0, 3);
    setTray(prev => prev.slice(3));
    setHoldingArea(prev => [...prev, ...toHold.map(i => ({ ...i, status: 'holding' as const }))]);
    setBoosters(b => ({ ...b, clear: b.clear - 1 }));
  };

  useEffect(() => {
    if (gameState === 'playing' && items.length > 0 && items.every(i => i.status === 'cleared' || i.status === 'holding')) {
      setGameState('won');
    }
  }, [items, gameState]);

  return (
    <div className={`flex flex-col h-screen w-full max-w-md mx-auto bg-gradient-to-b ${currentLevel.bgGradient} transition-all duration-1000 overflow-hidden`}>
      
      {/* HUD Header */}
      <div className="px-4 py-3 pt-[calc(0.75rem+var(--sat))] flex justify-between items-center bg-white/70 backdrop-blur-xl z-[100] border-b border-white shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-600 uppercase mb-0.5">{currentLevel.name}</span>
          <span className="text-3xl font-black text-slate-900 drop-shadow-sm">{score}</span>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={toggleMusic} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl border border-slate-100 active-press">
             {musicEnabled ? '🎵' : '🔇'}
           </button>
           <div className="flex flex-col items-end">
              <div className="bg-slate-900 text-white px-3 py-1 rounded-xl text-xs font-black shadow-md">LV {levelIdx + 1}</div>
              {combo > 1 && <div className="text-orange-600 font-black italic text-[10px] mt-1">x{combo} 🔥</div>}
           </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative flex-1 w-full overflow-hidden pt-4 px-2">
        <div className="relative h-full mx-auto" style={{ width: BOARD_WIDTH }}>
          {items.filter(i => i.status === 'board').map(item => (
            <GooseCard key={item.id} item={item} onClick={handleItemClick} />
          ))}
          {floatingScores.map(fs => (
            <FloatingScore key={fs.id} score={fs.val} x={fs.x} y={fs.y} onComplete={() => setFloatingScores(prev => prev.filter(f => f.id !== fs.id))} />
          ))}
        </div>

        {/* Modal Overlay */}
        {gameState !== 'playing' && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center w-full max-w-[280px] animate-in zoom-in-95 duration-300">
              <div className="text-8xl mb-6">{gameState === 'won' ? '🥇' : (gameState === 'lost' ? '😵' : '🪿')}</div>
              <h2 className="text-3xl font-black mb-2 text-slate-900">
                {gameState === 'won' ? '鹅中之神!' : (gameState === 'lost' ? '槽位爆满!' : '抓大鹅大师')}
              </h2>
              <p className="text-slate-500 mb-8 text-sm font-bold">
                {gameState === 'won' ? '你征服了所有的大鹅！' : '糟了，托盘装不下啦。'}
              </p>
              <button 
                onClick={async () => {
                  await musicPlayer.init(); // 触发手机端音频解锁
                  if (gameState === 'won') {
                    setLevelIdx(v => v + 1);
                    initLevel(levelIdx + 1);
                  } else {
                    initLevel(levelIdx);
                  }
                }}
                className="w-full py-4 bg-slate-900 text-white font-black text-2xl rounded-[2rem] shadow-xl active:translate-y-1 transition-all"
              >
                {gameState === 'start' ? '立刻出发' : '重战江湖'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom UI */}
      <div className="bg-white/90 backdrop-blur-3xl px-6 pt-4 pb-[calc(1rem+var(--sab))] rounded-t-[3rem] shadow-[0_-15px_40px_rgba(0,0,0,0.1)] z-[150]">
        <div className="flex justify-around mb-6 px-4 gap-2">
          <BoosterBtn icon="🔙" label="撤销" count={boosters.undo} onClick={useUndo} color="from-blue-500 to-blue-700" />
          <BoosterBtn icon="🔀" label="洗牌" count={boosters.shuffle} onClick={useShuffle} color="from-purple-500 to-purple-700" />
          <BoosterBtn icon="🧺" label="移出" count={boosters.clear} onClick={useClear} color="from-orange-500 to-orange-700" />
        </div>

        <div className="relative bg-slate-100 p-2.5 rounded-[2.5rem] border-b-4 border-slate-300 shadow-inner flex gap-1 justify-center items-center min-h-[64px]">
          {Array.from({ length: TRAY_SIZE }).map((_, i) => (
            <div key={i} className="flex-1 max-w-[42px] aspect-square bg-white/70 rounded-xl border border-dashed border-slate-300 flex items-center justify-center relative shadow-sm overflow-hidden">
              {tray[i] && (
                <div className="transform scale-[0.7] animate-in zoom-in slide-in-from-top-4 duration-300">
                   <GooseCard item={tray[i]} onClick={() => {}} isTray />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BoosterBtn: React.FC<{ icon: string; label: string; count: number; onClick: () => void; color: string }> = ({ icon, label, count, onClick, color }) => (
  <button 
    onClick={onClick} 
    disabled={count <= 0}
    className="group flex flex-col items-center gap-1 disabled:opacity-20 transition-all active-press"
  >
    <div className={`w-11 h-11 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-xl shadow-lg text-white`}>
      {icon}
    </div>
    <span className="text-[10px] font-black text-slate-500">{label}({count})</span>
  </button>
);

export default App;
