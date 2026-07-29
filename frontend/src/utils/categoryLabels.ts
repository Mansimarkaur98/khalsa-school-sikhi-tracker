const SHORT_LABELS: Record<string, string> = {
  'Gurbani Reading': 'Gurbani',
  Kirtan: 'Kirtan',
  Tabla: 'Tabla',
  Gatka: 'Gatka',
  'Nitnem Gurbani Kanth': 'Nitnem',
  'Daily Paath Recitation': 'Paath',
  'Daily Simran Recitation': 'Simran',
  'Amrit Status & Intention': 'Amrit',
}

export function shortCategoryLabel(categoryName: string): string {
  return SHORT_LABELS[categoryName] ?? categoryName.split(' ')[0]
}
