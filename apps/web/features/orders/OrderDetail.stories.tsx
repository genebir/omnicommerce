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
      buyer: {
        name: "김민수",
        phone: "010-1234-5678",
        email: "minsu@example.com",
      },
      recipient: {
        name: "김민수",
        phone: "010-1234-5678",
        address: "서울특별시 강남구 테헤란로 123 4층",
        zipcode: "06234",
      },
      trackingNumber: null,
      trackingCompany: null,
      orderedAt: "2026-01-15T14:30:00+09:00",
      paidAt: "2026-01-15T14:30:00+09:00",
      shippedAt: null,
      deliveredAt: null,
      items: [
        {
          id: "1",
          productName: "프리미엄 무선 이어폰",
          sku: "EAR-001",
          optionText: "색상=화이트",
          productId: null,
          quantity: 1,
          unitPrice: 59000,
          totalPrice: 59000,
        },
        {
          id: "2",
          productName: "이어폰 케이스",
          sku: "CASE-002",
          optionText: null,
          productId: null,
          quantity: 2,
          unitPrice: 15000,
          totalPrice: 30000,
        },
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
      totalAmount: 48000,
      shippingFee: 3000,
      buyer: {
        name: "이영희",
        phone: "010-9876-5432",
        email: null,
      },
      recipient: {
        name: "이영희",
        phone: "010-9876-5432",
        address: "부산광역시 해운대구 센텀중앙로 55",
        zipcode: "48058",
      },
      trackingNumber: "1234-5678-9012",
      trackingCompany: "CJ대한통운",
      orderedAt: "2026-01-16T10:00:00+09:00",
      paidAt: "2026-01-16T10:00:00+09:00",
      shippedAt: "2026-01-17T09:00:00+09:00",
      deliveredAt: null,
      items: [
        {
          id: "3",
          productName: "USB-C 충전 케이블",
          sku: "CBL-USBC",
          optionText: null,
          productId: null,
          quantity: 3,
          unitPrice: 15000,
          totalPrice: 45000,
        },
      ],
    },
  },
};

export const PersonalScopeMissing: Story = {
  args: {
    order: {
      id: "ord_003",
      orderNumber: "20260424-0000014",
      channel: "cafe24",
      status: "PAID",
      totalAmount: 0,
      shippingFee: 0,
      buyer: { name: null, phone: null, email: null },
      recipient: { name: null, phone: null, address: null, zipcode: null },
      trackingNumber: null,
      trackingCompany: null,
      orderedAt: "2026-04-24T13:48:49+09:00",
      paidAt: null,
      shippedAt: null,
      deliveredAt: null,
      items: [
        {
          id: "i1",
          productName: "클라우데어 순면 워싱 스카이 블루 침구세트",
          sku: "P00000BD",
          optionText: null,
          productId: null,
          quantity: 1,
          unitPrice: 98000,
          totalPrice: 98000,
        },
      ],
    },
  },
};

export const NotFound: Story = {
  args: {
    order: null,
  },
};
