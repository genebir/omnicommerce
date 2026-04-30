const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function formatDate(date: Date | string | number): string {
  return dateFormatter.format(new Date(date));
}

export function formatDateTime(date: Date | string | number): string {
  return dateTimeFormatter.format(new Date(date));
}

export function formatTime(date: Date | string | number): string {
  return timeFormatter.format(new Date(date));
}

/**
 * 상대 시간을 "5분 전" / "5 minutes ago" 형태로 포맷.
 *
 * `Intl.RelativeTimeFormat`이 로케일별 표기를 자동 처리. 30일 이상은
 * 절대 날짜로 폴백 — 같은 폴백을 ko/en 모두에 적용해 일관성 확보.
 */
export function formatRelative(
  date: Date | string | number,
  locale: "ko" | "en" = "ko",
): string {
  const now = Date.now();
  const target = new Date(date).getTime();
  const diff = now - target;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 30) {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  }

  // 1분 미만 — Intl 기본 출력("지금"/"now")보다 페르소나 친화 문구로
  if (seconds < 60) return locale === "en" ? "just now" : "방금 전";

  // 일 단위는 always(숫자)로 — auto는 "어제/그저께"처럼 한국어로만 자연스러운 단어를
  // 내놓는데, 셀러 운영 화면에서는 "1일 전 / 2일 전"이 더 정확한 시간 정보가 된다.
  const rtf = new Intl.RelativeTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    numeric: "always",
  });

  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-days, "day");
}
