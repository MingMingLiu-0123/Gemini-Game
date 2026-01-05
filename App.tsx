
import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { GOOSE_TYPES, TRAY_SIZE, LEVELS, ITEM_SIZE, BOARD_WIDTH, BOARD_HEIGHT } from './constants';
import { GameItem, GameState } from './types';

interface RuntimeGameItem extends GameItem {
  originStatus?: 'board' | 'holding';
}

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
        g.gain.setValueAtTime(0.02, this.ctx.currentTime);
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
  item: RuntimeGameItem;
  onClick: (item: RuntimeGameItem) => void;
  isTray?: boolean;
}> = ({ item, onClick, isTray }) => {
  const gooseType = GOOSE_TYPES.find(t => t.id === item.type);
  const [isWiggling, setIsWiggling] = useState(false);
  const [isHonking, setIsHonking] = useState(false);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    if (item.isCovered || (item.status !== 'board' && item.status !== 'holding')) {
      if (item.status === 'board') {
        setIsWiggling(true);
        setTimeout(() => setIsWiggling(false), 300);
      }
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
        filter: 'grayscale(1) brightness(0.2) contrast(1.2) opacity(0.6)',
        transform: `translateY(4px) scale(0.92)`,
        transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
      };
    }

    const depth = isTray ? 0 : 8; // 增加3D深度感
    let shadowStr = '';
    if (depth > 0) {
      for (let i = 1; i <= depth; i++) {
        // 多重层级投影模拟真实厚度
        shadowStr += `0px ${i}px 0px rgba(0,0,0,0.25)${i === depth ? '' : ','}`;
      }
    }

    return {
      boxShadow: shadowStr,
      transform: isTray 
        ? 'scale(0.85)' 
        : `translateY(-${depth}px) rotateZ(${item.id % 2 === 0 ? '1.5deg' : '-1.5deg'})`,
      filter: isTray ? 'none' : 'drop-shadow(0 12px 10px rgba(0,0,0,0.15))',
      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    };
  };

  return (
    <div
      onClick={handleClick}
      onTouchEnd={handleClick}
      className={`absolute flex items-center justify-center transition-all touch-none rounded-[28%]
        ${isWiggling ? 'animate-pulse' : ''}
        ${isHonking ? 'scale-125 rotate-6' : ''}
        ${!item.isCovered && !isTray ? 'active:scale-90 active:translate-y-0' : ''}`}
      style={{
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        left: isTray ? 'auto' : item.x,
        top: isTray ? 'auto' : item.y,
        zIndex: isTray ? 100 : item.z * 10,
        position: isTray ? 'relative' : 'absolute',
        cursor: item.isCovered ? 'not-allowed' : 'pointer',
        background: item.isCovered 
            ? '#334155' 
            : `linear-gradient(135deg, white 0%, #f8fafc 100%)`, // 基础背景
        border: item.isCovered ? '2px solid #1e293b' : '3px solid white',
        ...getShaped3DStyle()
      }}
    >
      {/* 内部彩色渐变背景，体现3D果冻感 */}
      {!item.isCovered && (
        <div className={`absolute inset-1 rounded-[24%] bg-gradient-to-br ${gooseType?.gradient} opacity-20`} />
      )}
      
      {/* 高光遮罩 */}
      {!item.isCovered && (
        <div className="absolute top-1 left-2 right-2 h-1/2 bg-gradient-to-b from-white/60 to-transparent rounded-[24%] pointer-events-none" />
      )}

      {isHonking && (
        <div className="absolute -top-16 bg-white border-4 border-black px-4 py-1.5 rounded-full shadow-2xl z-[300] animate-bounce text-sm font-black text-red-600">
          GAAAA!!
        </div>
      )}
      
      <span className={`select-none text-6xl transform transition-transform duration-300 drop-shadow-md
        ${item.isCovered ? 'text-gray-700 brightness-50' : 'animate-bounce-subtle'}`}>
        {gooseType?.emoji}
      </span>
      
      {/* 稀有度光芒 */}
      {gooseType?.rarity === 'legendary' && !item.isCovered && (
        <div className="absolute inset-0 border-4 border-yellow-400/50 rounded-[28%] animate-pulse" />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [levelIdx, setLevelIdx] = useState(0);
  const [gameState, setGameState] = useState<GameState>('start');
  const [items, setItems] = useState<RuntimeGameItem[]>([]);
  const [tray, setTray] = useState<RuntimeGameItem[]>([]);
  const [holdingArea, setHoldingArea] = useState<RuntimeGameItem[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [boosters, setBoosters] = useState({ undo: 3, shuffle: 3, clear: 2 });
  const [floatingScores, setFloatingScores] = useState<{ id: number; val: number; x: number; y: number }[]>([]);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [isProcessingMatch, setIsProcessingMatch] = useState(false);
  const [boardScale, setBoardScale] = useState(1);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const comboTimeout = useRef<number | null>(null);
  const currentLevel = LEVELS[Math.min(levelIdx, LEVELS.length - 1)];

  const updateScale = useCallback(() => {
    if (gameAreaRef.current) {
      const containerWidth = gameAreaRef.current.clientWidth;
      const containerHeight = gameAreaRef.current.clientHeight;
      const scaleX = (containerWidth - 20) / BOARD_WIDTH;
      const scaleY = (containerHeight - 20) / BOARD_HEIGHT;
      const finalScale = Math.min(scaleX, scaleY, 1.1); 
      setBoardScale(finalScale);
    }
  }, []);

  useLayoutEffect(() => {
    updateScale();
    const timer = setTimeout(updateScale, 150);
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      clearTimeout(timer);
    };
  }, [updateScale]);

  const checkCoverage = useCallback((all: RuntimeGameItem[]) => {
    return all.map(item => {
      if (item.status !== 'board') return { ...item, isCovered: false };
      return {
        ...item,
        isCovered: all.some(other => 
          other.status === 'board' && 
          other.z > item.z && 
          // 覆盖检测基于稍微缩小的物理尺寸，以增加层次感
          Math.abs(other.x - item.x) < ITEM_SIZE * 0.48 && 
          Math.abs(other.y - item.y) < ITEM_SIZE * 0.48
        )
      };
    });
  }, []);

  const initLevel = useCallback((idx: number) => {
    const config = LEVELS[Math.min(idx, LEVELS.length - 1)];
    const typesToUse = GOOSE_TYPES.slice(0, config.uniqueTypes);
    let generated: RuntimeGameItem[] = [];
    let idCounter = 0;
    
    for (let i = 0; i < config.totalSets; i++) {
      const type = typesToUse[Math.floor(Math.random() * typesToUse.length)];
      for (let j = 0; j < 3; j++) {
        const gridX = Math.floor(Math.random() * 5);
        const gridY = Math.floor(Math.random() * 5); 
        const offsetX = (Math.random() - 0.5) * 35;
        const offsetY = (Math.random() - 0.5) * 55;
        
        generated.push({
          id: idCounter++,
          type: type.id,
          x: Math.max(8, Math.min(BOARD_WIDTH - ITEM_SIZE - 8, gridX * 60 + 15 + offsetX)),
          y: Math.max(15, Math.min(BOARD_HEIGHT - ITEM_SIZE - 15, gridY * 90 + 20 + offsetY)),
          z: Math.floor(Math.random() * config.layers),
          status: 'board',
          isCovered: false
        });
      }
    }

    setItems(checkCoverage(generated));
    setTray([]);
    setHoldingArea([]);
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setIsProcessingMatch(false);
  }, [checkCoverage]);

  const handleItemClick = (clickedItem: RuntimeGameItem) => {
    if (gameState !== 'playing' || tray.length >= TRAY_SIZE || isProcessingMatch || clickedItem.isCovered) return;
    
    const newTrayItem: RuntimeGameItem = { 
      ...clickedItem, 
      status: 'tray', 
      originStatus: clickedItem.status as 'board' | 'holding' 
    };

    setTray(prev => [...prev, newTrayItem]);
    setItems(prev => checkCoverage(prev.map(item => item.id === clickedItem.id ? { ...item, status: 'tray' as const } : item)));

    if (clickedItem.status === 'holding') {
      setHoldingArea(prev => prev.filter(i => i.id !== clickedItem.id));
    }

    setCombo(c => c + 1);
    if (comboTimeout.current) clearTimeout(comboTimeout.current);
    comboTimeout.current = window.setTimeout(() => setCombo(0), 1500);
  };

  useEffect(() => {
    if (tray.length === 0 || isProcessingMatch) return;

    const counts: Record<string, number> = {};
    tray.forEach(i => counts[i.type] = (counts[i.type] || 0) + 1);
    
    const matchType = Object.keys(counts).find(t => counts[t] >= 3);
    if (matchType) {
      setIsProcessingMatch(true);
      setTimeout(() => {
        const matchingItemsInTray = tray.filter(i => i.type === matchType).slice(0, 3);
        const matchingIds = matchingItemsInTray.map(i => i.id);

        setItems(prev => prev.map(i => matchingIds.includes(i.id) ? { ...i, status: 'cleared' as const } : i));
        setTray(prev => prev.filter(i => !matchingIds.includes(i.id)));

        const typeInfo = GOOSE_TYPES.find(gt => gt.id === matchType);
        const totalGain = (typeInfo?.points || 100) + (combo * 150);
        setScore(s => s + totalGain);
        setFloatingScores(prev => [...prev, { id: Date.now(), val: totalGain, x: BOARD_WIDTH/2 - 20, y: BOARD_HEIGHT/2 }]);
        
        setIsProcessingMatch(false);
      }, 350);
    } else if (tray.length === TRAY_SIZE) {
      setGameState('lost');
    }
  }, [tray, combo, isProcessingMatch]);

  const useShuffle = () => {
    if (boosters.shuffle <= 0 || isProcessingMatch) return;
    setItems(prev => {
      const boardItems = prev.filter(i => i.status === 'board');
      const types = boardItems.map(i => i.type).sort(() => Math.random() - 0.5);
      let typeIdx = 0;
      return checkCoverage(prev.map(item => item.status === 'board' ? { ...item, type: types[typeIdx++] } : item));
    });
    setBoosters(b => ({ ...b, shuffle: b.shuffle - 1 }));
  };

  const useUndo = () => {
    if (boosters.undo <= 0 || tray.length === 0 || isProcessingMatch) return;
    const last = tray[tray.length - 1];
    setTray(prev => prev.slice(0, -1));
    setItems(prev => checkCoverage(prev.map(i => i.id === last.id ? { ...i, status: last.originStatus || 'board' } : i)));
    if (last.originStatus === 'holding') setHoldingArea(prev => [...prev, { ...last, status: 'holding' }]);
    setBoosters(b => ({ ...b, undo: b.undo - 1 }));
  };

  const useClear = () => {
    if (boosters.clear <= 0 || tray.length < 3 || isProcessingMatch) return;
    const toHold = tray.slice(0, 3);
    setTray(prev => prev.slice(3));
    setItems(prev => prev.map(i => toHold.some(th => th.id === i.id) ? { ...i, status: 'holding' as const } : i));
    setHoldingArea(prev => [...prev, ...toHold.map(i => ({ ...i, status: 'holding' as const }))]);
    setBoosters(b => ({ ...b, clear: b.clear - 1 }));
  };

  const toggleMusic = async () => {
    if (musicEnabled) musicPlayer.stop();
    else await musicPlayer.start();
    setMusicEnabled(!musicEnabled);
  };

  useEffect(() => {
    if (gameState === 'playing' && items.length > 0 && items.every(i => i.status === 'cleared')) {
      setGameState('won');
    }
  }, [items, gameState]);

  return (
    <div className={`flex flex-col h-full w-full max-w-2xl mx-auto bg-gradient-to-b ${currentLevel.bgGradient} transition-all duration-1000 overflow-hidden relative shadow-2xl font-sans`}>
      
      {/* HUD Header */}
      <div className="flex-shrink-0 px-5 py-4 pt-[calc(1rem+var(--sat))] flex justify-between items-center bg-white/70 backdrop-blur-2xl z-[100] border-b border-white shadow-sm">
        <div className="flex flex-col">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em]">{currentLevel.name}</span>
          <span className="text-4xl font-black text-slate-900 drop-shadow-sm tabular-nums leading-none mt-1">{score}</span>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={toggleMusic} className="w-11 h-11 rounded-2xl bg-white shadow-md flex items-center justify-center text-2xl border border-white active-press transition-transform">
             {musicEnabled ? '🎵' : '🔇'}
           </button>
           <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl text-sm font-black shadow-xl ring-4 ring-slate-900/10">
              LV {levelIdx + 1}
           </div>
        </div>
      </div>

      {/* Game Area Container */}
      <div ref={gameAreaRef} className="relative flex-1 w-full overflow-hidden flex items-center justify-center p-3">
        <div 
          className="relative origin-center transition-transform duration-500 ease-out" 
          style={{ 
            width: BOARD_WIDTH, 
            height: BOARD_HEIGHT,
            transform: `scale(${boardScale})` 
          }}
        >
          {items.filter(i => i.status === 'board').map(item => (
            <GooseCard key={item.id} item={item} onClick={handleItemClick} />
          ))}
          {floatingScores.map(fs => (
            <FloatingScore key={fs.id} score={fs.val} x={fs.x} y={fs.y} onComplete={() => setFloatingScores(prev => prev.filter(f => f.id !== fs.id))} />
          ))}
        </div>

        {/* Modal Overlay */}
        {gameState !== 'playing' && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl px-6">
            <div className="bg-white p-10 rounded-[3.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] text-center w-full max-w-[320px] animate-in zoom-in-95 fade-in duration-500">
              <div className="text-9xl mb-8 transform hover:scale-110 transition-transform cursor-default filter drop-shadow-2xl">
                {gameState === 'won' ? '🥇' : (gameState === 'lost' ? '😵' : '🪿')}
              </div>
              <h2 className="text-4xl font-black mb-3 text-slate-900 tracking-tight">
                {gameState === 'won' ? '神之一手!' : (gameState === 'lost' ? '哎呀挤爆了!' : '抓大鹅大师')}
              </h2>
              <p className="text-slate-500 mb-10 text-base font-bold leading-relaxed px-2">
                {gameState === 'won' ? '你的抓鹅技巧已经炉火纯青，敢挑战下一关吗？' : '槽位满了！灰黑色的动物无法抓取，请先清理顶层的动物。'}
              </p>
              <button 
                onClick={async () => {
                  await musicPlayer.init(); 
                  if (gameState === 'won') {
                    setLevelIdx(v => v + 1);
                    initLevel(levelIdx + 1);
                  } else {
                    initLevel(levelIdx);
                  }
                }}
                className="w-full py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black text-2xl rounded-[2.5rem] shadow-2xl active:translate-y-1 transition-all hover:brightness-110 ring-8 ring-slate-900/5"
              >
                {gameState === 'start' ? '开始捕捉' : '再来一局'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom UI */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur-3xl px-5 pt-5 pb-[calc(1.2rem+var(--sab))] rounded-t-[3.5rem] shadow-[0_-15px_50px_rgba(0,0,0,0.12)] z-[150] border-t border-white">
        
        <div className="flex justify-around mb-6 px-1 gap-4">
          <BoosterBtn icon="🔙" label="撤销" count={boosters.undo} onClick={useUndo} color="from-sky-400 to-blue-600" />
          <BoosterBtn icon="🔀" label="洗牌" count={boosters.shuffle} onClick={useShuffle} color="from-fuchsia-400 to-purple-600" />
          <BoosterBtn icon="🧺" label="仓库" count={boosters.clear} onClick={useClear} color="from-amber-400 to-orange-600" />
        </div>

        {holdingArea.length > 0 && (
          <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar p-3 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 items-center h-16 shadow-inner">
            {holdingArea.map(item => (
              <div key={item.id} className="relative w-11 h-11 shrink-0">
                <div className="scale-[0.45] origin-top-left">
                  <GooseCard item={item} onClick={handleItemClick} isTray />
                </div>
              </div>
            ))}
            <span className="text-[11px] font-black text-slate-300 ml-auto pr-3 uppercase italic tracking-widest">TEMPORARY</span>
          </div>
        )}

        {/* Tray - 槽位设计升级 */}
        <div className="relative bg-slate-50 p-2.5 rounded-[2.5rem] border-b-8 border-slate-200 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] flex gap-1.5 justify-center items-center min-h-[78px]">
          {Array.from({ length: TRAY_SIZE }).map((_, i) => (
            <div key={i} className="flex-1 max-w-[48px] aspect-square bg-white/80 rounded-2xl border-2 border-white shadow-sm flex items-center justify-center relative overflow-visible ring-1 ring-slate-100">
              {tray[i] && (
                <div className="transform scale-[0.55] animate-in zoom-in fade-in slide-in-from-bottom-2 duration-300">
                   <GooseCard item={tray[i]} onClick={() => {}} isTray />
                </div>
              )}
            </div>
          ))}
          {isProcessingMatch && (
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] rounded-[2.5rem] flex items-center justify-center pointer-events-none z-[160]">
               <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BoosterBtn: React.FC<{ icon: string; label: string; count: number; onClick: () => void; color: string }> = ({ icon, label, count, onClick, color }) => (
  <button 
    onClick={onClick} 
    disabled={count <= 0}
    className="group flex flex-col items-center gap-2 disabled:opacity-30 transition-all active-press"
  >
    <div className={`w-14 h-14 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-2xl shadow-xl text-white border-b-4 border-black/20 ring-4 ring-white`}>
      {icon}
    </div>
    <span className="text-[11px] font-black text-slate-500 tracking-wide">{label}({count})</span>
  </button>
);

export default App;
