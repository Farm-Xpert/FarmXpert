'use client';

// ============================================================
// FILE: src/components/ui/skeletons.jsx
//
// Loading placeholders shaped like the content they stand in for, so a
// page keeps its layout while data arrives (no jump when it lands).
// All built from <Skeleton> (the shimmer utility), announced once to
// screen readers via role="status".
// ============================================================

import { cn } from '@/lib/cn';
import { Skeleton } from './primitives';

/** Wrapper: one polite "loading" for assistive tech, the shapes are hidden. */
export function Loading({ children, className, label = 'Loading' }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** A few lines of text; the last one shorter, like a real paragraph. */
export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3 rounded-full', i === lines - 1 ? 'w-3/5' : i % 2 ? 'w-11/12' : 'w-full')} />
      ))}
    </div>
  );
}

/** Page header: eyebrow, title, lead. */
export function SkeletonHeader({ action = false }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="w-full max-w-xl space-y-3">
        <Skeleton className="h-2.5 w-24 rounded-full" />
        <Skeleton className="h-9 w-2/3 rounded-lg" />
        <Skeleton className="h-3 w-5/6 rounded-full" />
      </div>
      {action && <Skeleton className="h-9 w-44 rounded-full" />}
    </div>
  );
}

/** Rows with a round marker, two text lines and a small value on the right. */
export function SkeletonList({ rows = 4, className }) {
  return (
    <ul className={cn('divide-y divide-line', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-start gap-3 py-4">
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className={cn('h-3.5 rounded-full', i % 2 ? 'w-1/2' : 'w-2/3')} />
            <Skeleton className="h-3 w-5/6 rounded-full" />
          </div>
          <Skeleton className="h-3 w-12 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/** A section card: title then content. */
export function SkeletonCard({ className, children, title = true }) {
  return (
    <div className={cn('rounded-[1.75rem] border border-line bg-surface p-6', className)}>
      {title && <Skeleton className="mb-5 h-4 w-40 rounded-full" />}
      {children || <SkeletonText />}
    </div>
  );
}

/** Small stat tiles (label, big number). */
export function SkeletonStats({ count = 4, className }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-[4px] border border-line bg-surface p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-3 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** A chart area: axis ticks and bars rising from the baseline. */
export function SkeletonChart({ height = 220, bars = 14, className }) {
  const hs = [42, 58, 50, 66, 48, 72, 60, 80, 64, 70, 55, 76, 62, 84];
  return (
    <div className={cn('flex items-end gap-2 border-b border-line', className)} style={{ height }}>
      {/* heights vary so it reads as a chart, not a block */}
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} className="flex-1" style={{ height: `${hs[i % hs.length]}%` }}>
          <Skeleton className="h-full w-full rounded-t-[4px] rounded-b-none" />
        </div>
      ))}
    </div>
  );
}

/** A table: header row then body rows. */
export function SkeletonTable({ rows = 6, cols = 6, className }) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex gap-4 border-b border-line pb-3">
        {Array.from({ length: cols }, (_, c) => <Skeleton key={c} className={cn('h-2.5 rounded-full', c === 0 ? 'w-1/4' : 'flex-1')} />)}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-line/70 py-3.5">
          <div className="w-1/4 space-y-1.5">
            <Skeleton className="h-3 w-3/4 rounded-full" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
          {Array.from({ length: cols - 1 }, (_, c) => <Skeleton key={c} className="h-3 flex-1 rounded-full" />)}
        </div>
      ))}
    </div>
  );
}

/** A generic dashboard page: header, stats and two cards. Used for route loading. */
export function SkeletonPage() {
  return (
    <Loading>
      <SkeletonHeader />
      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonCard><SkeletonList rows={3} /></SkeletonCard>
        <SkeletonCard><SkeletonChart height={180} /></SkeletonCard>
      </div>
    </Loading>
  );
}
