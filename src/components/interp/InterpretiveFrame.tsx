/**
 * Every Layer B rendering goes inside this frame (spec §1): interpretation surface, a left rule,
 * and a persistent INTERPRETATION chip in its own header. Components that render interpretation
 * call useInterpretiveFrame(), which throws when they are rendered outside a frame. The site is
 * rendered at build time, so an unwrapped correlation fails the build.
 */
import { createContext, useContext, type ReactNode } from 'react';

const FrameContext = createContext(false);

export function useInterpretiveFrame(component: string): void {
  if (!useContext(FrameContext)) {
    throw new Error(`${component} renders interpretation and must be wrapped in <InterpretiveFrame> (spec §1)`);
  }
}

interface Props {
  children: ReactNode;
  /** Optional heading shown next to the chip. */
  title?: string;
  /** Reduced visual weight for the weakest classes (numerical-symbolic, speculative). */
  muted?: boolean;
}

export default function InterpretiveFrame({ children, title, muted = false }: Props) {
  return (
    <FrameContext.Provider value={true}>
      <section
        className={`rounded-r-md border-l-4 border-interp-rule bg-interp-surface px-4 py-3 ${muted ? 'opacity-80' : ''}`}
        data-layer="interpretation"
        aria-label={title ? `Interpretation: ${title}` : 'Interpretation'}
      >
        <header className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-interp-rule px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-interp-chip-ink">INTERPRETATION</span>
          {title && <span className="text-sm font-semibold text-interp-chip-ink">{title}</span>}
        </header>
        <div className="mt-2">{children}</div>
      </section>
    </FrameContext.Provider>
  );
}
