import { NO_COMMANDS, type Commands } from '../core/types';

export class TouchInput {
  private readonly commands: Commands = { ...NO_COMMANDS };
  set(command: keyof Commands, pressed: boolean): void {
    this.commands[command] = pressed;
  }
  clear(): void {
    Object.assign(this.commands, NO_COMMANDS);
  }
  getCommands(): Readonly<Commands> {
    return this.commands;
  }
}
