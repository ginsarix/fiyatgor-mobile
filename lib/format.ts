export function formatPrice(value: string | number, currency?: string | null): string {
  const formatted = Number(value).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${formatted} ${currency}` : formatted;
}

export function formatDiscountEndsAt(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    year: 'numeric'
  }).format(new Date(value));
}
