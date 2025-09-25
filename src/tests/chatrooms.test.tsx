import ChatroomsScreen from "../screens/ChatroomsScreen";

// Simple test to verify syntax errors are fixed
describe("ChatroomsScreen Syntax Tests", () => {
  it("should compile without syntax errors", () => {
    // This test will fail if there are syntax errors in the file
    expect(ChatroomsScreen).toBeDefined();
    expect(typeof ChatroomsScreen).toBe("function");
  });

  it("can be imported without compilation errors", () => {
    // Just verify the module can be loaded
    const component = require("../screens/ChatroomsScreen");
    expect(component.default).toBeDefined();
  });
});
