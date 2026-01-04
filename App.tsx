
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
        filter: 'grayscale(1) brightness(0.2) opacity(0.6)',
        transform: `translateY(4px) scale(0.95)`,
        transition: 'all 0.4s ease',
      };
    }

    const depth = isTray ? 0 : 6;
    let shadowStr = '';
    if (depth > 0) {
      for (let i = 1; i <= depth; i++) {
        shadowStr += `0px ${i}px 0px rgba(0,0,0,0.2)${i === depth ? '' : ','}`;
      }
    }

    return {
      textShadow: shadowStr,
      transform: isTray 
        ? 'scale(0.85)' 
        : `translateY(-6px) rotateZ(${item.id % 2 === 0 ? '2deg' : '-2deg'})`,
      filter: isTray ? 'none' : 'drop-shadow(0 10px 8px rgba(0,0,0,0.2))',
      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    };
  };

  return (
    <div
      onClick={handleClick}
      onTouchEnd={handleClick}
      className={`absolute flex items-center justify-center transition-all touch-none
        ${isWiggling ? 'animate-pulse' : ''}
        ${isHonking ? 'scale-150 -rotate-12' : ''}`}
      style={{
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        left: isTray ? 'auto' : item.x,
        top: isTray ? 'auto' : item.y,
        zIndex: isTray ? 100 : item.z * 10,
        position: isTray ? 'relative' : 'absolute',
        cursor: item.isCovered ? 'not-allowed' : 'pointer',
        ...getShaped3DStyle()
      }}
    >
      {isHonking && (
        <div className="absolute -top-16 bg-white border-4 border-black px-3 py-1 rounded-2xl shadow-2xl z-[300] animate-bounce text-xs font-black text-red-600">
          嘎!!
        </div>
      )}
      <span className={`select-none text-6xl transform transition-colors ${item.isCovered ? 'text-gray-600' : (gooseType?.color || 'text-white')}`}>
        {gooseType?.emoji}
      </span>
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

  // 响应式缩放计算
  const updateScale = useCallback(() => {
    if (gameAreaRef.current) {
      const containerWidth = gameAreaRef.current.clientWidth;
      const containerHeight = gameAreaRef.current.clientHeight;
      
      // 计算水平和垂直缩放比例，取最小值以确保内容不溢出
      const scaleX = (containerWidth - 20) / BOARD_WIDTH;
      const scaleY = (containerHeight - 20) / BOARD_HEIGHT;
      const finalScale = Math.min(scaleX, scaleY, 1.2); // 最大放大到1.2倍
      
      setBoardScale(finalScale);
    }
  }, []);

  useLayoutEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const checkCoverage = useCallback((all: RuntimeGameItem[]) => {
    return all.map(item => {
      if (item.status !== 'board') return { ...item, isCovered: false };
      return {
        ...item,
        isCovered: all.some(other => 
          other.status === 'board' && 
          other.z > item.z && 
          Math.abs(other.x - item.x) < ITEM_SIZE * 0.52 && 
          Math.abs(other.y - item.y) < ITEM_SIZE * 0.52
        )
      };
    });
  }, []);

  const initLevel = useCallback((idx: number) => {
    const config = LEVELS[Math.min(idx, LEVELS.length - 1)];
    const typesToUse = GOOSE_TYPES.slice(0, config.uniqueTypes);
    let generated: RuntimeGameItem[] = [];
    let idCounter = 0;
    
    // 大鹅生成逻辑：保持在逻辑坐标 BOARD_WIDTH / BOARD_HEIGHT 之内
    for (let i = 0; i < config.totalSets; i++) {
      const type = typesToUse[Math.floor(Math.random() * typesToUse.length)];
      for (let j = 0; j < 3; j++) {
        const gridX = Math.floor(Math.random() * 5);
        const gridY = Math.floor(Math.random() * 6); 
        const offsetX = (Math.random() - 0.5) * 50;
        const offsetY = (Math.random() - 0.5) * 50;
        
        generated.push({
          id: idCounter++,
          type: type.id,
          x: Math.max(5, Math.min(BOARD_WIDTH - ITEM_SIZE - 5, gridX * 60 + 10 + offsetX)),
          y: Math.max(5, Math.min(BOARD_HEIGHT - ITEM_SIZE - 5, gridY * 70 + 10 + offsetY)),
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
    <div className={`flex flex-col h-full w-full max-w-2xl mx-auto bg-gradient-to-b ${currentLevel.bgGradient} transition-all duration-1000 overflow-hidden relative shadow-2xl`}>
      
      {/* HUD Header */}
      <div className="px-4 py-3 pt-[calc(0.75rem+var(--sat))] flex justify-between items-center bg-white/60 backdrop-blur-xl z-[100] border-b border-white/50">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{currentLevel.name}</span>
          <span className="text-3xl font-black text-slate-900 drop-shadow-sm tabular-nums">{score}</span>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={toggleMusic} className="w-10 h-10 rounded-xl bg-white/80 shadow-sm flex items-center justify-center text-xl border border-white active-press transition-transform">
             {musicEnabled ? '🎵' : '🔇'}
           </button>
           <div className="flex flex-col items-end">
              <div className="bg-slate-900 text-white px-3 py-1 rounded-xl text-xs font-black shadow-lg">LV {levelIdx + 1}</div>
              {combo > 1 && <div className="text-orange-600 font-black italic text-[10px] mt-1 animate-pulse">x{combo} COMBO 🔥</div>}
           </div>
        </div>
      </div>

      {/* Game Area Container - 重要适配点 */}
      <div ref={gameAreaRef} className="relative flex-1 w-full overflow-hidden flex items-center justify-center p-4">
        <div 
          className="relative origin-center transition-transform duration-300" 
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
          <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center w-full max-w-[300px] animate-in zoom-in-95 duration-300">
              <div className="text-8xl mb-6 transform hover:scale-110 transition-transform cursor-default">
                {gameState === 'won' ? '🥇' : (gameState === 'lost' ? '😵' : '🪿')}
              </div>
              <h2 className="text-3xl font-black mb-2 text-slate-900">
                {gameState === 'won' ? '鹅中之神!' : (gameState === 'lost' ? '槽位爆满!' : '抓大鹅大师')}
              </h2>
              <p className="text-slate-500 mb-8 text-sm font-bold leading-relaxed px-4">
                {gameState === 'won' ? '你征服了所有的大鹅，快去下一关吧！' : '灰黑色的动物无法抓取，请先清理上面的动物。'}
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
                className="w-full py-4 bg-slate-900 text-white font-black text-2xl rounded-[2rem] shadow-xl active:translate-y-1 transition-all hover:bg-slate-800"
              >
                {gameState === 'start' ? '立刻出发' : '重战江湖'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom UI - 适配底部安全区 */}
      <div className="bg-white/90 backdrop-blur-3xl px-4 pt-4 pb-[calc(1rem+var(--sab))] rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-[150] border-t border-white/50">
        
        <div className="flex justify-around mb-4 px-2 gap-2">
          <BoosterBtn icon="🔙" label="撤销" count={boosters.undo} onClick={useUndo} color="from-blue-500 to-blue-700" />
          <BoosterBtn icon="🔀" label="洗牌" count={boosters.shuffle} onClick={useShuffle} color="from-purple-500 to-purple-700" />
          <BoosterBtn icon="🧺" label="移出" count={boosters.clear} onClick={useClear} color="from-orange-500 to-orange-700" />
        </div>

        {holdingArea.length > 0 && (
          <div className="mb-4 flex gap-1.5 overflow-x-auto no-scrollbar p-2 bg-slate-100/60 rounded-2xl border border-dashed border-slate-300 items-center h-14">
            {holdingArea.map(item => (
              <div key={item.id} className="relative w-10 h-10 shrink-0">
                <div className="scale-[0.45] origin-top-left">
                  <GooseCard item={item} onClick={handleItemClick} isTray />
                </div>
              </div>
            ))}
            <span className="text-[10px] font-black text-slate-400 ml-auto pr-2 uppercase italic">仓库</span>
          </div>
        )}

        <div className="relative bg-slate-100 p-2 rounded-[2rem] border-b-4 border-slate-300 shadow-inner flex gap-1 justify-center items-center min-h-[68px]">
          {Array.from({ length: TRAY_SIZE }).map((_, i) => (
            <div key={i} className="flex-1 max-w-[44px] aspect-square bg-white/70 rounded-xl border border-dashed border-slate-300 flex items-center justify-center relative shadow-sm overflow-hidden">
              {tray[i] && (
                <div className="transform scale-[0.65] animate-in zoom-in slide-in-from-top-4 duration-300">
                   <GooseCard item={tray[i]} onClick={() => {}} isTray />
                </div>
              )}
            </div>
          ))}
          {isProcessingMatch && (
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] rounded-[2rem] flex items-center justify-center pointer-events-none">
              <div className="w-5 h-5 border-3 border-slate-400 border-t-transparent rounded-full animate-spin" />
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
    className="group flex flex-col items-center gap-1 disabled:opacity-25 transition-all active-press"
  >
    <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-xl shadow-lg text-white border-b-2 border-black/10`}>
      {icon}
    </div>
    <span className="text-[10px] font-black text-slate-500">{label}({count})</span>
  </button>
);

export default App;
