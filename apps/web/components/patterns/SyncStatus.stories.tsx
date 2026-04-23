import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SyncStatus } from "./SyncStatus";

const meta: Meta<typeof SyncStatus> = {
  title: "Patterns/SyncStatus",
  component: SyncStatus,
  argTypes: {
    status: {
      control: "select",
      options: ["synced", "syncing", "pending", "failed"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof SyncStatus>;

export const Synced: Story = {
  args: {
    status: "synced",
    lastSyncedAt: "2026-04-22T10:30:00+09:00",
  },
};

export const Syncing: Story = {
  args: { status: "syncing" },
};

export const Pending: Story = {
  args: { status: "pending" },
};

export const Failed: Story = {
  args: {
    status: "failed",
    error: "API rate limit exceeded (429)",
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <SyncStatus status="synced" lastSyncedAt="2026-04-22T10:30:00+09:00" />
      <SyncStatus status="syncing" />
      <SyncStatus status="pending" />
      <SyncStatus status="failed" error="API rate limit exceeded (429)" />
    </div>
  ),
};
