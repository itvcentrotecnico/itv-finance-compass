import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { validatePassword } from "./session";

describe("senha inicial / redefinição", () => {
  it("exige no mínimo 12 caracteres", () => {
    expect(validatePassword("abc12345678", "abc12345678")).not.toBeNull();
    expect(validatePassword("abc123456789", "abc123456789")).toBeNull();
  });
  it("exige letras e números", () => {
    expect(validatePassword("abcdefghijkl", "abcdefghijkl")).not.toBeNull();
  });
  it("exige confirmação igual", () => {
    expect(validatePassword("abc123456789", "abc123456780")).not.toBeNull();
  });
});
