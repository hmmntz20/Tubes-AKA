"use client";

import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler 
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
); 

type RunResult = {
  id: number;
  type: 'Recursive' | 'Iterative';
  time: number;
  status: 'Success' | 'Crash';
  gridSize: string;
  trialNumber: number;
};

export default function FloodFillSession() {
  const [rows, setRows] = useState(25);
  const [cols, setCols] = useState(25);
  const [density, setDensity] = useState(0);
  const [speed, setSpeed] = useState(0);
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [grid, setGrid] = useState<number[][]>([]);     
  const [baseGrid, setBaseGrid] = useState<number[][]>([]); 
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<Omit<RunResult, 'trialNumber'> | null>(null);
  
  const [reportHistory, setReportHistory] = useState<RunResult[]>([]);

  useEffect(() => {
    if (!isSessionActive) generatePreviewGrid();
  }, [rows, cols, density]);

  const generatePreviewGrid = () => {
    const newGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 && c === 0) continue;
        if (Math.random() < density) newGrid[r][c] = 1;
      }
    }
    setGrid(newGrid);
  };

  const startNewSession = () => {
    const currentLayout = JSON.parse(JSON.stringify(grid));
    setBaseGrid(currentLayout); 
    setReportHistory([]); 
    setCurrentResult(null);
    setIsSessionActive(true);
  };

  const endSession = () => {
    setIsSessionActive(false);
    setCurrentResult(null);
    setGrid(JSON.parse(JSON.stringify(baseGrid)));
  };

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const runAlgorithm = async (type: 'Recursive' | 'Iterative') => {
    if (isRunning) return;
    setIsRunning(true);
    setCurrentResult(null);

    const workingGrid = JSON.parse(JSON.stringify(baseGrid));
    setGrid(workingGrid); 
    
    await sleep(200); 

    const startTime = performance.now();
    let success = true;

    try {
        if (type === 'Recursive') await runRecursive(workingGrid);
        else await runIterative(workingGrid);
    } catch (error) {
        success = false;
    }

    const endTime = performance.now();
    setCurrentResult({
        id: Date.now(),
        type: type,
        time: endTime - startTime,
        status: success ? 'Success' : 'Crash',
        gridSize: `${rows}x${cols}`
    });

    setIsRunning(false);
  };

  const runRecursive = async (g: number[][]) => {
    const targetColor = 0;
    const fill = 2; 
    const dfs = async (r: number, c: number) => {
        if (r<0 || r>=rows || c<0 || c>=cols || g[r][c] !== targetColor) return;
        g[r][c] = fill;
        if (speed > 0) { setGrid([...g]); await sleep(speed); }
        await dfs(r+1, c); await dfs(r-1, c); await dfs(r, c+1); await dfs(r, c-1);
    };
    await dfs(0, 0);
  };

  const runIterative = async (g: number[][]) => {
    const targetColor = 0;
    const fill = 3; 
    const queue = [{r:0, c:0}];
    if (g[0][0] !== targetColor) return;
    g[0][0] = fill;

    while(queue.length > 0) {
        const {r, c} = queue.shift()!;
        if (speed > 0) { setGrid([...g]); await sleep(speed); }
        const dirs = [[r+1,c], [r-1,c], [r,c+1], [r,c-1]];
        for(const [nr, nc] of dirs) {
            if(nr>=0 && nr<rows && nc>=0 && nc<cols && g[nr][nc] === targetColor) {
                g[nr][nc] = fill;
                queue.push({r:nr, c:nc});
            }
        }
    }
  };

  
  const addToReport = () => {
    if (currentResult) {
        const existingCount = reportHistory.filter(r => r.type === currentResult.type).length;
        const newEntry: RunResult = { ...currentResult, trialNumber: existingCount + 1 };
        setReportHistory(prev => [...prev, newEntry]);
        setCurrentResult(null); 
        
        setGrid(JSON.parse(JSON.stringify(baseGrid)));
    }
  };

  const recResults = reportHistory.filter(r => r.type === 'Recursive' && r.status === 'Success');
  const iterResults = reportHistory.filter(r => r.type === 'Iterative' && r.status === 'Success');
  
  const avgRecursive = recResults.length > 0 
    ? (recResults.reduce((acc, curr) => acc + curr.time, 0) / recResults.length).toFixed(2) 
    : "0.00";
    
  const avgIterative = iterResults.length > 0 
    ? (iterResults.reduce((acc, curr) => acc + curr.time, 0) / iterResults.length).toFixed(2) 
    : "0.00";

  const recData = reportHistory.filter(r => r.type === 'Recursive');
  const iterData = reportHistory.filter(r => r.type === 'Iterative');
  const maxTrials = Math.max(recData.length, iterData.length);
  const labels = Array.from({length: maxTrials}, (_, i) => `Test ${i + 1}`);

  const getChartPoints = (sourceData: RunResult[]) => {
      return Array.from({length: maxTrials}, (_, i) => {
          const found = sourceData.find(r => r.trialNumber === i + 1);
          if (!found) return null;
          return found.status === 'Crash' ? 0 : found.time;
      });
  };

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Rekursif (DFS)',
        data: getChartPoints(recData),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#fff',
        pointRadius: 6,
        tension: 0.3,
        fill: true,
        spanGaps: true
      },
      {
        label: 'Iteratif (BFS)',
        data: getChartPoints(iterData),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointRadius: 6,
        tension: 0.3,
        fill: true,
        spanGaps: true
      }
    ]
  };

  const sortedHistory = [...reportHistory].sort((a, b) => {
      if (a.trialNumber === b.trialNumber) return a.type === 'Recursive' ? -1 : 1;
      return a.trialNumber - b.trialNumber;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                
                    <p className="text-xs text-gray-500 font-medium">Flood Fill Complexity Analysis</p>
            </div>
            
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border ${isSessionActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                <span className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
                {isSessionActive ? 'SESI AKTIF' : 'SETUP MODE'}
            </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-3 space-y-6">
            <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-300 ${!isSessionActive ? 'ring-2 ring-indigo-100' : 'opacity-80 grayscale-[0.5]'}`}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
                    <h2 className="font-bold text-gray-700 text-sm tracking-wide uppercase">1. Configuration</h2>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Grid Size</label>
                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                            <input type="number" disabled={isSessionActive} value={rows} onChange={e=>setRows(Number(e.target.value))} 
                                   className="w-full bg-transparent text-center font-bold text-gray-700 outline-none py-1"/>
                            <span className="text-gray-400 font-bold">×</span>
                            <input type="number" disabled={isSessionActive} value={cols} onChange={e=>setCols(Number(e.target.value))} 
                                   className="w-full bg-transparent text-center font-bold text-gray-700 outline-none py-1"/>
                        </div>
                    </div>

                    <div>
                         <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Density</label>
                            <span className="text-xs font-bold text-indigo-600">{Math.round(density*100)}%</span>
                        </div>
                        <input type="range" disabled={isSessionActive} min="0" max="0.5" step="0.1" value={density} onChange={e=>setDensity(Number(e.target.value))} 
                               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                    </div>

                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Anim Speed</label>
                            <span className="text-xs font-bold text-indigo-600">{speed}ms</span>
                        </div>
                        <input type="range" disabled={isSessionActive} min="0" max="100" step="10" value={speed} onChange={e=>setSpeed(Number(e.target.value))} 
                               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                    </div>
                </div>

                {!isSessionActive ? (
                    <button onClick={startNewSession} 
                        className="w-full mt-6 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg shadow-gray-300 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
                        Start Session
                    </button>
                ) : (
                    <div className="mt-6 text-center text-xs text-gray-400 italic font-medium bg-gray-50 py-2 rounded border border-gray-100">
                        Config Locked
                    </div>
                )}
            </div>

            {isSessionActive && (
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-indigo-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                        <h2 className="font-bold text-gray-700 text-sm tracking-wide uppercase">2. Execution</h2>
                    </div>

                    <div className="space-y-3">
                        <button onClick={() => runAlgorithm('Recursive')} disabled={isRunning}
                            className="group w-full relative overflow-hidden bg-gradient-to-r from-violet-500 to-indigo-600 text-white p-3 rounded-xl shadow-md hover:shadow-indigo-200 transition-all hover:scale-[1.02] disabled:opacity-50">
                            <div className="relative z-10 flex justify-between items-center">
                                <span className="font-bold text-sm">Visual Rekursif</span>
                                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">DFS</span>
                            </div>
                        </button>

                        <button onClick={() => runAlgorithm('Iterative')} disabled={isRunning}
                            className="group w-full relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-3 rounded-xl shadow-md hover:shadow-teal-200 transition-all hover:scale-[1.02] disabled:opacity-50">
                            <div className="relative z-10 flex justify-between items-center">
                                <span className="font-bold text-sm">Visual Iteratif</span>
                                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">BFS</span>
                            </div>
                        </button>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <button onClick={endSession} disabled={isRunning}
                            className="w-full py-2 text-rose-500 font-bold text-xs hover:bg-rose-50 rounded-lg transition-colors">
                            Exit Session
                        </button>
                    </div>
                </div>
            )}
        </div>

        <div className="lg:col-span-5 flex flex-col">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-grow flex flex-col overflow-hidden h-[600px]">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Viewport</h3>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-800"></div><span className="text-[10px] text-gray-500">Wall</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-violet-500"></div><span className="text-[10px] text-gray-500">Rec</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[10px] text-gray-500">Iter</span></div>
                    </div>
                </div>
                
                <div className="flex-grow bg-gray-100 p-4 overflow-auto flex items-center justify-center relative">
                    <div 
                        className="grid gap-[1px] bg-white p-1 shadow-2xl shadow-gray-300 border border-gray-300"
                        style={{ gridTemplateColumns: `repeat(${cols}, minmax(10px, 20px))` }}
                    >
                        {grid.map((row, r) => row.map((cell, c) => (
                            <div 
                                key={`${r}-${c}`} 
                                className={`aspect-square transition-colors duration-200 ${
                                    cell === 1 ? 'bg-gray-800' : 
                                    cell === 2 ? 'bg-violet-500' : 
                                    cell === 3 ? 'bg-emerald-500' : 'bg-gray-50 hover:bg-gray-100'
                                }`} 
                            />
                        )))}
                    </div>
                </div>
             </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
            {currentResult && (
                <div className="relative overflow-hidden bg-white rounded-2xl shadow-xl border-2 border-indigo-500 animate-in zoom-in-95 duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <div className="p-6 text-center">
                        <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Result Captured</h3>
                        
                        <div className="flex justify-center items-end gap-1 mb-4">
                             <span className="text-4xl font-black text-gray-900 tracking-tight">
                                {currentResult.time.toFixed(1)}
                             </span>
                             <span className="text-lg font-medium text-gray-400 mb-1">ms</span>
                        </div>

                        <div className="flex justify-center gap-2 mb-6">
                             <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentResult.type === 'Recursive' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {currentResult.type}
                             </span>
                             {currentResult.status === 'Crash' && (
                                 <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                                     Stack Overflow
                                 </span>
                             )}
                        </div>

                        <button onClick={addToReport} 
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]">
                            Add to Report Graph
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[400px]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-pink-500 rounded-full"></div>
                        <h2 className="font-bold text-gray-700 text-sm tracking-wide uppercase">Performance Report</h2>
                    </div>
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                        {reportHistory.length} Points
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 border-b border-gray-100">
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-[10px] font-bold text-violet-500 uppercase">Avg Recursive</p>
                        <p className="text-lg font-black text-gray-800">{avgRecursive}<span className="text-xs font-normal text-gray-400 ml-1">ms</span></p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase">Avg Iterative</p>
                        <p className="text-lg font-black text-gray-800">{avgIterative}<span className="text-xs font-normal text-gray-400 ml-1">ms</span></p>
                    </div>
                </div>

                <div className="h-48 w-full p-4">
                    <Line 
                        data={chartData} 
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: { 
                                    backgroundColor: '#1f2937', 
                                    padding: 10,
                                    cornerRadius: 8,
                                    titleFont: { size: 13 },
                                    bodyFont: { size: 12 }
                                }
                            },
                            scales: {
                                y: { 
                                    grid: { color: '#f3f4f6' },
                                    ticks: { font: {size: 10}, color: '#9ca3af' },
                                    beginAtZero: true 
                                },
                                x: { 
                                    grid: { display: false },
                                    ticks: { font: {size: 10}, color: '#9ca3af' }
                                }
                            }
                        }} 
                    />
                </div>

                <div className="flex-grow overflow-auto bg-gray-50 border-t border-gray-100">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white sticky top-0">
                            <tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                <th className="px-4 py-2 font-medium">Trial</th>
                                <th className="px-4 py-2 font-medium">Algo</th>
                                <th className="px-4 py-2 font-medium text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {sortedHistory.map((h, i) => (
                                <tr key={i} className="border-b border-gray-100 hover:bg-white transition-colors group">
                                    <td className="px-4 py-2 font-bold text-gray-500 group-hover:text-gray-800">#{h.trialNumber}</td>
                                    <td className="px-4 py-2 font-medium">
                                        <span className={h.type==='Recursive'?'text-violet-600':'text-emerald-600'}>
                                            {h.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-gray-600">
                                        {h.status==='Crash' ? <span className="text-rose-500 font-bold">CRASH</span> : `${h.time.toFixed(1)}ms`}
                                    </td>
                                </tr>
                            ))}
                            {sortedHistory.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-8 text-center text-gray-400 italic text-xs">
                                        No data recorded yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}