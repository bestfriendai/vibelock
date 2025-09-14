import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import MessageActionsModal from "../src/components/MessageActionsModal";

describe("MessageActionsModal", () => {
  test("renders and triggers callbacks", () => {
    const onClose = jest.fn();
    const onReply = jest.fn();
    const onCopy = jest.fn();
    const onDelete = jest.fn();

    const { getByText, getByTestId } = render(
      <MessageActionsModal visible={true} onClose={onClose} onReply={onReply} onCopy={onCopy} onDelete={onDelete} />,
    );

    fireEvent.press(getByText("Reply"));
    expect(onReply).toHaveBeenCalled();

    fireEvent.press(getByText("Copy"));
    expect(onCopy).toHaveBeenCalled();

    fireEvent.press(getByText("Delete"));
    expect(onDelete).toHaveBeenCalled();
  });
});
