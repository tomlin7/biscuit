import { describe, expect, it } from "bun:test";
import { extractOutgoingCalls, mapIncomingReferences, type CallReferenceHit } from "./callHierarchy";
import type { OutlineSymbol } from "./outlineScan";

describe("callHierarchy", () => {
  it("extracts outgoing function calls from body text and ignores keywords", () => {
    const body = `
      function test() {
        if (checkCondition()) {
          doSomething(1, 2);
        }
        for (let i = 0; i < 10; i++) {
          processItem(i);
        }
        return finish();
      }
    `;
    const calls = extractOutgoingCalls(body, 10, "test.ts");
    const names = calls.map((c) => c.name);
    expect(names).toContain("checkCondition");
    expect(names).toContain("doSomething");
    expect(names).toContain("processItem");
    expect(names).toContain("finish");
    expect(names).not.toContain("if");
    expect(names).not.toContain("for");
    expect(names).not.toContain("function");
    expect(names).not.toContain("return");
    expect(names).not.toContain("test");
  });

  it("distinguishes function declaration header from recursive calls", () => {
    const body = `
      function factorial(n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
      }
    `;
    const calls = extractOutgoingCalls(body, 1, "math.ts", "factorial");
    const names = calls.map((c) => c.name);
    expect(names).toEqual(["factorial"]);
    // Must be on line 4 (body call), not line 2 (declaration)
    expect(calls[0].line).toBe(4);
  });

  it("maps incoming reference hits to caller functions", () => {
    const hits: CallReferenceHit[] = [
      {
        path: "main.ts",
        line: 10,
        column: 5,
        preview: "function helper() {}",
        start: 100,
        length: 6,
      },
      {
        path: "main.ts",
        line: 25,
        column: 8,
        preview: "const res = helper();",
        start: 250,
        length: 6,
      },
      {
        path: "other.ts",
        line: 15,
        column: 4,
        preview: "helper();",
        start: 150,
        length: 6,
      },
    ];

    const symbols: OutlineSymbol[] = [
      { name: "helper", kind: "function", line: 10, depth: 0 },
      { name: "executeTask", kind: "function", line: 20, depth: 0 },
    ];
    const map = new Map<string, OutlineSymbol[]>();
    map.set("main.ts", symbols);

    const callers = mapIncomingReferences(hits, { path: "main.ts", line: 10 }, map);
    expect(callers.length).toBe(2);
    expect(callers[0].name).toBe("executeTask");
    expect(callers[0].line).toBe(25);
    expect(callers[1].name).toBe("(module)");
    expect(callers[1].path).toBe("other.ts");
  });
});
