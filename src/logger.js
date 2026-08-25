export class ProjectLogger {
  constructor(render) { this.entries = []; this.render = render; }
  write(level, message) {
    const entry = { at: new Date().toISOString(), level, message };
    this.entries.push(entry);
    this.render?.(this.entries);
    return entry;
  }
  info(message) { return this.write("INFO", message); }
  warning(message) { return this.write("WARNING", message); }
  error(message) { return this.write("ERROR", message); }
  text() { return this.entries.map((e) => `[${e.at}] ${e.level}: ${e.message}`).join("\n") + "\n"; }
}
