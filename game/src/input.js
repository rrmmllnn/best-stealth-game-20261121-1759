// Keyboard and mouse, read fresh every frame. WASD or arrows move, Shift runs, C or
// Ctrl sneaks, E or Space takes a relic, Q or a mouse click throws a pebble toward the
// cursor. P or Escape pauses, M mutes, Enter confirms on the title and end screens.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas, audio) {
  const keys = new Set();
  let actions = 0;
  let throwAt = null;
  let interactPressed = false;

  function keyCode(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(keyCode(event));
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'KeyE' || event.code === 'Space') interactPressed = true;
    if (audio) audio.unlock();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(keyCode(event));
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    throwAt = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    if (audio) audio.unlock();
  });

  function read() {
    let moveX = 0;
    let moveY = 0;
    for (const code of keys) {
      const vector = MOVE_KEYS[code];
      if (vector === undefined) continue;
      moveX += vector[0];
      moveY += vector[1];
    }
    const length = Math.hypot(moveX, moveY);
    if (length > 0) {
      moveX /= length;
      moveY /= length;
    }
    const value = {
      moveX,
      moveY,
      run: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      sneak: keys.has('KeyC') || keys.has('ControlLeft') || keys.has('ControlRight'),
      interact: interactPressed,
      throwAt,
    };
    interactPressed = false;
    throwAt = null;
    return value;
  }

  function takeActions() {
    const value = actions;
    actions = 0;
    return value;
  }

  return { read, takeActions };
}
