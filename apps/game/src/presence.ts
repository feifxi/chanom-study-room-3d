/** People online across all rooms in this process, and the peak since boot (for the admin page). */
export const presence = {
  online: 0,
  peak: 0,
  join() {
    this.online++;
    this.peak = Math.max(this.peak, this.online);
  },
  leave() {
    this.online = Math.max(0, this.online - 1);
  },
};
