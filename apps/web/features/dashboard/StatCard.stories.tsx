import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Package, ShoppingCart, AlertTriangle, RefreshCw } from "lucide-react";
import { StatCard } from "./StatCard";

const meta: Meta<typeof StatCard> = {
  title: "Features/Dashboard/StatCard",
  component: StatCard,
  decorators: [
    (Story) => (
      <div className="w-[240px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: {
    label: "총 상품",
    value: 256,
    icon: Package,
  },
};

export const WithPositiveTrend: Story = {
  args: {
    label: "신규 주문",
    value: 42,
    icon: ShoppingCart,
    trend: { value: 12, positive: true },
  },
};

export const WithNegativeTrend: Story = {
  args: {
    label: "재고 부족",
    value: 8,
    icon: AlertTriangle,
    trend: { value: 3, positive: false },
  },
};

export const Placeholder: Story = {
  args: {
    label: "동기화 대기",
    value: "—",
    icon: RefreshCw,
  },
};

export const AllCards: Story = {
  decorators: [
    (Story) => (
      <div className="grid w-[960px] grid-cols-4 gap-4">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <StatCard label="총 상품" value={256} icon={Package} trend={{ value: 12, positive: true }} />
      <StatCard label="신규 주문" value={42} icon={ShoppingCart} trend={{ value: 8, positive: true }} />
      <StatCard label="재고 부족" value={8} icon={AlertTriangle} trend={{ value: 3, positive: false }} />
      <StatCard label="동기화 대기" value={5} icon={RefreshCw} />
    </>
  ),
};
