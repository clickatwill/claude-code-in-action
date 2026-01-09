import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock all the child components
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div data-testid="file-system-provider">{children}</div>,
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <div data-testid="chat-provider">{children}</div>,
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat Interface</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">File Tree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">Code Editor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview Frame</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">Header Actions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizableHandle: ({ className }: any) => <div className={className} data-testid="resizable-handle" />,
  ResizablePanel: ({ children, className }: any) => <div className={className} data-testid="resizable-panel">{children}</div>,
  ResizablePanelGroup: ({ children, className }: any) => <div className={className} data-testid="resizable-panel-group">{children}</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

test("renders with preview tab active by default", () => {
  render(<MainContent />);

  // Preview should be visible
  expect(screen.getByTestId("preview-frame")).toBeDefined();

  // Code editor should not be visible
  expect(screen.queryByTestId("code-editor")).toBeNull();
  expect(screen.queryByTestId("file-tree")).toBeNull();
});

test("toggles from preview to code view when code tab is clicked", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Initially, preview should be visible
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();

  // Find and click the "Code" tab
  const codeTab = screen.getByRole("tab", { name: /code/i });
  await user.click(codeTab);

  // Now code editor should be visible
  await waitFor(() => {
    expect(screen.getByTestId("code-editor")).toBeDefined();
    expect(screen.getByTestId("file-tree")).toBeDefined();
  });

  // Preview should not be visible
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("toggles from code to preview view when preview tab is clicked", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Click to code view first
  const codeTab = screen.getByRole("tab", { name: /code/i });
  await user.click(codeTab);

  // Verify we're in code view
  await waitFor(() => {
    expect(screen.getByTestId("code-editor")).toBeDefined();
  });

  // Click back to preview
  const previewTab = screen.getByRole("tab", { name: /preview/i });
  await user.click(previewTab);

  // Now preview should be visible
  await waitFor(() => {
    expect(screen.getByTestId("preview-frame")).toBeDefined();
  });

  // Code editor should not be visible
  expect(screen.queryByTestId("code-editor")).toBeNull();
  expect(screen.queryByTestId("file-tree")).toBeNull();
});

test("can toggle multiple times between views", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const previewTab = screen.getByRole("tab", { name: /preview/i });
  const codeTab = screen.getByRole("tab", { name: /code/i });

  // Toggle to code
  await user.click(codeTab);
  await waitFor(() => {
    expect(screen.getByTestId("code-editor")).toBeDefined();
  });

  // Toggle back to preview
  await user.click(previewTab);
  await waitFor(() => {
    expect(screen.getByTestId("preview-frame")).toBeDefined();
  });
  expect(screen.queryByTestId("code-editor")).toBeNull();

  // Toggle to code again
  await user.click(codeTab);
  await waitFor(() => {
    expect(screen.getByTestId("code-editor")).toBeDefined();
  });
  expect(screen.queryByTestId("preview-frame")).toBeNull();

  // Toggle back to preview again
  await user.click(previewTab);
  await waitFor(() => {
    expect(screen.getByTestId("preview-frame")).toBeDefined();
  });
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("preview tab has correct active state", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const previewTab = screen.getByRole("tab", { name: /preview/i });
  const codeTab = screen.getByRole("tab", { name: /code/i });

  // Initially preview should be selected
  expect(previewTab.getAttribute("data-state")).toBe("active");
  expect(codeTab.getAttribute("data-state")).toBe("inactive");

  // After clicking code tab
  await user.click(codeTab);
  await waitFor(() => {
    expect(codeTab.getAttribute("data-state")).toBe("active");
    expect(previewTab.getAttribute("data-state")).toBe("inactive");
  });

  // After clicking preview tab again
  await user.click(previewTab);
  await waitFor(() => {
    expect(previewTab.getAttribute("data-state")).toBe("active");
    expect(codeTab.getAttribute("data-state")).toBe("inactive");
  });
});
