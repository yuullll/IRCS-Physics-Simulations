'use client';

import React, { useRef, useEffect } from 'react';
import { Activity, Maximize2, Minimize2 } from 'lucide-react';

export interface DataPoint {
  t: number;
  val1: number; // e.g., Kinetic Energy K or Voltage V
  val2: number; // e.g., Potential Energy U or Current I
  val3?: number; // e.g., Total Energy E_tot
}

interface OscilloscopeProps {
  mode: 'field' | 'circuit';
  history: DataPoint[];
  labels: {
    title: string;
    line1: string; // e.g. "Kinetic (K)" or "Voltage (V)"
    line2: string; // e.g. "Potential (U)" or "Current (I)"
    line3?: string; // e.g. "Total (E)"
    unit1: string;
    unit2: string;
  };
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  history,
  labels,
  expanded = false,
  onToggleExpand,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const latest = history.length > 0 ? history[history.length - 1] : { val1: 0, val2: 0, val3: 0 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Background dark grid
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#111c30';
    ctx.lineWidth = 1;
    const gridSpacing = 20;
    for (let x = 0; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Center reference line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (history.length < 2) {
      // Empty state prompt
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Awaiting live telemetry stream...', width / 2, height / 2);
      return;
    }

    // Determine min/max values for scaling
    let maxVal1 = 1e-4;
    let minVal1 = 0;
    let maxVal2 = 1e-4;
    let minVal2 = 0;

    history.forEach(p => {
      if (Math.abs(p.val1) > maxVal1) maxVal1 = Math.abs(p.val1);
      if (p.val1 < minVal1) minVal1 = p.val1;
      if (Math.abs(p.val2) > maxVal2) maxVal2 = Math.abs(p.val2);
      if (p.val2 < minVal2) minVal2 = p.val2;
    });

    maxVal1 *= 1.25;
    maxVal2 *= 1.25;

    const padTop = 10;
    const padBottom = 10;
    const plotH = height - padTop - padBottom;

    // Draw Line 1 (Amber: Voltage or Kinetic Energy)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = (i / (history.length - 1)) * width;
      const normalized = Math.max(0, Math.min(1, pt.val1 / maxVal1));
      const y = height - padBottom - normalized * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Line 2 (Cyan: Current or Potential Energy)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = (i / (history.length - 1)) * width;
      const normalized = Math.max(0, Math.min(1, pt.val2 / maxVal2));
      const y = height - padBottom - normalized * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Line 3 if present (Emerald: Total Energy)
    if (labels.line3) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      history.forEach((pt, i) => {
        const x = (i / (history.length - 1)) * width;
        const v3 = pt.val3 ?? 0;
        const normalized = Math.max(0, Math.min(1, v3 / maxVal1));
        const y = height - padBottom - normalized * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [history, labels]);

  return (
    <div
      className={`relative rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-md overflow-hidden transition-all duration-300 shadow-2xl flex flex-col ${
        expanded ? 'h-72' : 'h-44'
      }`}
    >
      {/* Top Header Strip: Dedicated Title & Control */}
      <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-[11px] font-bold text-slate-200 tracking-wide truncate">
            {labels.title}
          </span>
        </div>

        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-1 text-slate-400 hover:text-white rounded bg-slate-800/80 hover:bg-slate-700 transition shrink-0 ml-2"
            title={expanded ? 'Minimize Oscilloscope' : 'Maximize Oscilloscope'}
          >
            {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Numeric Live Badges Strip (Prevents ANY text overlap with the graph!) */}
      <div className="px-3 py-1 bg-slate-950/70 border-b border-slate-800/60 flex items-center justify-between text-[10px] font-mono shrink-0">
        <div className="flex items-center gap-1 text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
          <span className="text-slate-400">{labels.line1}:</span>
          <span className="font-bold">{latest.val1.toFixed(3)} {labels.unit1}</span>
        </div>

        <div className="flex items-center gap-1 text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
          <span className="text-slate-400">{labels.line2}:</span>
          <span className="font-bold">{latest.val2.toFixed(3)} {labels.unit2}</span>
        </div>

        {labels.line3 && latest.val3 !== undefined && (
          <div className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span className="text-slate-400">{labels.line3}:</span>
            <span className="font-bold">{latest.val3.toFixed(3)} {labels.unit1}</span>
          </div>
        )}
      </div>

      {/* Canvas Area (Clean, Uncluttered Waveform Grid) */}
      <div className="relative flex-1 w-full min-h-0 bg-[#060a14]">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Subtle Bottom Grid Axis Legend */}
      <div className="px-3 py-0.5 bg-slate-950/90 border-t border-slate-800/60 flex items-center justify-between text-[9px] text-slate-500 font-mono shrink-0">
        <span>Sweep: 50 ms/div</span>
        <span>Auto-Triggered</span>
      </div>
    </div>
  );
};
