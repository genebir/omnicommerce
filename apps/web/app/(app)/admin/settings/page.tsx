import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AdminSettingsContent } from "@/features/admin";
import { AdminOnlyGate } from "@/components/auth/AdminOnlyGate";

// "use client" 없음 — 페이지 껍데기는 서버 컴포넌트
// 인터랙션이 필요한 내용물은 AdminSettingsContent("use client")로 분리
// AdminOnlyGate는 클라이언트 가드 — 비-admin은 안내 페이지로 전환(백엔드 403 토스트 회피).
export default function AdminSettingsPage() {
  return (
    <NuqsAdapter>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <AdminOnlyGate>
          <AdminSettingsContent />
        </AdminOnlyGate>
      </div>
    </NuqsAdapter>
  );
}
