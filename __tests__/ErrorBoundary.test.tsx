import React from "react";
import { Text } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ErrorBoundary from "../src/components/ErrorBoundary";

const TestComponent = () => {
  throw new Error("Test error");
};

describe("ErrorBoundary", () => {
  it("renders children normally without error", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Test Child</Text>
      </ErrorBoundary>,
    );

    expect(getByText("Test Child")).toBeTruthy();
  });

  it("catches and displays error when child throws", async () => {
    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    // Initially no error message
    expect(queryByText("Something went wrong")).toBeNull();

    // Wait for error to be caught and message to appear
    await waitFor(() => {
      expect(getByText("Something went wrong")).toBeTruthy();
    });

    // Should not render the throwing component
    expect(queryByText("Test error")).toBeNull();
  });
});
