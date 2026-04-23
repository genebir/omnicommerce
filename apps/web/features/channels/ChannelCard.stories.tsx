import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Store, Globe, ShoppingBag } from "lucide-react";
import { ChannelCard } from "./ChannelCard";

const meta: Meta<typeof ChannelCard> = {
  title: "Features/Channels/ChannelCard",
  component: ChannelCard,
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChannelCard>;

export const NotConnected: Story = {
  args: {
    code: "cafe24",
    name: "Cafe24",
    icon: Store,
    connected: false,
    onConnect: () => {},
  },
};

export const Connected: Story = {
  args: {
    code: "naver",
    name: "네이버 스마트스토어",
    icon: Globe,
    connected: true,
    productCount: 142,
    orderCount: 38,
    onConnect: () => {},
  },
};

export const AllChannels: Story = {
  decorators: [
    (Story) => (
      <div className="grid w-[800px] grid-cols-3 gap-4">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <ChannelCard code="cafe24" name="Cafe24" icon={Store} connected={true} productCount={85} orderCount={12} onConnect={() => {}} />
      <ChannelCard code="naver" name="네이버 스마트스토어" icon={Globe} connected={true} productCount={142} orderCount={38} onConnect={() => {}} />
      <ChannelCard code="coupang" name="쿠팡" icon={ShoppingBag} connected={false} onConnect={() => {}} />
    </>
  ),
};
