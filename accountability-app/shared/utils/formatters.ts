export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return 'yesterday';
    if (absDays < 7) return `${absDays} days ago`;
    return date.toLocaleDateString();
  }

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 7) return `in ${diffDays} days`;
  if (diffDays < 14) return 'next week';

  return date.toLocaleDateString();
}

export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatFrequency(timesPerPeriod: number, period: 'day' | 'week' | 'month'): string {
  if (timesPerPeriod === 1) {
    return `Once per ${period}`;
  }
  return `${timesPerPeriod}x per ${period}`;
}
