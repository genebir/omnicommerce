/**
 * 일괄 가격/단가 수정 다이얼로그 미리보기 계산.
 *
 * `BulkPriceEditDialog`에서 분리한 순수 함수 — 단위 테스트 + 재사용을 위해.
 *
 * `field`가 `cost_price`이면 `Product.cost_price`를 base로 잡고, 값이 `null`인
 * 상품은 새 값도 `null`(미리보기 셀에 `—`)로 둔다. `mode === "custom"`은
 * 사용자가 입력한 값(`customMap`)을 우선 사용하고, 없으면 기존 base를 그대로.
 */

export type BulkPriceMode = "absolute" | "inc_amount" | "inc_percent" | "custom";
export type BulkPriceField = "price" | "cost_price";

export interface BulkPricePreviewItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost_price: number | null;
}

export interface BulkPricePreviewRow<T extends BulkPricePreviewItem = BulkPricePreviewItem> {
  product: T;
  oldValue: number | null;
  newValue: number | null;
  diff: number;
}

export function applyChange(
  current: number,
  mode: Exclude<BulkPriceMode, "custom">,
  value: number,
  roundTo = 10,
): number {
  let next = current;
  if (mode === "absolute") next = value;
  else if (mode === "inc_amount") next = current + value;
  else next = current * (1 + value / 100);
  next = Math.max(0, next);
  if (roundTo > 1) next = Math.round(next / roundTo) * roundTo;
  return next;
}

export function computeBulkPricePreview<T extends BulkPricePreviewItem>(
  products: T[],
  options: {
    field: BulkPriceField;
    mode: BulkPriceMode;
    value: number;
    roundTo: number;
    customMap: Record<string, number>;
  },
): BulkPricePreviewRow<T>[] {
  const { field, mode, value, roundTo, customMap } = options;

  return products.map((p) => {
    const base = field === "price" ? p.price : p.cost_price;

    let newValue: number | null;
    if (mode === "custom") {
      newValue = customMap[p.id] ?? base;
    } else if (base === null) {
      newValue = null;
    } else {
      newValue = applyChange(base, mode, value, roundTo);
    }

    const diff = newValue !== null && base !== null ? newValue - base : 0;

    return { product: p, oldValue: base, newValue, diff };
  });
}
