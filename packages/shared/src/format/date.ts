// French date labels: "Vendredi 30 octobre".

const dayLabelFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function formatDayLabel(date: Date): string {
  const label = dayLabelFormat.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Time of day as written in French: "8h10", "12h45". */
export function formatTime(date: Date): string {
  return `${String(date.getHours())}h${String(date.getMinutes()).padStart(2, '0')}`;
}
