import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Package, ShoppingCart, Warehouse } from "lucide-react";
import { Tabs } from "./tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs
      tabs={[
        { id: "products", label: "상품", icon: <Package className="size-4" /> },
        { id: "orders", label: "주문", icon: <ShoppingCart className="size-4" /> },
        { id: "inventory", label: "재고", icon: <Warehouse className="size-4" /> },
      ]}
    >
      {(activeTab) => (
        <div className="rounded-xl bg-bg-surface p-6">
          <p className="text-sm text-text-secondary">
            현재 탭: <span className="font-medium text-text-primary">{activeTab}</span>
          </p>
        </div>
      )}
    </Tabs>
  ),
};

export const TextOnly: Story = {
  render: () => (
    <Tabs
      tabs={[
        { id: "info", label: "기본 정보" },
        { id: "channels", label: "채널 현황" },
        { id: "history", label: "변경 이력" },
      ]}
      defaultTab="channels"
    >
      {(activeTab) => (
        <div className="rounded-xl bg-bg-surface p-6">
          <p className="text-sm text-text-secondary">활성 탭: {activeTab}</p>
        </div>
      )}
    </Tabs>
  ),
};
