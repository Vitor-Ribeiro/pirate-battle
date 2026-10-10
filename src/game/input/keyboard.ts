import { NO_COMMANDS, type Commands } from '../core/types';

const KEY_MAP: Record<string, keyof Commands> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyA: 'turnLeft', ArrowLeft: 'turnLeft',
  KeyD: 'turnRight', ArrowRight: 'turnRight',
  Space: 'fireFront',
  KeyQ: 'fireLeft', KeyE: 'fireRight',
};

export class KeyboardInput {
  private readonly commands: Commands = { ...NO_COMMANDS };

  private readonly onDown = (e: KeyboardEvent): void => this.handle(e, true);
  private readonly onUp = (e: KeyboardEvent): void => this.handle(e, false);

  private handle(e: KeyboardEvent, pressed: boolean): void {
    const command = KEY_MAP[e.code];
    if (!command) return;
    e.preventDefault();
    this.commands[command] = pressed;
  }

  attach(): void {
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    this.clear();
  }

  clear(): void {
    Object.assign(this.commands, NO_COMMANDS);
  }

  getCommands(): Readonly<Commands> {
    return this.commands;
  }
}
