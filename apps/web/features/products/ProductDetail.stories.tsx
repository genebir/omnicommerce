import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductDetail } from "./ProductDetail";

const meta: Meta<typeof ProductDetail> = {
  title: "Features/Products/ProductDetail",
  component: ProductDetail,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ProductDetail>;

export const Default: Story = {
  args: {
    product: {
      id: "prod_001",
      name: "프리미엄 무선 이어폰",
      sku: "SKU-EAR-001",
      price: 59000,
      stock: 124,
      description: "고품질 블루투스 5.3 무선 이어폰입니다.\n노이즈 캔슬링 기능이 탑재되어 있습니다.",
      status: "ACTIVE",
      createdAt: "2026-01-10T09:00:00+09:00",
      updatedAt: "2026-01-20T14:30:00+09:00",
      channelListings: [
        { channelCode: "cafe24", externalId: "P00012345", syncStatus: "synced", lastSyncedAt: "2026-01-20T14:30:00+09:00" },
        { channelCode: "naver", externalId: "NV-98765", syncStatus: "pending", lastSyncedAt: "2026-01-19T10:00:00+09:00" },
      ],
      images: [],
    },
  },
};

export const NoListings: Story = {
  args: {
    product: {
      id: "prod_002",
      name: "신규 상품",
      sku: "SKU-NEW-001",
      price: 25000,
      stock: 50,
      description: "",
      status: "DRAFT",
      createdAt: "2026-01-20T09:00:00+09:00",
      updatedAt: "2026-01-20T09:00:00+09:00",
      channelListings: [],
      images: [],
    },
  },
};

export const NotFound: Story = {
  args: {
    product: null,
  },
};
