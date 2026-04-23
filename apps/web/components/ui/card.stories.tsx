import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>카드 제목</CardTitle>
        <CardDescription>카드 설명 텍스트입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">카드 본문 내용이 여기에 들어갑니다.</p>
      </CardContent>
      <CardFooter>
        <button
          type="button"
          className="rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white"
        >
          확인
        </button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent>
        <p className="text-sm text-text-secondary">헤더 없는 심플 카드입니다.</p>
      </CardContent>
    </Card>
  ),
};
