/**
 * Currency Formatting Utility for Natural Growth Company
 * Official Currency: Yemeni Rial (YER / ر.ي)
 */
export function formatCurrency(amount: number | null | undefined): string {
  const val = Number(amount) || 0;
  return `${val.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ر.ي`;
}

export function formatCurrencyDetailed(amount: number | null | undefined): string {
  const val = Number(amount) || 0;
  return `${val.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال يمني`;
}
