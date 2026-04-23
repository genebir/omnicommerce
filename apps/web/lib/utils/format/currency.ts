const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export function formatCurrency(
  value: number,
  currency: string = "KRW",
): string {
  if (currency === "KRW") {
    return krwFormatter.format(value);
  }
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
  }).format(value);
}
