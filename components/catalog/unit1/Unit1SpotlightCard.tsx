'use client';

import React, { useCallback, useRef } from 'react';
import { computeCursorCardMetrics, getRestingCardMetrics } from '@/lib/ui/unit1-card-motion';

interface Unit1SpotlightCardBaseProps {
  children: React.ReactNode;
  className?: string;
  enableTilt?: boolean;
  maxTiltDeg?: number;
  spotlightRadius?: number;
  'data-testid'?: string;
}

type Unit1SpotlightSectionProps = Unit1SpotlightCardBaseProps & {
  as?: 'section';
  onClick?: never;
  'aria-label'?: string;
};

type Unit1SpotlightButtonProps = Unit1SpotlightCardBaseProps & {
  as: 'button';
  onClick: () => void;
  'aria-label': string;
};

export type Unit1SpotlightCardProps = Unit1SpotlightSectionProps | Unit1SpotlightButtonProps;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const Unit1SpotlightCard: React.FC<Unit1SpotlightCardProps> = props => {
  const {
    children,
    className = '',
    enableTilt = false,
    maxTiltDeg = 1.25,
    spotlightRadius = 420,
    'data-testid': dataTestId,
  } = props;

  const cardRef = useRef<HTMLElement | null>(null);

  const applyMetricsToDom = useCallback(
    (
      el: HTMLElement,
      metrics: ReturnType<typeof computeCursorCardMetrics>,
      isHovering: boolean
    ) => {
      el.style.setProperty('--spot-x', `${metrics.spotX}px`);
      el.style.setProperty('--spot-y', `${metrics.spotY}px`);
      el.style.setProperty('--spot-opacity', String(metrics.active));
      el.style.setProperty('--px', String(metrics.normX));
      el.style.setProperty('--py', String(metrics.normY));

      if (enableTilt) {
        if (isHovering && metrics.active > 0) {
          el.style.setProperty(
            '--card-transform',
            `perspective(1100px) rotateX(${metrics.tiltX}deg) rotateY(${metrics.tiltY}deg) translateY(-2px)`
          );
        } else {
          el.style.setProperty(
            '--card-transform',
            'perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0px)'
          );
        }
      }
    },
    [enableTilt]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const el = cardRef.current;
      if (!el) return;
      const reduced = prefersReducedMotion();
      const rect = el.getBoundingClientRect();
      const metrics = computeCursorCardMetrics(e.clientX, e.clientY, rect, {
        reducedMotion: reduced,
        maxTiltDeg,
      });
      applyMetricsToDom(el, metrics, !reduced);
    },
    [applyMetricsToDom, maxTiltDeg]
  );

  const handlePointerLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    applyMetricsToDom(el, getRestingCardMetrics(rect), false);
  }, [applyMetricsToDom]);

  const initialStyle = {
    '--spot-x': '50%',
    '--spot-y': '0%',
    '--spot-opacity': '0',
    '--px': '0',
    '--py': '0',
    '--card-transform': 'perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0px)',
    transform: enableTilt ? 'var(--card-transform)' : undefined,
    transition:
      'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease, box-shadow 260ms ease',
  } as React.CSSProperties;

  const baseClasses =
    'group relative overflow-hidden rounded-2xl border border-slate-700/45 bg-[#0c1624]/82 backdrop-blur-md shadow-[0_18px_42px_-20px_rgba(2,8,20,0.85)]';

  const interactiveClasses =
    props.as === 'button'
      ? 'w-full text-left cursor-pointer hover:border-teal-400/35 hover:shadow-[0_24px_56px_-22px_rgba(13,148,136,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060b14]'
      : '';

  const overlays = (
    <>
      {/* Subtle atmospheric top-edge sheen */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-teal-300/[0.055] via-cyan-400/[0.015] to-transparent"
      />

      {/* Cursor-tracking interior radial spotlight gradient */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 ease-out motion-reduce:hidden"
        style={{
          opacity: 'var(--spot-opacity, 0)',
          background: `radial-gradient(${spotlightRadius}px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(45, 212, 191, 0.13), rgba(34, 211, 238, 0.045) 42%, transparent 72%)`,
        }}
      />

      {/* Cursor-tracking crisp 1px border radial highlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl p-[1px] transition-opacity duration-300 ease-out motion-reduce:hidden"
        style={{
          opacity: 'var(--spot-opacity, 0)',
          background: `radial-gradient(${Math.round(spotlightRadius * 0.68)}px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(94, 234, 212, 0.72), rgba(34, 211, 238, 0.22) 45%, transparent 74%)`,
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
    </>
  );

  if (props.as === 'button') {
    return (
      <button
        ref={node => {
          cardRef.current = node;
        }}
        type="button"
        onClick={props.onClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        aria-label={props['aria-label']}
        data-testid={dataTestId}
        style={initialStyle}
        className={`${baseClasses} ${interactiveClasses} ${className}`}
      >
        {overlays}
        <div className="relative z-10 h-full flex flex-col justify-between">{children}</div>
      </button>
    );
  }

  return (
    <section
      ref={node => {
        cardRef.current = node;
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-label={props['aria-label']}
      data-testid={dataTestId}
      style={initialStyle}
      className={`${baseClasses} ${className}`}
    >
      {overlays}
      <div className="relative z-10">{children}</div>
    </section>
  );
};
