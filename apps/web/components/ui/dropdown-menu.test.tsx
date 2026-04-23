import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DropdownMenu, DropdownItem, DropdownSeparator, DropdownLabel } from "./dropdown-menu";

afterEach(cleanup);

describe("DropdownMenu", () => {
  it("트리거 클릭 시 메뉴가 열린다", () => {
    render(
      <DropdownMenu trigger={<button type="button">열기</button>}>
        <DropdownItem>항목 1</DropdownItem>
      </DropdownMenu>,
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("열기"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("트리거 재클릭 시 메뉴가 닫힌다", () => {
    render(
      <DropdownMenu trigger={<button type="button">토글</button>}>
        <DropdownItem>항목 1</DropdownItem>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText("토글"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.click(screen.getByText("토글"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Escape 키로 메뉴가 닫힌다", () => {
    render(
      <DropdownMenu trigger={<button type="button">ESC 테스트</button>}>
        <DropdownItem>항목 1</DropdownItem>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText("ESC 테스트"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("DropdownItem", () => {
  it("클릭 시 onClick을 호출한다", () => {
    const onClick = vi.fn();
    render(<DropdownItem onClick={onClick}>클릭 항목</DropdownItem>);
    fireEvent.click(screen.getByText("클릭 항목"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("destructive 속성 시 에러 스타일을 적용한다", () => {
    render(<DropdownItem destructive>삭제</DropdownItem>);
    const button = screen.getByText("삭제");
    expect(button.className).toContain("state-error");
  });

  it("아이콘을 렌더링한다", () => {
    render(
      <DropdownItem icon={<span data-testid="icon">★</span>}>아이콘 항목</DropdownItem>,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});

describe("DropdownSeparator", () => {
  it("구분선을 렌더링한다", () => {
    const { container } = render(<DropdownSeparator />);
    expect(container.querySelector(".bg-border-subtle")).toBeInTheDocument();
  });
});

describe("DropdownLabel", () => {
  it("레이블 텍스트를 렌더링한다", () => {
    render(<DropdownLabel>섹션 제목</DropdownLabel>);
    expect(screen.getByText("섹션 제목")).toBeInTheDocument();
  });
});
