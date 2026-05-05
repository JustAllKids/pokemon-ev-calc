import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Calculator, RefreshCcw, Swords, Shield, Zap, Download, Copy, Check } from 'lucide-react';

// 能力值名称映射
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
 * Windows 11 风格的开关组件
 */
const WinToggle = ({ checked, onChange, label }) => (
  <label className="flex items-center justify-between cursor-pointer group">
    <span className="text-sm text-gray-700 mr-4">{label}</span>
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <div className={`block w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300 border border-gray-400'}`}></div>
      <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`}></div>
    </div>
  </label>
);

export default function App() {
  // --- 基础状态 ---
  const [pokemonName, setPokemonName] = useState('振翼发');
  const [cps, setCps] = useState({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  const [evs, setEvs] = useState({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  
  // --- 配置项 ---
  const [isShiny, setIsShiny] = useState(false);
  const [enforceLegal, setEnforceLegal] = useState(true);
  const [zeroAtk, setZeroAtk] = useState(false);
  const [zeroSpe, setZeroSpe] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [importText, setImportText] = useState('');
  const [rawTemplate, setRawTemplate] = useState('');
  const [gender, setGender] = useState(''); 

  // 计算已分配的总能力点 (上限 66)
  const totalCp = Object.values(cps).reduce((a, b) => a + b, 0);

  /**
   * 核心算法：将“冠军”加点转换为“朱紫”努力值
   */
  useEffect(() => {
    let raw = {};
    let totalEvs = 0;
    Object.keys(cps).forEach(k => {
      let cp = cps[k];
      // 转换公式：1点=4EV，之后每点+8EV。32点=252EV。
      let ev = cp === 0 ? 0 : (cp >= 32 ? 252 : cp * 8 - 4);
      raw[k] = ev;
      totalEvs += ev;
    });

    // 自动平衡以符合 510 努力值上限
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
    
    // 提取名字与性别
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

    // 提取努力值
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

  /**
   * 生成符合 PKHeX/Showdown 格式的代码
   */
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

    // 构建结果
    let resultLines = [];
    
    // 1. 第一行处理 (保留道具)
    let firstLine = nameWithGender;
    if (rawTemplate) {
      const originalFirstLine = rawTemplate.split('\n')[0];
      if (originalFirstLine.includes('@')) {
        const item = originalFirstLine.split('@')[1].trim();
        firstLine += ` @ ${item}`;
      }
    }
    resultLines.push(firstLine);

    // 2. 闪光状态
    if (isShiny) resultLines.push('Shiny: Yes');

    // 3. 处理模版中的招式/特性/性格 (过滤掉冲突项)
    if (rawTemplate) {
      const otherLines = rawTemplate.split('\n').slice(1).filter(l => {
        const lower = l.toLowerCase().trim();
        return l.trim() !== '' && 
               !lower.startsWith('evs:') && 
               !lower.startsWith('ivs:') && 
               !lower.startsWith('shiny:');
      });
      resultLines.push(...otherLines);
    }

    // 4. 追加新的努力值与个体值
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
      } catch (e) {
        console.error('Copy failed');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center p-4 sm:p-8 font-sans text-gray-900">
      <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-[0_12px_40px_rgb(0,0,0,0.12)] border border-white/60 w-full max-w-5xl overflow-hidden flex flex-col h-[85vh] md:h-auto">
        
        {/* Title Bar */}
        <div className="h-10 bg-white/50 border-b border-gray-200 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center pl-4 text-xs text-gray-700 font-medium">
            <Calculator className="w-4 h-4 mr-2 text-blue-600" />
            宝可梦能力转换器 - 冠军版 v2.2
          </div>
          <div className="flex h-full">
            <button className="px-4 hover:bg-gray-200 transition-colors flex items-center justify-center"><Minus className="w-4 h-4 text-gray-600" /></button>
            <button className="px-4 hover:bg-gray-200 transition-colors flex items-center justify-center"><Square className="w-3 h-3 text-gray-600" /></button>
            <button className="px-4 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"><X className="w-4 h-4 text-gray-600" /></button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row p-6 gap-6 overflow-y-auto">
          {/* Left Column */}
          <div className="flex-1 flex flex-col space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">《冠军》能力点分配</h2>
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${totalCp === 66 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                  已分配: {totalCp} / 66
                </div>
              </div>

              <div className="flex gap-2 mb-6">
                <button onClick={() => applyPreset('physical')} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-2 rounded-md transition-colors flex justify-center items-center">
                  <Swords className="w-3 h-3 mr-1"/> 物攻极速
                </button>
                <button onClick={() => applyPreset('special')} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-2 rounded-md transition-colors flex justify-center items-center">
                  <Zap className="w-3 h-3 mr-1"/> 特攻极速
                </button>
                <button onClick={() => applyPreset('trickroom')} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-2 rounded-md transition-colors flex justify-center items-center">
                  <Shield className="w-3 h-3 mr-1"/> 空间打手
                </button>
              </div>

              <div className="space-y-4">
                {Object.keys(statNames).map((stat) => (
                  <div key={stat} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-gray-600">{statNames[stat]}</div>
                    <input type="range" min="0" max="32" value={cps[stat]} onChange={(e) => handleCpChange(stat, e.target.value)} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    <input type="number" min="0" max="32" value={cps[stat]} onChange={(e) => handleCpChange(stat, e.target.value)} className="w-14 text-center text-sm border border-gray-300 rounded-md py-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                ))}
              </div>

              <button onClick={() => {setCps({hp:0, atk:0, def:0, spa:0, spd:0, spe:0}); setRawTemplate(''); setImportText('');}} className="mt-6 flex items-center justify-center w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-2 border border-dashed border-gray-300 rounded-lg">
                <RefreshCcw className="w-3 h-3 mr-2" /> 清空并重置
              </button>
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center"><Download className="w-4 h-4 mr-2" /> 模版快速导入</h3>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="在此粘贴 PKHeX/Showdown 代码..." className="w-full h-24 text-xs p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 resize-none font-mono" />
              <button onClick={handleImport} className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2.5 rounded-lg transition-all font-bold shadow-sm">解析并同步参数</button>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 flex flex-col space-y-6">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-800 mb-4">《朱紫》转换结果</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {Object.keys(evs).map((stat) => (
                  <div key={stat} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">{shortStatNames[stat]}</div>
                    <div className="text-xl font-black text-gray-800">{evs[stat]}</div>
                    <div className="w-full bg-gray-100 h-1 mt-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(evs[stat] / 252) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <input type="text" value={pokemonName} onChange={(e) => setPokemonName(e.target.value)} placeholder="宝可梦名" className="flex-1 border border-gray-300 rounded-lg py-1.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-24 border border-gray-300 rounded-lg py-1.5 px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer">
                    <option value="">性别: 默认</option>
                    <option value="M">雄性 (M)</option>
                    <option value="F">雌性 (F)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <WinToggle label="包含闪光代码 (Shiny: Yes)" checked={isShiny} onChange={() => setIsShiny(!isShiny)} />
                  <WinToggle label="510 努力值合法化修正" checked={enforceLegal} onChange={() => setEnforceLegal(!enforceLegal)} />
                  <WinToggle label="0 物攻个体值 (防移花接木)" checked={zeroAtk} onChange={() => setZeroAtk(!zeroAtk)} />
                  <WinToggle label="0 速度个体值 (重空间队)" checked={zeroSpe} onChange={() => setZeroSpe(!zeroSpe)} />
                </div>
              </div>
            </div>

            <div className="flex flex-col grow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">预览与导出指令</span>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-md active:scale-95"
                >
                  {copySuccess ? (
                    <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  ) : (
                    <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                  )}
                  {copySuccess ? '复制成功' : '复制指令'}
                </button>
              </div>
              <textarea readOnly value={generateCode()} className="w-full h-32 bg-gray-900 text-gray-300 font-mono text-xs p-4 rounded-xl border border-gray-800 shadow-inner resize-none focus:outline-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}