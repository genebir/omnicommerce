import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Breadcrumb } from "./breadcrumb";

const meta: Meta<typeof Breadcrumb> = {
  title: "UI/Breadcrumb",
  component: Breadcrumb,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const TwoLevels: Story = {
  args: {
    items: [
      { label: "상품", href: "/products" },
      { label: "프리미엄 무선 이어폰" },
    ],
  },
};

export const ThreeLevels: Story = {
  args: {
    items: [
      { label: "상품", href: "/products" },
      { label: "프리미엄 무선 이어폰", href: "/products/prod_001" },
      { label: "편집" },
    ],
  },
};
