import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OnboardingWizard } from "./OnboardingWizard";

const meta: Meta<typeof OnboardingWizard> = {
  title: "Features/Onboarding/Wizard",
  component: OnboardingWizard,
  parameters: {
    docs: {
      description: {
        component: "첫 로그인 시 표시되는 3단계 온보딩 위저드. 채널 연결 → 자동 동기화 → 통합 관리 안내.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof OnboardingWizard>;

export const Open: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white"
        >
          위저드 열기
        </button>
        <OnboardingWizard open={open} onComplete={() => setOpen(false)} />
      </div>
    );
  },
};

export const Closed: Story = {
  args: {
    open: false,
    onComplete: () => {},
  },
};
