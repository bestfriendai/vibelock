import i18n from "./i18n";

describe("i18n", () => {
  it("should translate basic keys", () => {
    expect(i18n.t("welcome")).toBe("Welcome");
    expect(i18n.t("signIn")).toBe("Sign In");
  });

  it("should fallback to English", () => {
    i18n.changeLanguage("es");
    expect(i18n.t("welcome")).toBe("Bienvenido");
  });
});
