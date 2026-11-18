'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  Compass,
  CheckCircle2,
  TrendingUp,
  Sigma,
  ArrowUpDown,
} from 'lucide-react';
import {
  MotionScenarioId,
  MotionParams,
  MotionState,
  IntervalAnalysis,
  ConvergenceRow,
  computeGraphBounds,
  sampleMotionSeries,
  generateLimitConvergenceTable,
} from '@/lib/physics/kinematics-1-2';
import { Var, Vec, Frac, Sub, BigInt } from '@/components/ui/MathFormula';

interface KinematicsGraphsPanelProps {
  scenario: MotionScenarioId;
  dimension: '1D' | '2D';
  maxTime: number;
  params: MotionParams;
  t1: number;
  dt: number;
  simTime: number;
  analysis: IntervalAnalysis;
  playState: MotionState;
  onScrubTime: (t: number) => void;
  onSelectDt: (dt: number) => void;
}

type AxisChannel = 'x' | 'z';
type InspectorTab = 'graphs' | 'calculus' | 'convergence';

interface SinglePlotProps {
  id: string;
  title: string;
  unitLabel: string;
  accentHex: string;
  fillHex: string;
  times: number[];
  values: number[];
  maxTime: number;
  t1: number;
  t2: number;
  simTime: number;
  valAtT1: number;
  valAtT2: number;
  slopeAtT1?: number;
  showSecantAndTangent?: boolean;
  showIntegralShade?: boolean;
  secantLabel?: string;
  tangentLabel?: string;
  integralLabel?: string;
  onScrubTime: (t: number) => void;
}

const QuantitativeSvgPlot: React.FC<SinglePlotProps> = ({
  id,
  title,
  unitLabel,
  accentHex,
  fillHex,
  times,
  values,
  maxTime,
  t1,
  t2,
  simTime,
  valAtT1,
  valAtT2,
  slopeAtT1,
  showSecantAndTangent = false,
  showIntegralShade = false,
  secantLabel,
  tangentLabel,
  integralLabel,
  onScrubTime,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef(false);

  const W = 356;
  const H = 118;
  const padL = 40;
  const padR = 12;
  const padT = 14;
  const padB = 20;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const bounds = useMemo(() => computeGraphBounds(values, 0.8), [values]);
  const spanY = Math.max(1e-6, bounds.maxY - bounds.minY);

  const mapX = (t: number) => padL + (Math.max(0, Math.min(maxTime, t)) / maxTime) * plotW;
  const mapY = (v: number) => padT + ((bounds.maxY - v) / spanY) * plotH;

  const zeroY = mapY(0);
  const clampedZeroY = Math.max(padT, Math.min(padT + plotH, zeroY));

  // Curve SVG polyline path
  const curvePath = useMemo(() => {
    if (times.length === 0) return '';
    return times
      .map((t, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(t).toFixed(1)} ${mapY(values[idx]).toFixed(1)}`)
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [times, values, bounds.minY, bounds.maxY, maxTime]);

  // Shaded definite integral polygon over [t1, t2] relative to y=0
  const integralPath = useMemo(() => {
    if (!showIntegralShade || times.length < 2) return '';
    const clampedT1 = Math.max(0, Math.min(maxTime, t1));
    const clampedT2 = Math.max(clampedT1, Math.min(maxTime, t2));
    const pts: Array<{ x: number; y: number }> = [];

    pts.push({ x: mapX(clampedT1), y: clampedZeroY });
    pts.push({ x: mapX(clampedT1), y: mapY(valAtT1) });

    for (let i = 0; i < times.length; i++) {
      if (times[i] > clampedT1 && times[i] < clampedT2) {
        pts.push({ x: mapX(times[i]), y: mapY(values[i]) });
      }
    }

    pts.push({ x: mapX(clampedT2), y: mapY(valAtT2) });
    pts.push({ x: mapX(clampedT2), y: clampedZeroY });

    return pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntegralShade, times, values, t1, t2, valAtT1, valAtT2, clampedZeroY, maxTime]);

  // Extended secant line passing through (t1, valAtT1) and (t2, valAtT2)
  const dt = Math.max(1e-4, t2 - t1);
  const secantSlope = (valAtT2 - valAtT1) / dt;
  const secHalfExt = Math.min(maxTime * 0.22, Math.max(0.45, dt * 0.6));
  const secStartT = Math.max(0, t1 - secHalfExt * 0.45);
  const secEndT = Math.min(maxTime, t2 + secHalfExt * 0.45);
  const secStartY = valAtT1 + secantSlope * (secStartT - t1);
  const secEndY = valAtT1 + secantSlope * (secEndT - t1);

  // Tangent line segment at t1
  const tanHalf = Math.min(maxTime * 0.16, 1.0);
  const tanStartT = Math.max(0, t1 - tanHalf);
  const tanEndT = Math.min(maxTime, t1 + tanHalf);
  const tanSlope = slopeAtT1 ?? 0;
  const tanStartY = valAtT1 + tanSlope * (tanStartT - t1);
  const tanEndY = valAtT1 + tanSlope * (tanEndT - t1);

  const timeTicks = useMemo(() => {
    const count = 4;
    const arr: number[] = [];
    for (let i = 0; i <= count; i++) {
      arr.push(Number(((i / count) * maxTime).toFixed(1)));
    }
    return arr;
  }, [maxTime]);

  const handlePointerToTime = (clientX: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const viewX = ((clientX - rect.left) / Math.max(1, rect.width)) * W;
    const norm = Math.max(0, Math.min(1, (viewX - padL) / plotW));
    onScrubTime(Number((norm * maxTime).toFixed(2)));
  };

  return (
    <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2 space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-white font-mono">{title}</span>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          {showSecantAndTangent && (
            <>
              <span className="text-amber-300">● {secantLabel}</span>
              <span className="text-sky-300">● {tangentLabel}</span>
            </>
          )}
          {showIntegralShade && integralLabel && (
            <span style={{ color: accentHex }}>■ {integralLabel}</span>
          )}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        data-testid={`kinematics12-plot-${id}`}
        onPointerDown={e => {
          isDraggingRef.current = true;
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
          handlePointerToTime(e.clientX);
        }}
        onPointerMove={e => {
          if (isDraggingRef.current) handlePointerToTime(e.clientX);
        }}
        onPointerUp={() => {
          isDraggingRef.current = false;
        }}
        onPointerCancel={() => {
          isDraggingRef.current = false;
        }}
        className="w-full h-auto cursor-ew-resize select-none touch-none"
      >
        <defs>
          <clipPath id={`clip-${id}`}>
            <rect x={padL} y={padT} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Background Grid */}
        {bounds.ticks.map(tick => {
          const yPos = mapY(tick);
          if (yPos < padT - 2 || yPos > padT + plotH + 2) return null;
          const isZero = Math.abs(tick) < 1e-6;
          return (
            <g key={tick}>
              <line
                x1={padL}
                y1={yPos}
                x2={padL + plotW}
                y2={yPos}
                stroke={isZero ? '#475569' : '#132a22'}
                strokeWidth={isZero ? 1.1 : 0.8}
                strokeDasharray={isZero ? undefined : '2 3'}
              />
              <text
                x={padL - 5}
                y={yPos + 3}
                textAnchor="end"
                fill={isZero ? '#cbd5e1' : '#64748b'}
                fontSize="8.5"
                fontFamily="monospace"
              >
                {Math.abs(tick) >= 10 || Number.isInteger(tick) ? tick.toFixed(0) : tick.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Vertical Time Ticks */}
        {timeTicks.map(tTick => {
          const xPos = mapX(tTick);
          return (
            <g key={tTick}>
              <line
                x1={xPos}
                y1={padT}
                x2={xPos}
                y2={padT + plotH}
                stroke="#132a22"
                strokeWidth="0.8"
              />
              <text
                x={xPos}
                y={H - 6}
                textAnchor="middle"
                fill="#64748b"
                fontSize="8.5"
                fontFamily="monospace"
              >
                {tTick}s
              </text>
            </g>
          );
        })}

        {/* Unit & Axis Labels */}
        <text x="4" y={padT + 8} fill="#94a3b8" fontSize="8" fontFamily="monospace">
          {unitLabel}
        </text>

        {/* Plot Frame */}
        <rect
          x={padL}
          y={padT}
          width={plotW}
          height={plotH}
          fill="none"
          stroke="#1e3a31"
          strokeWidth="1"
        />

        {/* Clipped Curves, Integral Shade, Secants & Tangents */}
        <g clipPath={`url(#clip-${id})`}>
          {showIntegralShade && integralPath && (
            <path d={integralPath} fill={fillHex} fillOpacity="0.28" stroke="none" />
          )}

          {/* Interval boundary markers t1 and t2 */}
          <line
            x1={mapX(t1)}
            y1={padT}
            x2={mapX(t1)}
            y2={padT + plotH}
            stroke="#38bdf8"
            strokeWidth="1"
            strokeDasharray="3 2"
            strokeOpacity="0.7"
          />
          <line
            x1={mapX(t2)}
            y1={padT}
            x2={mapX(t2)}
            y2={padT + plotH}
            stroke="#c084fc"
            strokeWidth="1"
            strokeDasharray="3 2"
            strokeOpacity="0.7"
          />

          {/* Main function curve */}
          <path d={curvePath} fill="none" stroke={accentHex} strokeWidth="2.1" strokeLinejoin="round" />

          {/* Secant Line [t1, t2] */}
          {showSecantAndTangent && (
            <line
              x1={mapX(secStartT)}
              y1={mapY(secStartY)}
              x2={mapX(secEndT)}
              y2={mapY(secEndY)}
              stroke="#f59e0b"
              strokeWidth="1.8"
              strokeDasharray="5 3"
            />
          )}

          {/* Tangent Line at t1 */}
          {showSecantAndTangent && slopeAtT1 !== undefined && (
            <line
              x1={mapX(tanStartT)}
              y1={mapY(tanStartY)}
              x2={mapX(tanEndT)}
              y2={mapY(tanEndY)}
              stroke="#38bdf8"
              strokeWidth="1.8"
            />
          )}

          {/* t1 and t2 anchor dots */}
          <circle cx={mapX(t1)} cy={mapY(valAtT1)} r="3.6" fill="#38bdf8" stroke="#040b09" strokeWidth="1" />
          <circle cx={mapX(t2)} cy={mapY(valAtT2)} r="3.6" fill="#c084fc" stroke="#040b09" strokeWidth="1" />
        </g>

        {/* Active Playback Cursor */}
        <line
          x1={mapX(simTime)}
          y1={padT}
          x2={mapX(simTime)}
          y2={padT + plotH}
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeOpacity="0.75"
        />
      </svg>
    </div>
  );
};

export const KinematicsGraphsPanel: React.FC<KinematicsGraphsPanelProps> = ({
  scenario,
  dimension,
  maxTime,
  params,
  t1,
  dt,
  simTime,
  analysis,
  playState,
  onScrubTime,
  onSelectDt,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('graphs');
  const [channel, setChannel] = useState<AxisChannel>('x');

  const effectiveChannel: AxisChannel = dimension === '2D' ? channel : 'x';

  const series = useMemo(
    () => sampleMotionSeries(scenario, 0, maxTime, 160, params),
    [scenario, maxTime, params]
  );

  const times = useMemo(() => series.map(s => s.t), [series]);
  const posValues = useMemo(
    () => series.map(s => (effectiveChannel === 'x' ? s.r.x : s.r.z)),
    [series, effectiveChannel]
  );
  const velValues = useMemo(
    () => series.map(s => (effectiveChannel === 'x' ? s.v.x : s.v.z)),
    [series, effectiveChannel]
  );
  const accValues = useMemo(
    () => series.map(s => (effectiveChannel === 'x' ? s.a.x : s.a.z)),
    [series, effectiveChannel]
  );

  const convergenceRows: ConvergenceRow[] = useMemo(
    () => generateLimitConvergenceTable(scenario, t1, params),
    [scenario, t1, params]
  );

  const pos1 = effectiveChannel === 'x' ? analysis.state1.r.x : analysis.state1.r.z;
  const pos2 = effectiveChannel === 'x' ? analysis.state2.r.x : analysis.state2.r.z;
  const vel1 = effectiveChannel === 'x' ? analysis.state1.v.x : analysis.state1.v.z;
  const vel2 = effectiveChannel === 'x' ? analysis.state2.v.x : analysis.state2.v.z;
  const acc1 = effectiveChannel === 'x' ? analysis.state1.a.x : analysis.state1.a.z;
  const acc2 = effectiveChannel === 'x' ? analysis.state2.a.x : analysis.state2.a.z;
  const axisSym = effectiveChannel === 'x' ? 'x' : 'z';

  return (
    <div className="flex flex-col space-y-3 text-xs">
      {/* Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Calculus and graph inspection views"
        className="grid grid-cols-3 gap-1 bg-black/50 p-1 rounded-xl border border-white/10 font-mono text-[11px]"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'graphs'}
          onClick={() => setActiveTab('graphs')}
          className={`py-1.5 px-1.5 rounded-lg whitespace-nowrap transition flex items-center justify-center gap-1 ${
            activeTab === 'graphs'
              ? 'bg-emerald-400 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span>x-v-a Graphs</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'calculus'}
          onClick={() => setActiveTab('calculus')}
          className={`py-1.5 px-1.5 rounded-lg whitespace-nowrap transition flex items-center justify-center gap-1 ${
            activeTab === 'calculus'
              ? 'bg-emerald-400 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sigma className="w-3.5 h-3.5 shrink-0" />
          <span>Calculus Proof</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'convergence'}
          onClick={() => setActiveTab('convergence')}
          className={`py-1.5 px-1.5 rounded-lg whitespace-nowrap transition flex items-center justify-center gap-1 ${
            activeTab === 'convergence'
              ? 'bg-emerald-400 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span>Δt→0 Limit</span>
        </button>
      </div>

      {/* Live Instantaneous Telemetry Strip */}
      <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px] bg-black/55 p-2 rounded-xl border border-white/10">
        <div>
          <div className="text-[9px] text-slate-400">
            POS {axisSym}({playState.t.toFixed(2)}s)
          </div>
          <div className="text-sky-300 font-bold">
            {(effectiveChannel === 'x' ? playState.r.x : playState.r.z).toFixed(2)} m
            {dimension === '2D' && (
              <span className="text-[9px] text-slate-400 font-normal ml-1">
                (|r|={Math.hypot(playState.r.x, playState.r.z).toFixed(1)})
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-slate-400">SPEED |v|</div>
          <div className="text-emerald-300 font-bold">{playState.speed.toFixed(2)} m/s</div>
        </div>
        <div>
          <div className="text-[9px] text-slate-400">ACCEL |a|</div>
          <div className="text-rose-300 font-bold">{playState.accelMag.toFixed(2)} m/s²</div>
        </div>
      </div>

      {activeTab === 'graphs' && (
        <div className="space-y-2.5">
          {/* 2D Channel Switcher + Scrub hint */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Click/drag plots to scrub t · Shaded = ∫dt</span>
            {dimension === '2D' && (
              <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10">
                <button
                  onClick={() => setChannel('x')}
                  className={`px-2 py-0.5 rounded font-bold ${
                    effectiveChannel === 'x'
                      ? 'bg-emerald-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  X-Axis
                </button>
                <button
                  onClick={() => setChannel('z')}
                  className={`px-2 py-0.5 rounded font-bold ${
                    effectiveChannel === 'z'
                      ? 'bg-emerald-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Z-Axis
                </button>
              </div>
            )}
          </div>

          <QuantitativeSvgPlot
            id="pos"
            title={`Position ${axisSym}(t)`}
            unitLabel="m"
            accentHex="#38bdf8"
            fillHex="#38bdf8"
            times={times}
            values={posValues}
            maxTime={maxTime}
            t1={t1}
            t2={analysis.t2}
            simTime={simTime}
            valAtT1={pos1}
            valAtT2={pos2}
            slopeAtT1={vel1}
            showSecantAndTangent
            secantLabel={`Secant v_avg=${((pos2 - pos1) / Math.max(0.005, dt)).toFixed(2)}`}
            tangentLabel={`Tan v=${vel1.toFixed(2)}`}
            onScrubTime={onScrubTime}
          />

          <QuantitativeSvgPlot
            id="vel"
            title={`Velocity v_${axisSym}(t) = d${axisSym}/dt`}
            unitLabel="m/s"
            accentHex="#10b981"
            fillHex="#10b981"
            times={times}
            values={velValues}
            maxTime={maxTime}
            t1={t1}
            t2={analysis.t2}
            simTime={simTime}
            valAtT1={vel1}
            valAtT2={vel2}
            slopeAtT1={acc1}
            showSecantAndTangent
            showIntegralShade
            secantLabel={`a_avg=${((vel2 - vel1) / Math.max(0.005, dt)).toFixed(2)}`}
            tangentLabel={`a=${acc1.toFixed(2)}`}
            integralLabel={`∫v dt=Δ${axisSym}`}
            onScrubTime={onScrubTime}
          />

          <QuantitativeSvgPlot
            id="acc"
            title={`Acceleration a_${axisSym}(t) = dv_${axisSym}/dt`}
            unitLabel="m/s²"
            accentHex="#fb7185"
            fillHex="#fb7185"
            times={times}
            values={accValues}
            maxTime={maxTime}
            t1={t1}
            t2={analysis.t2}
            simTime={simTime}
            valAtT1={acc1}
            valAtT2={acc2}
            showIntegralShade
            integralLabel={`∫a dt=Δv_${axisSym}`}
            onScrubTime={onScrubTime}
          />
        </div>
      )}

      {activeTab === 'calculus' && (
        <div className="space-y-2.5">
          {/* 1.2.A.2 Displacement vs Distance & 1.2.C.2 Definite Integral Proof */}
          <div className="p-3 rounded-xl bg-black/55 border border-emerald-500/25 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Integral Proof (1.2.A.2, 1.2.C.2)</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-300 whitespace-nowrap shrink-0">
                [{t1.toFixed(2)}s → {analysis.t2.toFixed(2)}s]
              </span>
            </div>

            <div className="p-2 rounded-lg bg-[#040b09] border border-white/10 text-center text-sm text-white">
              <Var>Δ</Var>
              <Var>x</Var> = <Var>x</Var>(<Var>t</Var><Sub>2</Sub>) − <Var>x</Var>(<Var>t</Var><Sub>1</Sub>) ={' '}
              <BigInt sub={<Var>t₁</Var>} sup={<Var>t₂</Var>} /> <Var>v</Var><Sub>x</Sub>(<Var>t</Var>) <Var>d</Var><Var>t</Var>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[9px] text-slate-400">NET Δx = x₂ − x₁</div>
                <div className="text-sky-300 font-bold text-sm">{analysis.displacement.x.toFixed(3)} m</div>
              </div>
              <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[9px] text-slate-400">AREA ∫ v_x(t) dt</div>
                <div className="text-emerald-300 font-bold text-sm">{analysis.integralVx.toFixed(3)} m</div>
              </div>
              <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[9px] text-slate-400">VECTOR |Δr| CHORD</div>
                <div className="text-amber-300 font-bold">{analysis.displacementMag.toFixed(3)} m</div>
              </div>
              <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[9px] text-slate-400">SCALAR PATH ∫|v|dt</div>
                <div className="text-white font-bold">{analysis.scalarDistance.toFixed(3)} m</div>
              </div>
            </div>

            {analysis.scalarDistance > analysis.displacementMag + 0.05 && (
              <p className="text-[11px] text-amber-200 bg-amber-950/40 border border-amber-500/30 rounded-lg p-2 leading-snug">
                Notice: Scalar path distance ({analysis.scalarDistance.toFixed(2)} m) exceeds net displacement |Δr| ({analysis.displacementMag.toFixed(2)} m) because the object curves or reverses direction!
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1 border-t border-white/10">
              <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[9px] text-slate-400">Δv_x = v₂ − v₁</div>
                <div className="text-sky-300 font-bold">{analysis.deltaV.x.toFixed(3)} m/s</div>
              </div>
              <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[9px] text-slate-400">AREA ∫ a_x(t) dt</div>
                <div className="text-rose-300 font-bold">{analysis.integralAx.toFixed(3)} m/s</div>
              </div>
            </div>
          </div>

          {/* 1.2.B.4 Acceleration Breakdown: Speed vs Direction Change */}
          <div className="p-3 rounded-xl bg-black/55 border border-emerald-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                <span>Why Is the Object Accelerating? (1.2.B.4)</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-sky-950/35 border border-sky-500/30">
                <div className="text-[9px] text-sky-300">TANGENTIAL a∥ (SPEED)</div>
                <div className="text-white font-bold text-sm">{playState.aTangential.toFixed(3)} m/s²</div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  {Math.abs(playState.aTangential) < 0.02
                    ? 'Speed |v| constant'
                    : playState.aTangential > 0
                    ? 'Speeding up'
                    : 'Slowing down'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-purple-950/35 border border-purple-500/30">
                <div className="text-[9px] text-purple-300">NORMAL a⊥ (DIRECTION)</div>
                <div className="text-white font-bold text-sm">{playState.aNormal.toFixed(3)} m/s²</div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  {playState.aNormal < 0.02
                    ? 'Straight-line path'
                    : 'Turning velocity vector'}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Per AP EK 1.2.B.4, an object accelerates whenever the <strong className="text-sky-300">magnitude</strong> (a∥) OR the <strong className="text-purple-300">direction</strong> (a⊥) of velocity changes. In uniform circular turning, a∥ = 0 yet |a| = a⊥ = v²/R &gt; 0!
            </p>
          </div>
        </div>
      )}

      {activeTab === 'convergence' && (
        <div className="space-y-2.5">
          <div className="p-3 rounded-xl bg-black/55 border border-emerald-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Secant → Tangent Limit (1.2.B.5 &amp; 1.2.C.1)</span>
              </span>
            </div>

            <div className="p-2 rounded-lg bg-[#040b09] border border-white/10 text-center text-white">
              <Vec>v</Vec>(<Var>t</Var><Sub>1</Sub>) = lim<Sub>Δt→0</Sub>{' '}
              <Frac num={<><Vec>Δr</Vec></>} den={<><Var>Δt</Var></>} /> ={' '}
              <Frac num={<><Var>d</Var><Vec>r</Vec></>} den={<><Var>d</Var><Var>t</Var></>} />
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              Click any Δt row below to jump the interval slider and watch the amber secant chord align with the cyan tangent at t₁ = {t1.toFixed(2)}s.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[10.5px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-1.5 px-1">Δt (s)</th>
                    <th className="py-1.5 px-1">|v_avg|</th>
                    <th className="py-1.5 px-1">|v_avg−v|</th>
                    <th className="py-1.5 px-1">|a_avg−a|</th>
                  </tr>
                </thead>
                <tbody>
                  {convergenceRows.map(row => {
                    const isSelected = Math.abs(row.dt - dt) < 0.015;
                    return (
                      <tr
                        key={row.dt}
                        onClick={() => onSelectDt(row.dt)}
                        className={`border-b border-white/5 cursor-pointer transition ${
                          isSelected
                            ? 'bg-emerald-500/25 text-white font-bold'
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <td className="py-1.5 px-1 text-amber-300">{row.dt.toFixed(2)}</td>
                        <td className="py-1.5 px-1">{row.vAvgMag.toFixed(3)}</td>
                        <td className="py-1.5 px-1 text-sky-300">{row.vErr.toFixed(4)}</td>
                        <td className="py-1.5 px-1 text-rose-300">{row.aErr.toFixed(4)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-white/10">
              <span className="text-slate-400">Current |v_avg − v(t₁)|:</span>
              <span className="text-emerald-300 font-bold">
                {analysis.vLimitError.toFixed(4)} m/s ({analysis.vLimitPercentDiff.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
