/**
 * 메시지 카탈로그 정합성 검증.
 *
 * - `ko.json`과 `en.json`의 키 트리가 정확히 일치해야 한다 (한쪽에만 있는 키 = 영어/한국어 모드 깨짐)
 * - 컴포넌트가 카탈로그에 없는 키를 호출하면 next-intl이 런타임 에러를 던지므로,
 *   카탈로그 동기화는 빌드 시점에 잡아야 할 회귀의 첫 방어선.
 */

import { describe, expect, it } from "vitest";
import ko from "./ko.json";
import en from "./en.json";

type Tree = Record<string, unknown>;

function flatten(obj: Tree, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flatten(v as Tree, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
}

describe("messages catalog", () => {
  it("ko.json과 en.json의 키 트리가 일치한다", () => {
    const koKeys = flatten(ko as Tree);
    const enKeys = flatten(en as Tree);

    const onlyInKo = koKeys.filter((k) => !enKeys.includes(k));
    const onlyInEn = enKeys.filter((k) => !koKeys.includes(k));

    expect(onlyInKo, `ko.json에만 있는 키: ${onlyInKo.join(", ")}`).toEqual([]);
    expect(onlyInEn, `en.json에만 있는 키: ${onlyInEn.join(", ")}`).toEqual([]);
  });

  it("페이즈 10 핵심 키들이 두 카탈로그에 모두 존재한다", () => {
    const koKeys = flatten(ko as Tree);
    const required = [
      // CommandPalette
      "nav.dashboard",
      "nav.products",
      "nav.orders",
      "nav.inventory",
      "nav.channels",
      "nav.settings",
      "nav.newProduct",
      "nav.syncAll",
      "commandPalette.title",
      "commandPalette.placeholder",
      "commandPalette.noResults",
      "commandPalette.sectionNavigate",
      "commandPalette.sectionActions",
      // SyncStatus
      "sync.synced",
      "sync.syncing",
      "sync.pending",
      "sync.failed",
      // a11y / common
      "common.menu",
      "common.close",
      "common.selectAll",
      "common.selectRow",
      "common.delete",
      "common.search",
      // 도메인
      "products.openChannelPage",
      "orders.trackingCompanyDirect",
    ];

    for (const key of required) {
      expect(koKeys).toContain(key);
    }

    const enKeys = flatten(en as Tree);
    for (const key of required) {
      expect(enKeys).toContain(key);
    }
  });
});
