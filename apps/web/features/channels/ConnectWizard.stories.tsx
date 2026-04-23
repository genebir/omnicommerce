import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ConnectWizard } from "./ConnectWizard";

const meta: Meta<typeof ConnectWizard> = {
  title: "Features/Channels/ConnectWizard",
  component: ConnectWizard,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof ConnectWizard>;

export const Cafe24: Story = {
  args: {
    channelCode: "cafe24",
    channelName: "Cafe24",
    open: true,
    onOpenChange: () => {},
  },
};

export const Naver: Story = {
  args: {
    channelCode: "naver",
    channelName: "네이버 스마트스토어",
    open: true,
    onOpenChange: () => {},
  },
};

export const Coupang: Story = {
  args: {
    channelCode: "coupang",
    channelName: "쿠팡",
    open: true,
    onOpenChange: () => {},
  },
};
