import { useCallback, useRef } from 'react';

function playPattern(ctx, pattern) {
  let offset = ctx.currentTime;
  pattern.forEach(({ f, d = 0.09, g = 0.04 }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, offset);
    gain.gain.setValueAtTime(0.0001, offset);
    gain.gain.exponentialRampToValueAtTime(g, offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, offset + d);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(offset);
    osc.stop(offset + d);
    offset += d + 0.02;
  });
}

export function useNotificationSound() {
  const ctxRef = useRef(null);

  const play = useCallback((type = 'info') => {
    try {
      if (!ctxRef.current) {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return;
        ctxRef.current = new AudioContextCtor();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'incoming') {
        playPattern(ctx, [{ f: 620, d: 0.11 }, { f: 820, d: 0.11 }]);
        return;
      }
      if (type === 'success') {
        playPattern(ctx, [{ f: 780, d: 0.1 }, { f: 980, d: 0.12 }]);
        return;
      }
      if (type === 'warning') {
        playPattern(ctx, [{ f: 480, d: 0.12 }, { f: 420, d: 0.12 }]);
        return;
      }
      playPattern(ctx, [{ f: 700, d: 0.08 }]);
    } catch {
      // Ignore audio failures silently.
    }
  }, []);

  return { play };
}
