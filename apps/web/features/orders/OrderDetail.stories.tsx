import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OrderDetail } from "./OrderDetail";

const meta: Meta<typeof OrderDetail> = {
  title: "Features/Orders/OrderDetail",
  component: OrderDetail,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof OrderDetail>;

export const Default: Story = {
  args: {
    order: {
      id: "ord_001",
      orderNumber: "ORD-2026-0001",
      channel: "cafe24",
      status: "PAID",
      totalAmount: 89000,
      shippingFee: 0,
      customer: {
        name: "김민수",
        phone: "010-1234-5678",
        address: "서울특별시 강남구 테헤란로 123 4층",
      },
      orderedAt: "2026-01-15T14:30:00+09:00",
      paidAt: "2026-01-15T14:30:00+09:00",
      items: [
        { id: "1", productName: "프리미엄 무선 이어폰", quantity: 1, unitPrice: 59000 },
        { id: "2", productName: "이어폰 케이스", quantity: 2, unitPrice: 15000 },
      ],
    },
  },
};

export const Shipped: Story = {
  args: {
    order: {
      id: "ord_002",
      orderNumber: "ORD-2026-0002",
      channel: "naver",
      status: "SHIPPED",
      totalAmount: 45000,
      shippingFee: 3000,
      customer: {
        name: "이영희",
        phone: "010-9876-5432",
        address: "부산광역시 해운대구 센텀중앙로 55",
      },
      orderedAt: "2026-01-16T10:00:00+09:00",
      paidAt: "2026-01-16T10:00:00+09:00",
      items: [
        { id: "3", productName: "USB-C 충전 케이블", quantity: 3, unitPrice: 15000 },
      ],
    },
  },
};

export const NotFound: Story = {
  args: {
    order: null,
  },
};
