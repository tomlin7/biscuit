import { describe, expect, it } from "bun:test";
import { registerTsHoverProviders } from "./tsHover";

describe("tsHover", () => {
  it("handles null, undefined, or incomplete monaco instances safely", () => {
    expect(() => registerTsHoverProviders(null)).not.toThrow();
    expect(() => registerTsHoverProviders(undefined)).not.toThrow();
    expect(() => registerTsHoverProviders({} as any)).not.toThrow();
    expect(() => registerTsHoverProviders({ languages: {} } as any)).not.toThrow();
  });
});
