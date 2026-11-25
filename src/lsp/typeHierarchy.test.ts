import { describe, expect, it } from "bun:test";
import { parseSupertypes, findSubtypesInText } from "./typeHierarchy";

describe("typeHierarchy", () => {
  it("parses extends and implements clauses from class declaration", () => {
    const line = "export class Dog extends Animal implements ICanBark, ICanRun {";
    const { extendsList, implementsList } = parseSupertypes(line);
    expect(extendsList).toEqual(["Animal"]);
    expect(implementsList).toEqual(["ICanBark", "ICanRun"]);
  });

  it("parses extends clauses from interface declaration", () => {
    const line = "export interface Puppy extends Dog, Pet {";
    const { extendsList, implementsList } = parseSupertypes(line);
    expect(extendsList).toEqual(["Dog", "Pet"]);
    expect(implementsList).toEqual([]);
  });

  it("finds subtypes in text", () => {
    const source = `
      export class Animal {
        name: string;
      }
      export class Dog extends Animal {
        bark() {}
      }
      export class Cat extends Animal {
        meow() {}
      }
      export class GoldenRetriever extends Dog {
        fetch() {}
      }
    `;
    const animalSubtypes = findSubtypesInText(source, "Animal", "test.ts");
    expect(animalSubtypes.map((s) => s.name)).toEqual(["Dog", "Cat"]);

    const dogSubtypes = findSubtypesInText(source, "Dog", "test.ts");
    expect(dogSubtypes.map((s) => s.name)).toEqual(["GoldenRetriever"]);
  });
});
