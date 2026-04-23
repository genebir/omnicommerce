import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NotificationPanel } from "./NotificationPanel";

const meta: Meta<typeof NotificationPanel> = {
  title: "Patterns/NotificationPanel",
  component: NotificationPanel,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof NotificationPanel>;

export const Empty: Story = {
  args: {
    notifications: [],
  },
};

export const WithNotifications: Story = {
  args: {
    notifications: [
      {
        id: "1",
        title: "새 주문이 들어왔습니다",
        body: "카페24에서 주문 #ORD-2026-0042가 접수되었습니다.",
        read: false,
        createdAt: "2026-01-01T00:00:00+09:00",
      },
      {
        id: "2",
        title: "동기화 완료",
        body: "네이버 스마트스토어 상품 12개가 동기화되었습니다.",
        read: false,
        createdAt: "2026-01-01T00:00:00+09:00",
      },
      {
        id: "3",
        title: "재고 부족 알림",
        body: "SKU-EAR-001 상품의 재고가 5개 이하입니다.",
        read: true,
        createdAt: "2026-01-01T00:00:00+09:00",
      },
    ],
  },
};
