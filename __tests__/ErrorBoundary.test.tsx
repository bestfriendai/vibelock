import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import ErrorBoundary from "../src/components/ErrorBoundary";

// Mock console.warn to avoid noise in test output
const originalWarn = console.warn;
beforeEach(() => {
  console.warn = jest.fn();
});

afterEach(() => {
  console.warn = originalWarn;
});

// A component that throws an error
const ErrorComponent = () => {
  throw new Error("Test error");
};

// A component that doesn't throw
const NormalComponent = () => {
  return React.createElement("Text", {}, "Normal component");
};

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    const { getByText } = render(
      React.createElement(ErrorBoundary, {
        children: React.createElement(NormalComponent),
      }),
    );

    expect(getByText("Normal component")).toBeTruthy();
  });

  it("catches errors and displays the error UI", () => {
    const { getByText } = render(
      React.createElement(ErrorBoundary, {
        children: React.createElement(ErrorComponent),
      }),
    );

    expect(getByText("Something went wrong")).toBeTruthy();
    expect(getByText("We encountered an unexpected error. Please try again or restart the app.")).toBeTruthy();
    expect(getByText("Try Again")).toBeTruthy();
    expect(getByText("Go to Home")).toBeTruthy();
  });

  it("calls onError prop when an error occurs", () => {
    const onErrorMock = jest.fn();

    render(
      React.createElement(ErrorBoundary, {
        onError: onErrorMock,
        children: React.createElement(ErrorComponent),
      }),
    );

    expect(onErrorMock).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
  });

  it("logs errors in development mode", () => {
    // Mock __DEV__ to true
    const originalDEV = (global as any).__DEV__;
    (global as any).__DEV__ = true;

    render(
      React.createElement(ErrorBoundary, {
        children: React.createElement(ErrorComponent),
      }),
    );

    expect(console.warn).toHaveBeenCalledWith("ErrorBoundary caught an error:", expect.any(Error), expect.any(Object));

    // Restore __DEV__
    (global as any).__DEV__ = originalDEV;
  });

  it("displays error details in development mode", () => {
    // Mock __DEV__ to true
    const originalDEV = (global as any).__DEV__;
    (global as any).__DEV__ = true;

    const { getByText } = render(
      React.createElement(ErrorBoundary, {
        children: React.createElement(ErrorComponent),
      }),
    );

    expect(getByText("Error: Test error")).toBeTruthy();

    // Restore __DEV__
    (global as any).__DEV__ = originalDEV;
  });

  it("does not display error details in production mode", () => {
    // Mock __DEV__ to false
    const originalDEV = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    const { queryByText } = render(
      React.createElement(ErrorBoundary, {
        children: React.createElement(ErrorComponent),
      }),
    );

    expect(queryByText("Error: Test error")).toBeNull();

    // Restore __DEV__
    (global as any).__DEV__ = originalDEV;
  });

  it("resets error state when Try Again is pressed", () => {
    const { getByText, queryByText } = render(
      React.createElement(ErrorBoundary, {
        children: React.createElement(ErrorComponent),
      }),
    );

    // Error UI should be visible
    expect(getByText("Something went wrong")).toBeTruthy();

    // Press Try Again
    act(() => {
      fireEvent.press(getByText("Try Again"));
    });

    // Error UI should no longer be visible
    expect(queryByText("Something went wrong")).toBeNull();
  });

  it("resets error state when Go to Home is pressed", () => {
    const { getByText, queryByText } = render(
      React.createElement(ErrorBoundary, {
        children: React.createElement(ErrorComponent),
      }),
    );

    // Error UI should be visible
    expect(getByText("Something went wrong")).toBeTruthy();

    // Press Go to Home
    act(() => {
      fireEvent.press(getByText("Go to Home"));
    });

    // Error UI should no longer be visible
    expect(queryByText("Something went wrong")).toBeNull();
  });

  it("displays custom fallback when provided", () => {
    const customFallback = React.createElement("Text", {}, "Custom fallback");

    const { getByText } = render(
      React.createElement(ErrorBoundary, {
        fallback: customFallback,
        children: React.createElement(ErrorComponent),
      }),
    );

    expect(getByText("Custom fallback")).toBeTruthy();
  });

  it("works with getDerivedStateFromError", () => {
    const error = new Error("Test error");
    const state = ErrorBoundary.getDerivedStateFromError(error);

    expect(state).toEqual({
      hasError: true,
      error: error,
    });
  });

  it("increments resetCount after retry", () => {
    // Use fake timers to test setTimeout
    jest.useFakeTimers();

    // Create a mock ErrorBoundary instance to access state
    const errorBoundary = new (ErrorBoundary as any)({});
    errorBoundary.state = { hasError: false, error: null, resetCount: 0, isResetting: false };

    // Mock setState to directly update state
    errorBoundary.setState = jest.fn((callback) => {
      if (typeof callback === "function") {
        const newState = callback(errorBoundary.state);
        errorBoundary.state = { ...errorBoundary.state, ...newState };
      }
    });

    // Call handleRetry
    errorBoundary.handleRetry();

    // Verify isResetting is set to true first
    expect(errorBoundary.state.isResetting).toBe(true);

    // Fast-forward timers
    jest.advanceTimersByTime(100);

    // Verify state after reset
    expect(errorBoundary.state.hasError).toBe(false);
    expect(errorBoundary.state.error).toBeNull();
    expect(errorBoundary.state.resetCount).toBe(1);
    expect(errorBoundary.state.isResetting).toBe(false);

    // Restore real timers
    jest.useRealTimers();
  });

  it("handles multiple children correctly", () => {
    const { getByText } = render(
      React.createElement(ErrorBoundary, {
        children: [
          React.createElement("Text", { key: "child1" }, "Child 1"),
          React.createElement("Text", { key: "child2" }, "Child 2"),
        ],
      }),
    );

    expect(getByText("Child 1")).toBeTruthy();
    expect(getByText("Child 2")).toBeTruthy();
  });
});
