/** Procedural Web Audio sound effects for Jack DuBall */
const GameAudio = (() => {
  let ctx = null;
  let unlocked = false;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function unlock() {
    const ac = getCtx();
    if (unlocked) return;
    unlocked = true;
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator();
    const g = ac.createGain();
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.01);
  }

  function tone(freq, dur, type = 'sine', vol = 0.08, slide = 0) {
    unlock();
    const ac = getCtx();
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(slide, 40), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol = 0.06) {
    unlock();
    const ac = getCtx();
    const bufferSize = ac.sampleRate * dur;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const g = ac.createGain();
    g.gain.value = vol;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    src.connect(filter);
    filter.connect(g);
    g.connect(ac.destination);
    src.start();
  }

  return {
    unlock,
    jump() { tone(320, 0.12, 'triangle', 0.07, 520); },
    land() { tone(140, 0.08, 'sine', 0.05, 90); },
    collect() { tone(880, 0.08, 'sine', 0.07); tone(1320, 0.1, 'sine', 0.05); },
    smash() { noiseBurst(0.12, 0.08); tone(180, 0.15, 'square', 0.04, 80); },
    crash() { noiseBurst(0.35, 0.12); tone(90, 0.4, 'sawtooth', 0.08, 40); },
    start() { tone(440, 0.1, 'sine', 0.06); tone(660, 0.15, 'sine', 0.06); },
    combo() { tone(660 + Math.random() * 200, 0.06, 'triangle', 0.04); },
    chat() { tone(520, 0.04, 'sine', 0.03); }
  };
})();
