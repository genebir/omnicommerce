import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CommandPalette } from "./CommandPalette";

const meta: Meta<typeof CommandPalette> = {
  title: "Patterns/CommandPalette",
  component: CommandPalette,
  parameters: {
    docs: {
      description: {
        component: "⌘K 또는 Ctrl+K로 열 수 있는 명령어 팔레트. 라우트 이동 및 주요 동작을 키보드로 실행.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

export const Default: Story = {
  render: () => {
    return (
      <div>
        <p className="mb-4 text-sm text-text-secondary">
          ⌘K (또는 Ctrl+K)를 눌러 팔레트를 여세요
        </p>
        <CommandPalette />
      </div>
    );
  },
};

export const AutoOpen: Story = {
  render: () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (!mounted) return;
      const timer = setTimeout(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true }),
        );
      }, 300);
      return () => clearTimeout(timer);
    }, [mounted]);

    return <CommandPalette />;
  },
};
