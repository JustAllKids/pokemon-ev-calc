import React, { useState, useEffect } from 'react';
import { Calculator, RefreshCcw, Swords, Shield, Zap, Download, Copy, Check, Info } from 'lucide-react';

const statNames = {
  hp: 'HP (血量)',
  atk: 'Atk (物攻)',
  def: 'Def (物防)',
  spa: 'SpA (特攻)',
  spd: 'SpD (特防)',
  spe: 'Spe (速度)'
};

const shortStatNames = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

/**
 * 现代风格的开关组件
 */
const ModernToggle = ({ checked, onChange, label }) => (
  <label className="flex items-center justify-between cursor-pointer group py-2">
    <span className="text-sm text-gray-600 font-medium">{label}</span>
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <div className={`block w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-5' : ''} shadow-sm`}></div>
    </div>
  </label>
);

export default function App() {
  const [pokemonName, setPokemonName] = useState('振翼发');
  const [cps, setCps] = useState({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  const [evs, setEvs] = useState({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  
  const [isShiny, setIsShiny] = useState(false);
  const [enforceLegal, setEnforceLegal] = useState(true);
  const [zeroAtk, setZeroAtk] = useState(false);
  const [zeroSpe, setZeroSpe] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [importText, setImportText] = useState('');
  const [rawTemplate, setRawTemplate] = useState('');
  const [gender, setGender] = useState(''); 

  const totalCp = Object.values(cps).reduce((a, b) => a + b, 0);

  useEffect(() => {
    let raw = {};
    let totalEvs = 0;
    Object.keys(cps).forEach(k => {
      let cp = cps[k];
      let ev = cp === 0 ? 0 : (cp >= 32 ? 252 : cp * 8 - 4);
      raw[k] = ev;
      totalEvs += ev;
    });

    if (enforceLegal && totalEvs > 510) {
      let current = { ...raw };
      while (Object.values(current).reduce((a, b) => a + b, 0) > 510) {
        let minKey = null;
        let minVal = 999;
        Object.keys(current).forEach(k => {
          if (current[k] > 0 && current[k] < minVal) {
            minVal = current[k];
            minKey = k;
          }
        });
        if (minKey) {
          if (current[minKey] > 4) current[minKey] -= 8;
          else current[minKey] -= 4;
        } else break;
      }

      // 【新增】智能兜底回收机制：如果为了合法扣减导致总计 504，自动将闲置的 4 点加到防/血空余项上，达到标准 508
      let newTotal = Object.values(current).reduce((a, b) => a + b, 0);
      if (newTotal === 504) {
        const preferKeys = ['spd', 'def', 'hp', 'spe'];
        let targetKey = preferKeys.find(k => current[k] === 0);
        if (!targetKey) {
          targetKey = Object.keys(current).find(k => current[k] === 0);
        }
        if (targetKey) {
          current[targetKey] = 4;
        }
      }

      setEvs(current);
    } else {
      setEvs(raw);
    }
  }, [cps, enforceLegal]);

  const handleCpChange = (stat, value) => {
    const num = parseInt(value) || 0;
    const clamped = Math.max(0, Math.min(32, num));
    const currentTotalExcludingThis = totalCp - cps[stat];
    const finalValue = currentTotalExcludingThis + clamped > 66 ? 66 - currentTotalExcludingThis : clamped;
    setCps(prev => ({ ...prev, [stat]: finalValue }));
  };

  const applyPreset = (preset) => {
    let newCps = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    if (preset === 'physical') { newCps.atk = 32; newCps.spe = 32; newCps.hp = 2; setZeroAtk(false); }
    if (preset === 'special')  { newCps.spa = 32; newCps.spe = 32; newCps.hp = 2; setZeroAtk(true); }
    if (preset === 'trickroom'){ newCps.hp = 32; newCps.atk = 32; newCps.def = 2; setZeroSpe(true); setZeroAtk(false); }
    setCps(newCps);
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    setRawTemplate(importText);
    let newCps = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const nameMatch = importText.match(/^([^@\n]+)/);
    if (nameMatch) {
      let namePart = nameMatch[1].trim();
      const genderMatch = namePart.match(/\s*\(([MF])\)$/i);
      if (genderMatch) {
        setGender(genderMatch[1].toUpperCase());
        namePart = namePart.replace(/\s*\(([MF])\)$/i, '');
      } else {
        setGender(''); 
      }
      setPokemonName(namePart);
    }
    const evMatch = importText.match(/EVs:\s*(.+?)(?:\n|$)/i);
    if (evMatch) {
      const evString = evMatch[1];
      const evParts = evString.split('/');
      evParts.forEach(part => {
        const [val, stat] = part.trim().split(/\s+/);
        const num = parseInt(val);
        if (!isNaN(num) && stat) {
          const s = stat.toLowerCase();
          if (s === 'hp') newCps.hp = num;
          else if (s === 'atk') newCps.atk = num;
          else if (s === 'def') newCps.def = num;
          else if (s === 'spa') newCps.spa = num;
          else if (s === 'spd') newCps.spd = num;
          else if (s === 'spe') newCps.spe = num;
        }
      });
    }
    setCps(newCps);
  };

  const generateCode = () => {
    let evStrings = [];
    Object.keys(evs).forEach(k => {
      if (evs[k] > 0) evStrings.push(`${evs[k]} ${shortStatNames[k]}`);
    });
    const evLine = evStrings.length > 0 ? `EVs: ${evStrings.join(' / ')}` : '';
    let ivStrings = [];
    if (zeroAtk) ivStrings.push('0 Atk');
    if (zeroSpe) ivStrings.push('0 Spe');
    const ivLine = ivStrings.length > 0 ? `IVs: ${ivStrings.join(' / ')}` : '';
    let nameWithGender = pokemonName || 'Pokemon';
    if (gender) nameWithGender += ` (${gender})`;

    let resultLines = [];
    let firstLine = nameWithGender;
    if (rawTemplate) {
      const originalFirstLine = rawTemplate.split('\n')[0];
      if (originalFirstLine.includes('@')) {
        const item = originalFirstLine.split('@')[1].trim();
        firstLine += ` @ ${item}`;
      }
    }
    resultLines.push(firstLine);
    if (isShiny) resultLines.push('Shiny: Yes');
    if (rawTemplate) {
      const otherLines = rawTemplate.split('\n').slice(1).filter(l => {
        const lower = l.toLowerCase().trim();
        return l.trim() !== '' && !lower.startsWith('evs:') && !lower.startsWith('ivs:') && !lower.startsWith('shiny:');
      });
      resultLines.push(...otherLines);
    }
    if (evLine) resultLines.push(evLine);
    if (ivLine) resultLines.push(ivLine);
    return resultLines.join('\n').trim();
  };

  const copyToClipboard = async () => {
    const code = generateCode();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        throw new Error();
      }
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (e) { console.error('Copy failed'); }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* 现代导航栏 */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-blue-200 shadow-lg">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">宝可梦能力转换器 <span className="text-blue-600 text-sm ml-1 font-medium">冠军版 v2.2</span></h1>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <Info className="w-3.5 h-3.5" /> 自动适配《冠军》32/32/2 系统
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 左侧主要控制区 */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 能力点分配卡片 */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">能力点加点 (CP)</h2>
                  <p className="text-xs text-slate-400 mt-1">根据《冠军》游戏内的 66 点上限进行分配</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${totalCp === 66 ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'bg-blue-50 text-blue-700'}`}>
                  {totalCp} / 66 <span className="text-[10px] ml-1 uppercase opacity-60">Used</span>
                </div>
              </div>

              {/* 快速预设按钮组 */}
              <div className="grid grid-cols-3 gap-2 mb-8">
                <button onClick={() => applyPreset('physical')} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95 group">
                  <Swords className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                  <span className="text-xs font-semibold">物攻极速</span>
                </button>
                <button onClick={() => applyPreset('special')} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95 group">
                  <Zap className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                  <span className="text-xs font-semibold">特攻极速</span>
                </button>
                <button onClick={() => applyPreset('trickroom')} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95 group">
                  <Shield className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className="text-xs font-semibold">空间低速</span>
                </button>
              </div>

              {/* 滑动条列表 */}
              <div className="space-y-6">
                {Object.keys(statNames).map((stat) => (
                  <div key={stat} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-slate-600">{statNames[stat]}</label>
                      <span className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{cps[stat]}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" min="0" max="32" value={cps[stat]} 
                        onChange={(e) => handleCpChange(stat, e.target.value)}
                        className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => {setCps({hp:0, atk:0, def:0, spa:0, spd:0, spe:0}); setRawTemplate(''); setImportText('');}}
                className="mt-8 flex items-center justify-center w-full gap-2 py-3 text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all border border-dashed border-slate-200"
              >
                <RefreshCcw className="w-4 h-4" /> 重置所有数值
              </button>
            </section>

            {/* 导入区 */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" /> 从外部代码导入
              </h3>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="在此粘贴 Showdown 或 PKHeX 导出的文本..."
                className="w-full h-32 text-xs p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none font-mono leading-relaxed"
              />
              <button
                onClick={handleImport}
                className="w-full mt-4 bg-slate-900 hover:bg-black text-white text-sm py-3 rounded-xl transition-all font-bold shadow-lg shadow-slate-200"
              >
                解析并同步参数
              </button>
            </section>
          </div>

          {/* 右侧结果展示区 */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 转换结果卡片 */}
            <section className="bg-slate-900 rounded-2xl shadow-xl p-6 text-white overflow-hidden relative">
              <div className="relative z-10">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                  转换结果 (朱紫 EVs)
                </h2>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {Object.keys(evs).map((stat) => (
                    <div key={stat} className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                      <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest">{shortStatNames[stat]}</div>
                      <div className="text-2xl font-black mt-1 tracking-tight">{evs[stat]}</div>
                      <div className="w-full bg-white/10 h-1.5 mt-3 rounded-full overflow-hidden">
                        <div className="bg-blue-400 h-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(96,165,250,0.5)]" style={{ width: `${(evs[stat] / 252) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-6 border-t border-white/10">
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <input 
                        type="text" value={pokemonName} onChange={(e) => setPokemonName(e.target.value)}
                        placeholder="宝可梦名"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:bg-white/10 outline-none transition-all"
                      />
                      <select
                        value={gender} onChange={(e) => setGender(e.target.value)}
                        className="w-28 bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-sm focus:bg-white/10 outline-none cursor-pointer"
                      >
                        <option value="" className="text-slate-900">性别: 无</option>
                        <option value="M" className="text-slate-900">雄性 (M)</option>
                        <option value="F" className="text-slate-900">雌性 (F)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 gap-1 px-1">
                      <ModernToggle label="✨ 包含闪光标记" checked={isShiny} onChange={() => setIsShiny(!isShiny)} />
                      <ModernToggle label="⚖️ 510 努力值合法化" checked={enforceLegal} onChange={() => setEnforceLegal(!enforceLegal)} />
                      <ModernToggle label="🛡️ 0 物攻个体值" checked={zeroAtk} onChange={() => setZeroAtk(!zeroAtk)} />
                      <ModernToggle label="⏳ 0 速度个体值" checked={zeroSpe} onChange={() => setZeroSpe(!zeroSpe)} />
                    </div>
                  </div>
                </div>
              </div>
              {/* 背景装饰 */}
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-600/20 blur-[60px] rounded-full"></div>
            </section>

            {/* 复制指令卡片 */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col grow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">预览与导出指令</h3>
                <button 
                  onClick={copyToClipboard}
                  className={`flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 ${copySuccess ? 'bg-green-500 text-white shadow-green-200' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}
                >
                  {copySuccess ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                  )}
                  {copySuccess ? '已复制' : '复制指令'}
                </button>
              </div>
              <textarea 
                readOnly 
                value={generateCode()}
                className="w-full h-48 bg-slate-50 text-slate-600 font-mono text-[11px] p-5 rounded-xl border border-slate-100 shadow-inner resize-none focus:outline-none leading-relaxed"
              />
            </section>

          </div>
        </div>
      </main>
      
      <footer className="max-w-6xl mx-auto px-4 mt-12 text-center">
        <p className="text-slate-400 text-xs font-medium">Built for Pokémon: Champions 2026. Happy Battling!</p>
      </footer>
    </div>
  );
}