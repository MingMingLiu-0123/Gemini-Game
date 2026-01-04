
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GOOSE_TYPES, TRAY_SIZE, LEVELS, ITEM_SIZE, BOARD_WIDTH, BOARD_HEIGHT } from './constants';
import { GameItem, GameState } from './types';

// Simple Audio Engine for Background Music
class SimpleMusic {
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;

  async start() {
    if (this.isPlaying) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
    this.gainNode.gain.setValueAtTime(0.05, this.ctx.currentTime);
    this.isPlaying = true;
    this.playLoop();
  }

  private async playLoop() {
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00]; // C4 to A4
    let i = 0;
    while (this.isPlaying && this.ctx) {
      try {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[i % notes.length], this.ctx.currentTime);
        g.gain.setValueAtTime(0.05, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
        
        osc.connect(g);
        g.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
        
        i++;
        await new Promise(r => setTimeout(r, 600));
      } catch (e) {
        break;
      }
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.ctx) {
      this.ctx.close();
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
      style={{ left: x, top: y, zIndex: 1000, textShadow: '3px 3px 0 #000' }}
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

  const handleClick = () => {
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
        filter: 'brightness(0.2) grayscale(0.8) opacity(0.6)',
        transform: `translateY(8px) scale(0.9) rotateX(20deg)`,
        transition: 'all 0.6s ease'
      };
    }

    const depth = 8;
    let shadowStr = '';
    for (let i = 1; i <= depth; i++) {
      shadowStr += `0px ${i}px 0px rgba(0,0,0,0.18)${i === depth ? '' : ','}`;
    }

    return {
      textShadow: shadowStr,
      transform: isTray 
        ? 'scale(0.8)' 
        : `translateY(-8px) rotateZ(${item.id % 2 === 0 ? '4deg' : '-4deg'}) rotateX(10deg)`,
      filter: 'drop-shadow(0 18px 15px rgba(0,0,0,0.3))',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    };
  };

  return (
    <div
      onClick={handleClick}
      className={`absolute flex items-center justify-center transition-all
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
      {!item.isCovered && !isTray && (
        <div className="absolute w-14 h-6 bg-black/30 rounded-[100%] blur-2xl -bottom-6 translate-y-8" />
      )}

      {isHonking && (
        <div className="absolute -top-16 bg-white border-4 border-black px-4 py-1.5 rounded-3xl shadow-2xl z-[300] animate-bounce">
          <span className="text-base font-black text-red-600 uppercase italic whitespace-nowrap">
            {Math.random() > 0.5 ? '嘎嘎嘎!!' : 'HONK!'}
          </span>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-4 border-b-4 border-black rotate-45" />
        </div>
      )}

      <span className={`select-none text-6xl cursor-pointer active:scale-90 transform transition-all ${gooseType?.color}`}>
        {gooseType?.emoji}
      </span>
      
      {gooseType?.isGoose && !item.isCovered && !isTray && (
        <div className="absolute -top-4 -right-4 bg-gradient-to-br from-yellow-300 to-yellow-600 text-[11px] font-black px-2 py-0.5 rounded-xl text-white shadow-xl border-2 border-white animate-bounce-subtle z-50">
          BOSS
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [levelIdx, setLevelIdx] = useState(0);
  const [gameState, setGameState] = useState('start');
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
    const SAFE_BOARD_HEIGHT = BOARD_HEIGHT - 240; 

    for (let i = 0; i < config.totalSets; i++) {
      const type = typesToUse[Math.floor(Math.random() * typesToUse.length)];
      for (let j = 0; j < 3; j++) {
        const layer = Math.floor(Math.random() * config.layers);
        const gridX = Math.floor(Math.random() * 5);
        const gridY = Math.floor(Math.random() * 6); 
        const offsetX = (Math.random() - 0.5) * 65;
        const offsetY = (Math.random() - 0.5) * 65;
        
        generated.push({
          id: idCounter++,
          type: type.id,
          x: Math.max(20, Math.min(BOARD_WIDTH - ITEM_SIZE - 20, gridX * 60 + 25 + offsetX)),
          y: Math.max(20, Math.min(SAFE_BOARD_HEIGHT - ITEM_SIZE, gridY * 60 + 25 + offsetY)),
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
            Math.abs(other.x - item.x) < ITEM_SIZE * 0.45 && 
            Math.abs(other.y - item.y) < ITEM_SIZE * 0.45
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
            Math.abs(other.x - item.x) < ITEM_SIZE * 0.45 && 
            Math.abs(other.y - item.y) < ITEM_SIZE * 0.45
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
            if (item.type === match && count < 3) {
              count++;
            } else {
              filtered.push(item);
            }
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
    if (musicEnabled) {
      musicPlayer.stop();
    } else {
      await musicPlayer.start();
    }
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
    <div className={`flex flex-col h-screen w-full max-w-md mx-auto bg-gradient-to-b ${currentLevel.bgGradient} font-sans text-slate-800 overflow-hidden select-none transition-all duration-1000`}>
      
      {/* HUD Header */}
      <div className="px-4 py-3 flex justify-between items-center bg-white/60 backdrop-blur-xl z-[100] border-b border-white shadow-lg">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-600 tracking-wider uppercase mb-0.5 flex items-center gap-1">
            {currentLevel.patternEmoji} {currentLevel.name}
          </span>
          <span className="text-4xl font-black text-slate-900 tabular-nums leading-none drop-shadow-md">{score}</span>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={toggleMusic} className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-xl shadow-md active:scale-90 active:shadow-inner transition-all border border-slate-100">
             {musicEnabled ? '🎵' : '🔇'}
           </button>
           <div className="flex flex-col items-end">
              <div className="bg-slate-900 text-white px-4 py-1.5 rounded-2xl text-xs font-black shadow-xl border-b-4 border-black">
                LEVEL {levelIdx + 1}
              </div>
              {combo > 1 && (
                <div className="text-orange-600 font-black italic animate-bounce text-[10px] mt-1 bg-white/80 px-2 py-0.5 rounded-full shadow-sm">
                  连击 x{combo} 🔥
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Main Game Board Area */}
      <div className="relative flex-1 w-full overflow-hidden pt-4 px-2">
        {/* Procedural Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden grid grid-cols-4 gap-8 p-12">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className={`text-7xl flex items-center justify-center transition-transform duration-[2000ms] ${i % 3 === 0 ? 'rotate-45' : i % 2 === 0 ? '-rotate-12' : 'rotate-12'}`}>
              {currentLevel.patternEmoji}
            </div>
          ))}
        </div>

        <div className="relative h-full mx-auto" style={{ width: BOARD_WIDTH }}>
          {items.filter(i => i.status === 'board').map(item => (
            <GooseCard key={item.id} item={item} onClick={handleItemClick} />
          ))}
          
          {floatingScores.map(fs => (
            <FloatingScore 
              key={fs.id} 
              score={fs.val} 
              x={fs.x} 
              y={fs.y} 
              onComplete={() => setFloatingScores(prev => prev.filter(f => f.id !== fs.id))} 
            />
          ))}
        </div>

        {/* Fullscreen Overlays */}
        {gameState !== 'playing' && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-xl px-6 animate-in fade-in duration-500">
            <div className="bg-white p-10 rounded-[5rem] shadow-[0_25px_80px_rgba(0,0,0,0.5)] text-center w-full max-w-[320px] border-b-[18px] border-slate-200 animate-in zoom-in-75 duration-700">
              <div className="text-9xl mb-8 transform hover:rotate-12 hover:scale-110 transition-all duration-500 cursor-pointer">
                {gameState === 'won' ? '🥇' : (gameState === 'lost' ? '😵' : '🪿')}
              </div>
              <h2 className="text-4xl font-black mb-3 text-slate-900 leading-tight tracking-tight">
                {gameState === 'won' ? '鹅中之神!' : (gameState === 'lost' ? '农场沦陷!' : '抓大鹅大师')}
              </h2>
              <p className="text-slate-500 mb-10 text-base font-bold px-4 leading-relaxed">
                {gameState === 'won' ? '你以极高的智商征服了这片领地！大鹅们甘拜下风。' : '槽位已满！大鹅们在庆祝它们的胜利。别灰心，重来一把！'}
              </p>
              <button 
                onClick={() => {
                  if (gameState === 'won') {
                    setLevelIdx(v => v + 1);
                    initLevel(levelIdx + 1);
                  } else {
                    initLevel(levelIdx);
                  }
                  if (!musicEnabled) toggleMusic();
                }}
                className="w-full py-6 bg-slate-900 hover:bg-black text-white font-black text-3xl rounded-[2.5rem] shadow-[0_12px_0_#000] active:shadow-none active:translate-y-3 transition-all transform active:scale-95"
              >
                {gameState === 'start' ? '立刻出发' : (gameState === 'won' ? '下一关' : '再战一场')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COMPACT BOTTOM UI */}
      <div className="bg-white/90 backdrop-blur-3xl px-8 pt-4 pb-10 rounded-t-[4rem] shadow-[0_-25px_60px_rgba(0,0,0,0.15)] z-[150] border-t border-white/60">
        
        {/* Shrunk Booster Buttons - Smaller dimension and tighter spacing */}
        <div className="flex justify-around mb-6 px-4 gap-2">
          <BoosterBtn icon="🔙" label="撤销" count={boosters.undo} onClick={useUndo} color="from-blue-500 to-blue-700" shadow="shadow-blue-900/30" />
          <BoosterBtn icon="🔀" label="洗牌" count={boosters.shuffle} onClick={useShuffle} color="from-purple-500 to-purple-700" shadow="shadow-purple-900/30" />
          <BoosterBtn icon="🧺" label="移出" count={boosters.clear} onClick={useClear} color="from-orange-500 to-orange-700" shadow="shadow-orange-900/30" />
        </div>

        {/* High-End Tray Container */}
        <div className="relative bg-slate-200/50 p-3 rounded-[3rem] border-b-4 border-slate-300 shadow-inner flex gap-1.5 justify-center items-center min-h-[72px] border border-white/30">
          {Array.from({ length: TRAY_SIZE }).map((_, i) => (
            <div key={i} className="flex-1 max-w-[44px] aspect-square bg-white/70 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center relative shadow-sm transition-all overflow-hidden">
              {tray[i] && (
                <div className="transform scale-[0.75] animate-in zoom-in slide-in-from-top-6 duration-300">
                   <GooseCard item={tray[i]} onClick={() => {}} isTray />
                </div>
              )}
            </div>
          ))}
          {tray.length >= 6 && (
            <div className="absolute -top-4 right-10 bg-red-600 text-white text-[10px] px-3 py-1 rounded-full font-black animate-bounce shadow-2xl border-2 border-white z-[200]">
              小心爆满!
            </div>
          )}
        </div>

        {/* Fancy Vault Area */}
        {holdingArea.length > 0 && (
          <div className="mt-5 p-2.5 bg-white/50 rounded-[2rem] border border-white/80 flex gap-4 overflow-x-auto shadow-sm backdrop-blur-md no-scrollbar">
             {holdingArea.map(item => (
               <div key={item.id} onClick={() => handleItemClick(item)} className="relative w-10 h-10 shrink-0 flex items-center justify-center active:scale-95 transition-all bg-white/40 rounded-xl shadow-inner">
                  <div className="transform scale-[0.6]">
                    <GooseCard item={item} onClick={() => {}} isTray />
                  </div>
               </div>
             ))}
             <span className="text-[9px] text-slate-500 font-black self-center ml-1 uppercase opacity-40 tracking-widest rotate-90 shrink-0">仓库 Vault</span>
          </div>
        )}
      </div>
    </div>
  );
};

const BoosterBtn: React.FC<{ icon: string; label: string; count: number; onClick: () => void; color: string; shadow: string }> = ({ icon, label, count, onClick, color, shadow }) => (
  <button 
    onClick={onClick} 
    disabled={count <= 0}
    className={`group flex flex-col items-center gap-1.5 disabled:opacity-20 transition-all active:scale-90`}
  >
    <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-2xl shadow-[0_4px_0_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.15)] ${shadow} transition-all border border-white/20 active:translate-y-1 active:shadow-none`}>
      <span className="filter drop-shadow-lg transform group-active:scale-90">{icon}</span>
    </div>
    <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter opacity-90">{label}({count})</span>
  </button>
);

export default App;
