/** "2h 15m" from minutes. */
export const formatMinutes = (m: number) => {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
};
