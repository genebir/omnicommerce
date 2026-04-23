import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OnboardingChecklist } from "./OnboardingChecklist";

const meta: Meta<typeof OnboardingChecklist> = {
  title: "Features/Onboarding/Checklist",
  component: OnboardingChecklist,
  parameters: {
    docs: {
      description: {
        component: "대시보드 우측에 표시되는 온보딩 체크리스트. 모든 항목 완료 시 자동 숨김.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof OnboardingChecklist>;

export const Default: Story = {};
