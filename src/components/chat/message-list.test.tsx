// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageList } from "./message-list";
import type { ChatMessage } from "@/lib/music/types";

afterEach(() => {
  cleanup();
});

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "msg-1",
    sessionId: "sess-1",
    role: "assistant",
    content: "Here's your chord progression.",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("MessageList", () => {
  beforeEach(() => {
    // jsdom does not implement scrollIntoView; stub it so the auto-scroll
    // effect can run without throwing.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders footer content inside the scrollable container, after the messages", () => {
    render(
      <MessageList
        messages={[makeMessage()]}
        footer={<div data-testid="footer">Quick actions</div>}
      />,
    );

    const message = screen.getByText("Here's your chord progression.");
    const footer = screen.getByTestId("footer");

    expect(footer).toBeInTheDocument();
    // Footer must live in the same scrollable container as the messages,
    // not as a fixed sibling outside of it.
    expect(message.closest(".overflow-y-auto")).toBe(
      footer.closest(".overflow-y-auto"),
    );

    // Footer should come after the message in DOM order (scrolling to the
    // bottom of the container should reveal it).
    const position = message.compareDocumentPosition(footer);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not render the footer in the empty state", () => {
    render(
      <MessageList
        messages={[]}
        footer={<div data-testid="footer">Quick actions</div>}
      />,
    );

    expect(screen.queryByTestId("footer")).not.toBeInTheDocument();
    expect(screen.getByText("What are you hearing?")).toBeInTheDocument();
  });

  it("auto-scrolls to the bottom sentinel when a new message arrives", () => {
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const { rerender } = render(<MessageList messages={[makeMessage()]} />);
    scrollIntoViewMock.mockClear();

    rerender(
      <MessageList
        messages={[makeMessage(), makeMessage({ id: "msg-2", role: "user", content: "Nice!" })]}
      />,
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "end",
    });
  });
});
