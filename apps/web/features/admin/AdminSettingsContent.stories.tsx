import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AdminSettingsContent } from "./AdminSettingsContent";

const meta: Meta<typeof AdminSettingsContent> = {
  title: "Admin/AdminSettingsContent",
  component: AdminSettingsContent,
  parameters: {
    layout: "fullscreen",
  },
};
export default meta;

type Story = StoryObj<typeof AdminSettingsContent>;

export const Default: Story = {};
