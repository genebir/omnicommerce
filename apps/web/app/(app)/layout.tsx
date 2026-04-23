import { Shell } from "@/components/layout";
import { QueryProvider, ConfigProvider, AuthGuard } from "@/lib/providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthGuard>
        <ConfigProvider>
          <Shell>{children}</Shell>
        </ConfigProvider>
      </AuthGuard>
    </QueryProvider>
  );
}
