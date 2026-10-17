'use client';

import React from 'react';
import { BookOpen, X, Calculator, Zap, Compass, Cpu } from 'lucide-react';

interface CalculusTheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculusTheoryModal: React.FC<CalculusTheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                AP Physics C Calculus Grounding & Reference Guide
              </h2>
              <p className="text-xs text-slate-400">
                Electricity & Magnetism Theoretical Formulations & Differential Equations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Section 1: Coulomb's Law & Gauss's Law */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Zap className="w-4 h-4" />
              <span>1. Coulomb&apos;s Law &amp; Gauss&apos;s Integral Theorem</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/90 font-mono text-[11px] text-amber-300 space-y-1">
              <div>
                E-Field: <strong>E&#8407;(&#114;&#8407;) = 1/(4&#960;&#949;&#8320;) &#8721; [q&#7522; / |r&#8407; - r&#8407;&#7522;|&#179;] (r&#8407; - r&#8407;&#7522;)</strong>
              </div>
              <div>
                Gauss&apos;s Flux: <strong>&#934;&#7522; = &#8750; E&#8407; &#183; d&#65042;&#8407; = Q_enc / &#949;&#8320;</strong>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              The electric field is conservative in electrostatic equilibrium. Field lines radiate outward from positive sources (divergence &gt; 0) and terminate on negative sinks (divergence &lt; 0).
            </p>
          </div>

          {/* Section 2: Potential Gradient & Conservative Work */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Calculator className="w-4 h-4" />
              <span>2. Electric Potential Gradient & Path-Independent Work</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/90 font-mono text-[11px] text-amber-300 space-y-1">
              <div>
                Potential: <strong>V(r&#8407;) = &#8721; k q&#7522; / |r&#8407; - r&#8407;&#7522;|</strong>
              </div>
              <div>
                Gradient: <strong>E&#8407; = -&#8711;V = -(&#8706;V/&#8706;x &#238; + &#8706;V/&#8706;y &#309; + &#8706;V/&#8706;z k&#770;)</strong>
              </div>
              <div>
                Work-Energy: <strong>W = -&#916;U = -q &#8747; E&#8407; &#183; d&#8467;&#8407; = q(V_A - V_B) = &#916;K</strong>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Equipotential contour surfaces are always orthogonal to the electric field vectors. Moving a charge along an equipotential line requires zero net work (W = 0).
            </p>
          </div>

          {/* Section 3: Lorentz Force Dynamics */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Compass className="w-4 h-4" />
              <span>3. Lorentz Force & Helical Motion Integration</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/90 font-mono text-[11px] text-amber-300 space-y-1">
              <div>
                Lorentz Law: <strong>F&#8407; = q(E&#8407; + v&#8407; &#215; B&#8407;) = m (d&#178;r&#8407; / dt&#178;)</strong>
              </div>
              <div>
                Cyclotron Radius: <strong>r_c = m v_&#8869; / (|q| B), &nbsp; &#969; = |q| B / m</strong>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Magnetic forces do no work (F_B &#183; v = 0), altering velocity direction without changing kinetic energy K. In combined E and B fields, charged particles undergo cycloidal drift and helical gyration.
            </p>
          </div>

          {/* Section 4: Circuit Modified Nodal Analysis (MNA) & RC Transients */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Cpu className="w-4 h-4" />
              <span>4. Circuit MNA Matrix & Differential RC Transient Solutions</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/90 font-mono text-[11px] text-amber-300 space-y-1">
              <div>
                MNA Matrix: <strong>[G B; C D] &#183; [v; j] = [i; e]</strong>
              </div>
              <div>
                Kirchhoff&apos;s Laws: <strong>&#8721; I_in = &#8721; I_out (KCL), &nbsp; &#8750; &#916;V = 0 (KVL)</strong>
              </div>
              <div>
                Capacitor ODE: <strong>R (dq/dt) + q/C = &#917; &#8658; V_c(t) = &#917; (1 - e^(-t / &#964;)), &nbsp; &#964; = RC</strong>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Voltmeters must be wired in parallel (infinite internal impedance). Ammeters must be wired in series (near-zero impedance). The time constant &#964; = RC governs the 63.2% charge threshold.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
