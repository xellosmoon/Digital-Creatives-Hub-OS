import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  /** Text appended after the number, e.g. "+". */
  suffix?: string;
}

/** Counts up from 0 to `value` once scrolled into view — for stat blocks
 *  where the final number alone reads as static. Jumps straight to the
 *  final value when the OS has requested reduced motion. */
export default function AnimatedNumber({ value, className, suffix = '' }: AnimatedNumberProps): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const reduceMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const duration = 1200;
        const start = performance.now();
        const tick = (now: number): void => {
          const progress = Math.min((now - start) / duration, 1);
          // Ease-out so it settles rather than stopping abruptly.
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(eased * value));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {display}{suffix}
    </span>
  );
}
