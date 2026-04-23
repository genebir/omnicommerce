import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChannelBadge } from "./ChannelBadge";

const meta: Meta<typeof ChannelBadge> = {
  title: "Patterns/ChannelBadge",
  component: ChannelBadge,
  argTypes: {
    code: {
      control: "select",
      options: ["cafe24", "naver", "coupang", "eleven_st"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ChannelBadge>;

export const Cafe24: Story = {
  args: { code: "cafe24" },
};

export const Naver: Story = {
  args: { code: "naver" },
};

export const Coupang: Story = {
  args: { code: "coupang" },
};

export const Unknown: Story = {
  args: { code: "eleven_st" },
};

export const AllChannels: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <ChannelBadge code="cafe24" />
      <ChannelBadge code="naver" />
      <ChannelBadge code="coupang" />
      <ChannelBadge code="eleven_st" />
    </div>
  ),
};
