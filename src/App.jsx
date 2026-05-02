import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMiVvAE9NCjgrWgLoDb4Akr4jWVVpeHrM",
  authDomain: "scoring-db-7c3a7.firebaseapp.com",
  projectId: "scoring-db-7c3a7",
  storageBucket: "scoring-db-7c3a7.firebasestorage.app",
  messagingSenderId: "152493798679",
  appId: "1:152493798679:web:e9ff4211ec18767b2e7352",
  measurementId: "G-H7TXDTSN6F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const pcsCriteria = {
  composition: ["Multidimensional use of space and design of movements", "Connections between and within elements", "Choreography reflecting musical phrase and form", "Pattern and ice coverage", "Unity"],
  presentation: ["Expressiveness & projection", "Variety and contrast of energy and of movements", "Musical sensitivity and timing", "Oneness and awareness of space"],
  skatingSkills: ["Variety of edges, steps, turns, movements and directions", "Clarity of edges, steps, turns, movements and body control", "Balance and glide", "Flow", "Power and speed", "Unison"]
};

const APP_PASSWORD = "carped450"; // 可自行修改為你想要的密碼

export default function App() {
  const initialElements = Array.from({ length: 16 }, (_, i) => ({
    id: i + 1, name: '', goe: null, fall: false, info: ''
  }));

  const fileInputRef = useRef(null);
  const [elements, setElements] = useState(initialElements);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSent, setIsSent] = useState(false);
  const [notification, setNotification] = useState(''); 
  const [isUnlocked, setIsUnlocked] = useState(() => window.localStorage.getItem('scoring_unlock') === 'true');
  const [passwordInput, setPasswordInput] = useState('');

  const [pcs, setPcs] = useState({ composition: '0.00', presentation: '0.00', skatingSkills: '0.00' });
  const [pcsSubScores, setPcsSubScores] = useState({
    composition: Array(pcsCriteria.composition.length).fill(null),
    presentation: Array(pcsCriteria.presentation.length).fill(null),
    skatingSkills: Array(pcsCriteria.skatingSkills.length).fill(null),
  });

  const [isPcsModalOpen, setIsPcsModalOpen] = useState(false);
  const [activePcsCategory, setActivePcsCategory] = useState(null);
  const [tempPcsValue, setTempPcsValue] = useState('0.00');
  const [tempSubScores, setTempSubScores] = useState([]);
  const [activeModalField, setActiveModalField] = useState('overall');
  const [isInputMode, setIsInputMode] = useState(false);
  
  const [videoUrl, setVideoUrl] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [cleanAppUrl, setCleanAppUrl] = useState(''); 

  const [showBlocker, setShowBlocker] = useState(false);
  const [blockerState, setBlockerState] = useState({ x: 100, y: 100, width: 250, height: 100 });
  const dragInfo = useRef({ isDragging: false, isResizing: false, startX: 0, startY: 0, initialX: 0, initialY: 0, initialW: 0, initialH: 0 });

  const [skaterList, setSkaterList] = useState([]);
  const [currentSkaterIndex, setCurrentSkaterIndex] = useState(0);
  const [skaterInfo, setSkaterInfo] = useState({ comp: '', stn: '-', noc: '', name: 'WAITING FOR DATA...' });

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleUnlockApp = () => {
    if (passwordInput === APP_PASSWORD) {
      window.localStorage.setItem('scoring_unlock', 'true');
      setIsUnlocked(true);
      setNotification('✅ 密碼正確，已解鎖應用程式');
    } else {
      setNotification('❌ 密碼錯誤，請重新輸入');
    }
  };

  const handleVideoLoad = () => {
    if (!videoUrl) return;
    let finalUrl = videoUrl;
    let appUrl = '';
    try {
        const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const ytMatch = videoUrl.match(ytRegex);
        if (ytMatch && ytMatch[1]) {
            const videoId = ytMatch[1];
            finalUrl = `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&autoplay=0&rel=0`;
            appUrl = `https://www.youtube.com/watch?v=${videoId}`; 
        } else if (videoUrl.match(/(BV[a-zA-Z0-9]+)/)) {
            finalUrl = `https://player.bilibili.com/player.html?bvid=${videoUrl.match(/(BV[a-zA-Z0-9]+)/)[1]}&autoplay=0`;
        } else if (videoUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)) {
            finalUrl = `https://player.vimeo.com/video/${videoUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)[1]}?autoplay=0`;
        } else {
            const iframeMatch = videoUrl.match(/src="([^"]+)"/);
            if (iframeMatch && iframeMatch[1]) finalUrl = iframeMatch[1];
        }
    } catch (e) { console.warn("URL Error", e); }
    setEmbedUrl(finalUrl);
    setCleanAppUrl(appUrl);
  };

  // Blocker Drag & Resize Logic
  const startDrag = (e) => {
    e.stopPropagation();
    try { e.target.setPointerCapture(e.pointerId); } catch(err){}
    dragInfo.current = { ...dragInfo.current, isDragging: true, isResizing: false, startX: e.clientX, startY: e.clientY, initialX: blockerState.x, initialY: blockerState.y };
  };

  const onDragMove = (e) => {
    if (!dragInfo.current.isDragging) return;
    setBlockerState(prev => ({ ...prev, x: dragInfo.current.initialX + (e.clientX - dragInfo.current.startX), y: dragInfo.current.initialY + (e.clientY - dragInfo.current.startY) }));
  };

  const stopDrag = (e) => { dragInfo.current.isDragging = false; try { e.target.releasePointerCapture(e.pointerId); } catch(err){} };

  const startResize = (e) => {
    e.stopPropagation();
    try { e.target.setPointerCapture(e.pointerId); } catch(err){}
    dragInfo.current = { ...dragInfo.current, isDragging: false, isResizing: true, startX: e.clientX, startY: e.clientY, initialW: blockerState.width, initialH: blockerState.height };
  };

  const onResizeMove = (e) => {
    if (!dragInfo.current.isResizing) return;
    setBlockerState(prev => ({ ...prev, width: Math.max(150, dragInfo.current.initialW + (e.clientX - dragInfo.current.startX)), height: Math.max(60, dragInfo.current.initialH + (e.clientY - dragInfo.current.startY)) }));
  };

  const stopResize = (e) => { dragInfo.current.isResizing = false; try { e.target.releasePointerCapture(e.pointerId); } catch(err){} };

  const submitScoresToBackend = async () => {
    setIsSent(true); 
    const skater_id = skaterInfo.name && skaterInfo.name !== 'WAITING FOR DATA...' ? skaterInfo.name : `Unknown_${skaterInfo.stn || Date.now()}`;

    // 儲存原始 elements 以供後續比對修改痕跡
    const original_elements = elements.map(el => ({ name: el.name, info: el.info }));

    const payload = {
      skater: skaterInfo.name, stn: skaterInfo.stn, noc: skaterInfo.noc, competition: skaterInfo.comp,
      elements: elements,
      original_elements: original_elements, // 保留裁判原始輸入
      pcs: { composition: pcs.composition, presentation: pcs.presentation, skatingSkills: pcs.skatingSkills },
      pcs_criteria: pcsSubScores,
      timestamp: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "scores", skater_id), payload);
      setNotification(`✅ 已成功將 [${skaterInfo.name}] 的成績發送至 Firebase 雲端！`);
    } catch (error) {
      alert(`傳送失敗！\n錯誤訊息: ${error.message}`);
      setIsSent(false); 
    }
  };

  const handleNewProgram = (requireConfirm = true) => {
    if (!requireConfirm || window.confirm("確定要清空所有資料嗎？")) {
      const emptyElements = Array.from({ length: 16 }, (_, i) => ({ id: i + 1, name: '', goe: null, fall: false, info: '' }));
      setElements(emptyElements);
      setActiveIndex(0); 
      setPcs({ composition: '0.00', presentation: '0.00', skatingSkills: '0.00' });
      setPcsSubScores({
        composition: Array(pcsCriteria.composition.length).fill(null),
        presentation: Array(pcsCriteria.presentation.length).fill(null),
        skatingSkills: Array(pcsCriteria.skatingSkills.length).fill(null),
      });
      setIsSent(false);
    }
  };

  const parseCSVLine = (line) => {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current);
    return cols.map(value => {
      const trimmed = value.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1).replace(/""/g, '"');
      }
      return trimmed;
    });
  };

  // 支援解析 CSV 中的 Elements 與 Info
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split(/\r?\n/).filter(line => line.trim() !== '');
      let headerMap = null;
      let dataLines = lines;
      if (lines.length > 0) {
        const firstCols = parseCSVLine(lines[0]).map(value => value.trim().toLowerCase());
        const headerKeywords = ['competition', 'comp', 'event', 'startnumber', 'stn', 'start no', 'start #', 'name', 'skater name', 'noc', 'country', 'nation', 'element1', 'info1'];
        const isHeader = firstCols.some(col => headerKeywords.includes(col));
        if (isHeader) {
          headerMap = firstCols.reduce((map, key, idx) => {
            map[key] = idx;
            return map;
          }, {});
          dataLines = lines.slice(1);
        }
      }

      const getHeaderIndex = (aliases) => {
        if (!headerMap) return -1;
        for (const alias of aliases) {
          const key = alias.toLowerCase();
          if (headerMap[key] !== undefined) return headerMap[key];
        }
        return -1;
      };

      const getElementHeaderIndex = (elementNumber, type) => {
        if (!headerMap) return -1;
        const key = `${type}${elementNumber}`.toLowerCase();
        if (headerMap[key] !== undefined) return headerMap[key];
        const altKey = `${type} ${elementNumber}`.toLowerCase();
        if (headerMap[altKey] !== undefined) return headerMap[altKey];
        return -1;
      };

      const parsedSkaters = dataLines.map(line => {
        const cols = parseCSVLine(line);
        const compIdx = getHeaderIndex(['competition', 'comp', 'event', 'competition name']);
        const stnIdx = getHeaderIndex(['startnumber', 'stn', 'start no', 'start #']);
        const nameIdx = getHeaderIndex(['name', 'skater name', 'skater']);
        const nocIdx = getHeaderIndex(['noc', 'country', 'nation']);

        const skater = {
          comp: compIdx >= 0 ? cols[compIdx] : cols[0] || '',
          stn: stnIdx >= 0 ? cols[stnIdx] : cols[1] || '',
          name: ((nameIdx >= 0 ? cols[nameIdx] : cols[2]) || '').replace(/\//g, ' & '),
          noc: nocIdx >= 0 ? cols[nocIdx] : cols[3] || ''
        };

        const loadedElements = Array.from({ length: 16 }, (_, i) => {
          const number = i + 1;
          const nameColIdx = getElementHeaderIndex(number, 'element');
          const infoColIdx = getElementHeaderIndex(number, 'info');
          return {
            id: number,
            name: nameColIdx >= 0 ? cols[nameColIdx] || '' : cols[4 + i * 2] || '',
            goe: null,
            fall: false,
            info: infoColIdx >= 0 ? cols[infoColIdx] || '' : cols[5 + i * 2] || ''
          };
        });
        skater.elements = loadedElements;
        return skater;
      });

      if (parsedSkaters.length > 0) {
        const firstSkater = parsedSkaters[0];
        setSkaterList(parsedSkaters);
        setCurrentSkaterIndex(0);
        setSkaterInfo(firstSkater);
        handleNewProgram(false);
        setElements(firstSkater.elements || Array.from({ length: 16 }, (_, i) => ({ id: i + 1, name: '', goe: null, fall: false, info: '' })));
        setNotification(`✅ 成功載入 ${parsedSkaters.length} 位選手名單與預設動作！`);
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const handleNextSkater = () => {
    if (skaterList.length === 0) {
      if (isSent) {
        handleNewProgram(false);
        setSkaterInfo(prev => ({ ...prev, stn: '', noc: '', name: '' }));
        setNotification('➡️ 已建立下一位空白表單，可繼續輸入。');
      }
      return;
    }

    if (currentSkaterIndex < skaterList.length - 1) {
      const nextIdx = currentSkaterIndex + 1;
      setCurrentSkaterIndex(nextIdx);
      setSkaterInfo(skaterList[nextIdx]);
      handleNewProgram(false);
      setElements(skaterList[nextIdx].elements || Array.from({ length: 16 }, (_, i) => ({ id: i + 1, name: '', goe: null, fall: false, info: '' })));
    } else {
      if (window.confirm("已經是最後一位選手了！要開啟空白表單嗎？")) {
        setSkaterList([]);
        setSkaterInfo({ comp: skaterInfo.comp, stn: '', noc: '', name: '' });
        handleNewProgram(false);
      }
    }
  };

  const handleGoeClick = (score) => {
    const newElements = [...elements];
    newElements[activeIndex].goe = score;
    setElements(newElements);
    setIsSent(false);
    if (activeIndex < 15) setActiveIndex(activeIndex + 1);
  };

  const appendToName = (str) => {
    const newElements = [...elements];
    let current = newElements[activeIndex].name || '';
    const isJumpStr = /^([1-5]|Th)(T|S|Lo|F|Lz|A)$/.test(str) || /^[1-5](T|S|Lo|F|Lz|A)$/.test(str);
    if (isJumpStr && current.length > 0) {
      if (!current.endsWith('+') && !current.endsWith('+1Eu+') && !current.endsWith('+SEQ') && !current.endsWith('+REP') && !current.endsWith('+COMBO') && !current.endsWith('*')) {
          current += '+';
      }
    }
    newElements[activeIndex].name = current + str;
    setElements(newElements);
    setIsSent(false);
  };

  const clearName = () => {
    const newElements = [...elements];
    newElements[activeIndex].name = '';
    setElements(newElements);
    setIsSent(false);
  };

  const toggleFall = (index, e) => {
    e.stopPropagation();
    const newElements = [...elements];
    newElements[index].fall = !newElements[index].fall;
    setElements(newElements);
    setActiveIndex(index);
    setIsSent(false);
  };

  const openPcsModal = (category) => {
    setActivePcsCategory(category); setTempPcsValue(pcs[category]); setTempSubScores([...pcsSubScores[category]]); setActiveModalField('overall'); setIsPcsModalOpen(true);
  };

  const savePcsModal = () => {
    setPcs(prev => ({ ...prev, [activePcsCategory]: tempPcsValue }));
    setPcsSubScores(prev => ({ ...prev, [activePcsCategory]: tempSubScores }));
    setIsSent(false); setIsPcsModalOpen(false);
  };

  // --- 補回：PCS 彈窗的數字與小數點按鈕邏輯 ---
  const handleModalNumberClick = (num) => {
    const val = `${num}.00`;
    if (activeModalField === 'overall') setTempPcsValue(val);
    else { const newScores = [...tempSubScores]; newScores[activeModalField] = val; setTempSubScores(newScores); }
  };

  const handleModalDecimalClick = (dec) => {
    if (activeModalField === 'overall') { setTempPcsValue(`${tempPcsValue.split('.')[0] || '0'}${dec}`); } else {
      const newScores = [...tempSubScores];
      newScores[activeModalField] = `${(tempSubScores[activeModalField] || '0.00').split('.')[0] || '0'}${dec}`;
      setTempSubScores(newScores);
    }
  };

  const filledScores = tempSubScores.filter(s => s !== null).map(Number);
  const calculatedAvg = filledScores.length > 0 ? (filledScores.reduce((a, b) => a + b, 0) / filledScores.length).toFixed(2) : '--';

  const goeButtons = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

  if (!isUnlocked) {
    return (
      <div className="h-screen w-screen bg-[#070b12] text-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#121925] border border-slate-700 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-3xl font-black text-sky-400 mb-4 text-center">Scoring App 密碼鎖</h1>
          <p className="text-slate-400 mb-6">請輸入密碼以解鎖應用程式。</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUnlockApp(); }}
            className="w-full bg-[#0d1420] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-sky-500 mb-4"
            placeholder="輸入密碼"
          />
          <button
            onClick={handleUnlockApp}
            className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-3 rounded-xl transition-colors"
          >
            解鎖
          </button>
          <p className="mt-4 text-slate-500 text-sm">提示：這是前端簡易密碼保護，建議正式上線時改用後端驗證。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1a1a1a] text-slate-100 font-sans select-none overflow-hidden relative">
      
      {/* 遮罩 (Score Blocker) 渲染區塊 */}
      {showBlocker && (
        <div style={{ position: 'absolute', top: blockerState.y, left: blockerState.x, width: blockerState.width + 'px', height: blockerState.height + 'px', zIndex: 9999 }} className="bg-black border-2 border-slate-500 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col rounded-md overflow-visible relative">
          <div className="bg-slate-800 h-8 w-full cursor-move flex justify-between items-center px-3 shrink-0 select-none border-b border-slate-600 rounded-t-sm touch-none" onPointerDown={startDrag} onPointerMove={onDragMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
            <span className="text-[11px] font-bold text-slate-400 tracking-wider">SCORE BLOCKER (DRAG)</span>
            <button onClick={(e) => {e.stopPropagation(); setShowBlocker(false);}} className="text-slate-400 hover:text-red-500 font-bold text-sm bg-slate-700/50 hover:bg-slate-700 w-6 h-6 flex items-center justify-center rounded">✕</button>
          </div>
          <div className="flex-1 bg-black w-full h-full"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize flex items-end justify-end p-1 touch-none" onPointerDown={startResize} onPointerMove={onResizeMove} onPointerUp={stopResize} onPointerCancel={stopResize}>
             <div className="w-4 h-4 opacity-50 relative pointer-events-none">
                 <div className="absolute right-0 bottom-0 w-full h-[2px] bg-white transform -rotate-45 translate-x-1 translate-y-[-2px]"></div>
                 <div className="absolute right-0 bottom-0 w-3/4 h-[2px] bg-white transform -rotate-45 translate-x-[2px] translate-y-[-6px]"></div>
                 <div className="absolute right-0 bottom-0 w-1/2 h-[2px] bg-white transform -rotate-45 translate-x-[3px] translate-y-[-10px]"></div>
             </div>
          </div>
        </div>
      )}

      {notification && <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded shadow-2xl z-[100] font-bold text-lg border-2 border-green-400 animate-bounce">{notification}</div>}

      <div className="h-16 bg-[#2b3036] border-b border-black flex items-center px-2 text-sm font-bold shrink-0">
        <div className="text-green-500 px-3 tracking-widest text-lg">MAIN</div>
        <div className="bg-green-700 text-white px-4 py-1.5 rounded-sm shadow-inner ml-2 text-lg">JUDGE</div>
        
        <div className="ml-4 flex flex-col justify-center leading-tight border-l border-slate-600 pl-4">
          <input type="text" value={skaterInfo.comp} onChange={e => setSkaterInfo({...skaterInfo, comp: e.target.value})} className="bg-transparent text-white text-base outline-none hover:bg-slate-700 px-1 rounded w-[300px]" placeholder="Competition Name" />
          <div className="flex items-center text-yellow-400 text-sm mt-0.5 tracking-wide">
            <span className="mr-1">#</span>
            <input type="text" value={skaterInfo.stn} onChange={e => setSkaterInfo({...skaterInfo, stn: e.target.value})} className="bg-transparent outline-none hover:bg-slate-700 px-1 w-8 rounded text-center" />
            <span className="mx-1">|</span>
            <input type="text" value={skaterInfo.noc} onChange={e => setSkaterInfo({...skaterInfo, noc: e.target.value})} className="bg-transparent outline-none hover:bg-slate-700 px-1 w-12 rounded text-center" />
            <span className="mx-1">|</span>
            <input type="text" value={skaterInfo.name} onChange={e => setSkaterInfo({...skaterInfo, name: e.target.value.replace(/\//g, ' & ')})} className="bg-transparent outline-none hover:bg-slate-700 px-1 w-[200px] rounded font-bold" placeholder="Skater Name" />
          </div>
        </div>
        <div className="flex-1"></div>
        <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
        
        <button onClick={() => setShowBlocker(!showBlocker)} className="text-slate-300 px-4 py-2 hover:bg-slate-700 border border-slate-600 rounded bg-slate-800 mr-2 flex items-center gap-2"><span className="text-lg leading-none">⬛</span> BLOCKER</button>
        <button onClick={() => fileInputRef.current.click()} className="text-slate-300 px-4 py-2 hover:bg-slate-700 border border-slate-600 rounded bg-slate-800 mr-2 flex items-center gap-2"><span className="text-lg leading-none">📋</span> IMPORT</button>
        <button onClick={() => handleNewProgram(true)} className="text-slate-300 px-4 py-2 hover:bg-slate-700 border border-slate-600 rounded bg-slate-800 mr-2 flex items-center gap-2"><span className="text-lg leading-none">📄</span> NEW</button>
        <button onClick={() => setIsInputMode(!isInputMode)} className={`px-5 py-2 border rounded mr-2 flex items-center gap-2 font-bold shadow-md transition-colors ${isInputMode ? 'bg-[#990000] border-[#cc0000]' : 'bg-[#0b5394] border-[#1e768f]'}`}>
          {isInputMode ? '📺 VIDEO' : '⌨️ INPUT'}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[380px] bg-[#0c3e4e] border-r-2 border-black flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-[36px_1fr_40px_36px_36px] text-slate-300 font-semibold h-full">
              {elements.map((el, index) => (
                <React.Fragment key={el.id}>
                  <div onClick={() => setActiveIndex(index)} className={`flex items-center justify-center border-b border-r border-[#1a5b6e] text-sm cursor-pointer ${activeIndex === index ? 'bg-[#1e768f] text-white' : ''}`}>{String(index + 1).padStart(2, '0')}</div>
                  <div onClick={() => setActiveIndex(index)} className={`flex items-center px-2 border-b border-r border-[#1a5b6e] text-base cursor-pointer ${activeIndex === index ? 'bg-[#1e768f] text-white font-bold' : ''}`}>
                    <input type="text" value={el.name} readOnly className="w-full bg-transparent outline-none placeholder:text-slate-500/50 cursor-pointer" placeholder="-" />
                  </div>
                  <div onClick={() => setActiveIndex(index)} className={`flex items-center justify-center border-b border-r border-slate-300 cursor-pointer font-bold text-lg ${el.goe !== null ? 'bg-white text-black' : 'bg-[#e0e0e0] text-transparent'}`}>{el.goe !== null ? el.goe : '-'}</div>
                  <div onClick={(e) => toggleFall(index, e)} className="flex items-center justify-center border-b border-r border-[#1a5b6e] cursor-pointer hover:bg-slate-700/50">
                    {el.fall && <span className="text-red-500 font-black text-xl leading-none">F</span>}
                  </div>
                  <div onClick={() => setActiveIndex(index)} className="flex items-center justify-center border-b border-[#1a5b6e] text-yellow-400 font-mono">
                    <input type="text" value={el.info} readOnly className="w-full text-center bg-transparent outline-none cursor-not-allowed text-slate-300" />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
          
          <div className={`flex-1 overflow-y-auto bg-[#141414] p-4 flex-col gap-4 ${isInputMode ? 'flex' : 'hidden'}`}>
            <div className="flex justify-between items-center bg-[#222] p-2 rounded border border-slate-700 sticky top-0 z-10 shadow-md shrink-0 mb-2">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-bold tracking-wider uppercase text-sm">Row {String(activeIndex + 1).padStart(2, '0')}</span>
                <div className="text-xl font-mono text-white font-bold bg-black px-4 py-1.5 rounded min-w-[150px] min-h-[40px] flex items-center shadow-inner border border-slate-800">
                  {elements[activeIndex].name}<span className="w-2 h-5 bg-blue-500 animate-pulse ml-1"></span>
                </div>
              </div>
              <button onClick={clearName} className="px-6 py-2 bg-[#7a3333] hover:bg-[#990000] text-white font-bold rounded border border-[#542121] transition-colors shadow-sm tracking-wider">CLEAR</button>
            </div>

            {/* 新版左右佈局 */}
            <div className="flex flex-row gap-6 pb-4">
              
              {/* 左側：跳躍、旋轉、步伐 */}
              <div className="w-[450px] flex flex-col gap-5">
                <div>
                  <h4 className="text-yellow-400 font-bold mb-1 uppercase tracking-wider text-xs">Jumps / Throw Jumps</h4>
                  <div className="grid grid-cols-[35px_repeat(5,1fr)_85px] gap-1">
                    {[
                      { label: 'T', btns: ['1', '2', '3', '4', '5'], mod: '*' },
                      { label: 'S', btns: ['1', '2', '3', '4', '5'], mod: '+' },
                      { label: 'Lo', btns: ['1', '2', '3', '4', '5'], mod: '+COMBO' },
                      { label: 'F', btns: ['1', '2', '3', '4', '5'], mod: '+SEQ' },
                      { label: 'Lz', btns: ['1', '2', '3', '4', '5'], mod: '+REP' },
                      { label: 'A', btns: ['1', '2', '3', '4', 'Th'], mod: '+1Eu' },
                    ].map(row => (
                      <React.Fragment key={row.label}>
                        <button onClick={() => appendToName(row.label)} className="bg-[#2b3036] hover:bg-slate-600 flex items-center justify-center font-bold text-slate-300 border border-slate-700 rounded-sm text-lg active:scale-95 py-2">{row.label}</button>
                        {row.btns.map((btn, idx) => {
                          let val = btn === 'Th' ? 'Th' : `${btn}${row.label}`;
                          let btnClass = btn === 'Th' ? "bg-[#6a327a] text-white py-2 border border-[#522561] text-lg font-bold rounded-sm shadow-sm active:bg-[#4d235c]" : "bg-[#0c3e4e] text-white py-2 border border-[#1a5b6e] text-lg font-bold rounded-sm shadow-sm active:bg-blue-600";
                          return <button key={val} onClick={() => appendToName(val)} className={btnClass}>{btn}</button>
                        })}
                        <button onClick={() => appendToName(row.mod)} className="bg-[#2b5433] text-white py-2 border border-[#3f7a4a] text-lg font-bold rounded-sm shadow-sm active:bg-green-600">{row.mod}</button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-yellow-400 font-bold mb-1 uppercase tracking-wider text-xs">Spins</h4>
                  <div className="grid grid-cols-[repeat(6,1fr)] gap-1 mb-1">
                    {['F', 'C', 'P', 'Sp', null, '*'].map(mod => mod ? (<button key={mod} onClick={() => appendToName(mod)} className="bg-slate-700 text-white py-2 border border-slate-500 text-lg font-bold rounded-sm">{mod}</button>) : <div key="empty"></div>)}
                  </div>
                  <div className="grid grid-cols-[repeat(6,1fr)] gap-1">
                    {['CSp', 'SSp', 'USp', 'LSp', 'CoSp', 'ChSp'].map(base => (<button key={base} onClick={() => appendToName(base)} className={`text-white py-2 border text-lg font-bold rounded-sm ${base === 'ChSp' ? 'bg-[#b45f06] border-orange-500 hover:bg-orange-600' : 'bg-[#0c3e4e] border-[#1a5b6e] hover:bg-blue-600'}`}>{base}</button>))}
                  </div>
                </div>

                <div>
                  <h4 className="text-yellow-400 font-bold mb-1 uppercase tracking-wider text-xs">Sequences</h4>
                  <div className="flex gap-1">
                    {['StSq', 'ChSq'].map(seq => (<button key={seq} onClick={() => appendToName(seq)} className="flex-1 bg-[#0c3e4e] text-white py-2 border border-[#1a5b6e] text-lg font-bold rounded-sm">{seq}</button>))}
                  </div>
                </div>
              </div>

              {/* 右側：雙人/冰舞動作 */}
              <div className="flex-1 flex flex-col gap-5 border-l border-slate-700 pl-6">
                <div>
                  <h4 className="text-yellow-400 font-bold mb-1 uppercase tracking-wider text-xs">Twist Lifts</h4>
                  <div className="grid grid-cols-6 gap-1">
                    {['Tw', '1', '2', '3', '4', '*'].map(tw => {
                      const val = tw === 'Tw' || tw === '*' ? tw : `${tw}Tw`;
                      return <button key={tw} onClick={() => appendToName(val)} className="bg-[#0c3e4e] text-white py-2 border border-[#1a5b6e] text-lg font-bold rounded-sm hover:bg-blue-600">{tw}</button>;
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-yellow-400 font-bold mb-1 uppercase tracking-wider text-xs">Lifts</h4>
                  <div className="grid grid-cols-6 gap-1 mb-1">
                    {['Li', '1', '2', '3', '4', '*'].map(lift => {
                      const val = lift === 'Li' || lift === '*' ? lift : `${lift}Li`;
                      return <button key={lift} onClick={() => appendToName(val)} className="bg-[#0c3e4e] text-white py-2 border border-[#1a5b6e] text-lg font-bold rounded-sm hover:bg-blue-600">{lift}</button>;
                    })}
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {['5SLi', '5TLi', '5BLi', '5RLi', '5ALi', 'ChLi'].map(lift => (<button key={lift} onClick={() => appendToName(lift)} className={`text-white py-2 border text-lg font-bold rounded-sm ${lift === 'ChLi' ? 'bg-[#b45f06] border-orange-500 hover:bg-orange-600' : 'bg-[#0c3e4e] border-[#1a5b6e] hover:bg-blue-600'}`}>{lift}</button>))}
                  </div>
                </div>

                <div>
                  <h4 className="text-yellow-400 font-bold mb-1 uppercase tracking-wider text-xs">Death Spirals</h4>
                  <div className="grid grid-cols-6 gap-1">
                    {['Ds', 'BoDs', 'BiDs', 'FoDs', 'FiDs', '*'].map(ds => (<button key={ds} onClick={() => appendToName(ds)} className="bg-[#0c3e4e] text-white py-2 border border-[#1a5b6e] text-lg font-bold rounded-sm hover:bg-blue-600">{ds}</button>))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 影片輸入與預覽區塊 */}
          <div className={`flex-1 flex-col bg-black relative ${!isInputMode ? 'flex' : 'hidden'}`}>
            {!embedUrl ? (
               <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="text-7xl font-black text-slate-700 tracking-widest opacity-40 mb-8">VIDEO</div>
                  <div className="w-full max-w-lg bg-[#222] p-6 rounded-lg border border-slate-700 shadow-2xl">
                      <label className="block text-yellow-400 font-bold mb-2 uppercase tracking-wider text-sm">Embed Video Source</label>
                      <div className="flex gap-2">
                         <input 
                            type="text" 
                            value={videoUrl} 
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="輸入 URL (如 YouTube, mp4, 區網攝影機等)" 
                            className="flex-1 bg-black border border-slate-600 text-white px-4 py-3 rounded outline-none focus:border-blue-500"
                         />
                         <button onClick={handleVideoLoad} className="bg-blue-700 hover:bg-blue-600 text-white font-bold px-6 py-3 rounded transition-colors">
                            LOAD
                         </button>
                      </div>
                      <p className="text-slate-500 text-xs mt-3">支援 YouTube, 本機端 mp4 檔案網址，以及區域網路串流 (如 http://192.168...:8080/video)。</p>
                  </div>
               </div>
            ) : (
               <div className="w-full h-full relative group">
                  {embedUrl.match(/\.(jpeg|jpg|gif|png)$/i) || embedUrl.includes(':8080/video') ? (
                     <img src={embedUrl} className="w-full h-full object-contain bg-black" alt="Live Stream" />
                  ) : embedUrl.endsWith('.mp4') ? (
                     <video src={embedUrl} controls autoPlay className="w-full h-full object-contain bg-black"></video>
                  ) : (
                     <iframe 
                        src={embedUrl} 
                        title="Video Player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen 
                        className="w-full h-full border-none bg-black">
                     </iframe>
                  )}
                  
                  <div className="absolute top-4 left-4 flex gap-2 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEmbedUrl('')} className="bg-black/80 text-white px-4 py-2 rounded border border-slate-600 hover:bg-red-800 transition-colors font-bold text-sm">
                       ✕ CLOSE
                    </button>
                    {cleanAppUrl && (
                        <a href={cleanAppUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600/90 text-white px-4 py-2 rounded border border-blue-400 hover:bg-blue-500 transition-colors font-bold text-sm flex items-center gap-1 shadow-lg">
                            <span>↗</span> OPEN APP
                        </a>
                    )}
                  </div>
               </div>
            )}
            
            <div className="absolute top-4 right-6 bg-black/70 px-4 py-2 rounded text-blue-400 font-bold border border-slate-700 shadow-md pointer-events-none z-10">
              Current: Row {activeIndex + 1}
            </div>
          </div>

          <div className="h-16 flex bg-[#1a1a1a] p-1 gap-1 shrink-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
            {goeButtons.map((btn) => {
              const isSelected = elements[activeIndex].goe === btn;
              let btnClass;
              if (btn < 0) {
                btnClass = isSelected ? "bg-[#e0a8a8] text-[#542121] border-[#7a3333] hover:bg-[#f0b8b8]" : "bg-[#542121] text-[#e0a8a8] border-[#7a3333] hover:bg-[#6e2b2b]";
              } else if (btn === 0) {
                btnClass = isSelected ? "bg-[#e8d99e] text-[#756627] border-[#9c8936] hover:bg-[#f0e1a8]" : "bg-[#756627] text-[#e8d99e] border-[#9c8936] hover:bg-[#8f7d31]";
              } else {
                btnClass = isSelected ? "bg-[#a8e0b6] text-[#2b5433] border-[#3f7a4a] hover:bg-[#b8e8c0]" : "bg-[#2b5433] text-[#a8e0b6] border-[#3f7a4a] hover:bg-[#386e42]";
              }
              return <button key={`goe-${btn}`} onClick={() => handleGoeClick(btn)} className={`flex-1 flex items-center justify-center text-3xl font-medium border-2 rounded-sm active:scale-95 ${btnClass}`}>{btn > 0 ? `+${btn}` : btn}</button>;
            })}
          </div>

          <div className="h-24 flex bg-[#2a2a2a] p-1 gap-2 shrink-0 items-center justify-between">
            <div className="flex gap-2 h-full py-1">
              {['composition', 'presentation', 'skatingSkills'].map((key) => {
                const config = { composition: { bg: '#0b5394', label: 'COMPOSITION' }, presentation: { bg: '#990000', label: 'PRESENTATION' }, skatingSkills: { bg: '#b45f06', label: 'SKATING SKILLS' } }[key];
                return (
                  <div key={key} className="flex h-full border border-slate-600 shadow-sm rounded-sm overflow-hidden cursor-pointer active:scale-95 transition-transform" onClick={() => openPcsModal(key)}>
                    <div style={{ backgroundColor: config.bg }} className="text-white px-3 flex items-center font-bold text-sm writing-vertical">{config.label}</div>
                    <div style={{ color: config.bg }} className="w-24 bg-white flex items-center justify-center font-bold text-3xl outline-none">{pcs[key]}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center h-[90%] gap-1 mr-1">
              <button onClick={submitScoresToBackend} className={`h-full px-6 flex flex-col items-center justify-center font-bold text-sm rounded-sm border-2 transition-colors ${isSent ? 'bg-[#3b6b3b] text-white border-[#549954]' : 'bg-slate-600 text-slate-300 border-slate-500 hover:bg-green-700 hover:text-white hover:border-green-500'}`}>
                <span className="text-xl leading-none mb-1">{isSent ? '☑' : '☐'}</span>{isSent ? 'MARKS SENT' : 'SEND MARKS'}
              </button>
              <button onClick={handleNextSkater} className="h-full px-6 flex flex-col items-center justify-center font-bold text-sm rounded-sm border-2 bg-[#0b5394] text-white border-[#1e768f] hover:bg-[#093e6e] transition-colors">
                <span className="text-xl leading-none mb-1">⏭</span>NEXT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- 補回：PCS 彈出視窗 (Modal) --- */}
      {isPcsModalOpen && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-slate-600 rounded-lg shadow-2xl w-[1000px] h-[600px] flex flex-col overflow-hidden">
            
            <div className={`px-6 py-4 font-black text-2xl tracking-widest text-white border-b border-black flex justify-between items-center
              ${activePcsCategory === 'composition' ? 'bg-[#0b5394]' : activePcsCategory === 'presentation' ? 'bg-[#990000]' : 'bg-[#b45f06]'}
            `}>
              <span className="uppercase">{activePcsCategory.replace(/([A-Z])/g, ' $1').trim()} SCORING</span>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/2 p-6 border-r border-slate-700 bg-[#222] flex flex-col">
                <h3 className="text-yellow-400 font-bold mb-3 uppercase tracking-wide border-b border-slate-600 pb-2 flex justify-between">
                  <span>ISU Criteria</span>
                  <span className="text-slate-400">Score</span>
                </h3>
                
                <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                  <div onClick={() => setActiveModalField('overall')} className={`p-3 rounded border-2 cursor-pointer flex justify-between items-center transition-colors mb-4 shadow-md ${activeModalField === 'overall' ? 'bg-[#0b5394] border-[#4fa3e3]' : 'bg-[#333] border-slate-600 hover:bg-[#444]'}`}>
                    <span className="font-black text-white tracking-widest uppercase">Overall Score</span>
                    <span className={`text-2xl font-mono px-3 py-1 rounded bg-black/50 ${activeModalField === 'overall' ? 'text-white' : 'text-slate-300'}`}>{tempPcsValue}</span>
                  </div>

                  {pcsCriteria[activePcsCategory].map((criterion, idx) => (
                    <div key={idx} onClick={() => setActiveModalField(idx)} className={`p-3 rounded border cursor-pointer flex justify-between items-center transition-colors ${activeModalField === idx ? 'bg-slate-700 border-yellow-500' : 'bg-[#2a2a2a] border-slate-700 hover:bg-[#333]'}`}>
                      <span className="text-slate-300 text-sm leading-snug w-[75%] pr-2">{criterion}</span>
                      <span className={`text-xl font-mono px-3 py-1 rounded text-center min-w-[70px] ${tempSubScores[idx] !== null ? 'bg-slate-900 text-yellow-400' : 'bg-slate-800 text-slate-500'}`}>{tempSubScores[idx] !== null ? tempSubScores[idx] : '-.--'}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-black/50 border border-slate-700 rounded flex justify-between items-center text-slate-400">
                  <span className="text-sm font-bold uppercase tracking-wider">Calculated Avg.</span>
                  <span className="text-2xl font-mono text-blue-400">{calculatedAvg}</span>
                </div>
              </div>

              <div className="w-1/2 p-6 bg-[#111] flex flex-col justify-center gap-6 relative">
                <div className="absolute top-4 right-6 text-slate-500 font-mono text-sm">Editing: {activeModalField === 'overall' ? 'OVERALL' : `Criterion #${activeModalField + 1}`}</div>
                
                <div className="flex justify-center gap-4">
                  {['.25', '.50', '.75', '.00'].map(dec => (<button key={dec} onClick={() => handleModalDecimalClick(dec)} className="flex-1 py-4 bg-slate-800 text-blue-300 text-2xl font-bold rounded hover:bg-slate-700 border border-slate-600 active:bg-blue-900 transition-colors">{dec}</button>))}
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex justify-between gap-2">
                    {[0, 1, 2, 3, 4, 5].map(num => (<button key={num} onClick={() => handleModalNumberClick(num)} className="flex-1 py-4 bg-[#2b3036] text-white text-3xl font-bold rounded hover:bg-[#3b424a] border border-black active:bg-slate-600 transition-colors">{num}</button>))}
                  </div>
                  <div className="flex justify-between gap-2">
                    {[6, 7, 8, 9, 10].map(num => (<button key={num} onClick={() => handleModalNumberClick(num)} className="flex-1 py-4 bg-[#2b3036] text-white text-3xl font-bold rounded hover:bg-[#3b424a] border border-black active:bg-slate-600 transition-colors">{num}</button>))}
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsPcsModalOpen(false)} className="flex-1 py-4 bg-red-900 text-white font-bold tracking-widest rounded hover:bg-red-800 transition-colors">CANCEL</button>
                  <button onClick={savePcsModal} className="flex-1 py-4 bg-green-700 text-white font-bold text-xl tracking-widest rounded hover:bg-green-600 transition-colors shadow-lg">SAVE SCORES</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
