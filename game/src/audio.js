// Every sound is synthesised with Web Audio at run time: footsteps, guard barks, the
// alarm sting, pickup chimes and a low night drone. No audio files ship with the game,
// so there is nothing to load over the network. The context starts on the first user
// gesture (browsers refuse sound before one); until then every call is a silent no-op.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let drone = null;

  function ensure() {
    if (context !== null) return context !== null;
    if (typeof window === 'undefined' || !window.AudioContext) return false;
    try {
      context = new window.AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      context = null;
      return false;
    }
    return true;
  }

  /** Call from a user gesture so the browser lets sound start. */
  function unlock() {
    if (!ensure()) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    startDrone();
  }

  function startDrone() {
    if (drone !== null || context === null) return;
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = 55;
    const wobble = context.createOscillator();
    wobble.type = 'sine';
    wobble.frequency.value = 0.07;
    const wobbleGain = context.createGain();
    wobbleGain.gain.value = 18;
    wobble.connect(wobbleGain);
    wobbleGain.connect(oscillator.frequency);
    const gain = context.createGain();
    gain.gain.value = 0.035;
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start();
    wobble.start();
    drone = { oscillator, wobble };
  }

  function blip(frequency, duration, type, volume, slideTo) {
    if (!ensure() || muted) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slideTo !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function thud(volume, lowpass) {
    if (!ensure() || muted) return;
    const now = context.currentTime;
    const bufferSize = Math.floor(context.sampleRate * 0.09);
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  return {
    unlock,
    setMuted(value) {
      muted = value;
    },
    isMuted() {
      return muted;
    },
    /** A soft step. Louder and lower when running, barely there when sneaking. */
    footstep(running, sneaking) {
      thud(sneaking ? 0.05 : running ? 0.22 : 0.12, running ? 420 : 300);
    },
    /** A guard's heavier boot, quieter the further away it is (0..1 closeness). */
    guardStep(closeness) {
      if (closeness <= 0.05) return;
      thud(0.05 + 0.2 * closeness, 260);
    },
    /** The pebble's clink where it lands. */
    pebbleClink() {
      blip(1900, 0.08, 'triangle', 0.16, 900);
      blip(2600, 0.05, 'sine', 0.08, 1400);
    },
    /** A guard's surprised "huh?" when something catches its eye. */
    suspicious() {
      blip(300, 0.16, 'square', 0.07, 420);
    },
    /** The alarm sting when the meter fills. */
    alarm() {
      blip(660, 0.22, 'sawtooth', 0.14, 880);
      setTimeout(() => blip(880, 0.3, 'sawtooth', 0.14, 660), 160);
    },
    /** A relic lifting off its pedestal. */
    pickup() {
      blip(880, 0.12, 'sine', 0.16, 1320);
      setTimeout(() => blip(1320, 0.2, 'sine', 0.16, 1760), 90);
    },
    /** The exit door swinging open when the last relic is taken. */
    exitOpen() {
      blip(220, 0.4, 'triangle', 0.12, 440);
    },
    /** A level cleared. */
    levelClear() {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        setTimeout(() => blip(frequency, 0.22, 'sine', 0.15), index * 110);
      });
    },
    /** Caught. */
    caught() {
      blip(220, 0.5, 'sawtooth', 0.16, 55);
    },
    /** The whole heist done. */
    victory() {
      [523, 659, 784, 1047, 1319].forEach((frequency, index) => {
        setTimeout(() => blip(frequency, 0.3, 'sine', 0.15), index * 130);
      });
    },
  };
}
