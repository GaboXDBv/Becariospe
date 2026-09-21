'use strict';
window.ExamTimer = (() => {
  const format = seconds => {
    const whole = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
  };
  class Clock {
    constructor(update) { this.update = update; this.handle = null; }
    start() { this.stop(); this.handle = setInterval(() => this.update(Date.now()), 100); this.update(Date.now()); }
    stop() { if (this.handle !== null) clearInterval(this.handle); this.handle = null; }
  }
  return { format, Clock };
})();
