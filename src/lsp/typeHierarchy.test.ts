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

  it("parses extends clauses with generic type arguments without breaking on commas", () => {
    const line = "export interface Foo<T> extends Bar<T, U>, Baz<Record<string, number>> {";
    const { extendsList, implementsList } = parseSupertypes(line);
    expect(extendsList).toEqual(["Bar", "Baz"]);
    expect(implementsList).toEqual([]);
  });

  it("parses class with generic extends and generic implements clauses", () => {
    const line = "export class CustomMap<K, V> extends BaseMap<K, V> implements IMap<K, V>, Serializable {";
    const { extendsList, implementsList } = parseSupertypes(line);
    expect(extendsList).toEqual(["BaseMap"]);
    expect(implementsList).toEqual(["IMap", "Serializable"]);
  });

  it("finds subtypes that use generic type arguments", () => {
    const source = `
      export class BaseRepo<T> {}
      export class UserRepo extends BaseRepo<User> {}
      export class OrderRepo<T> extends BaseRepo<T> {}
      export interface IHandler<Req, Res> {}
      export class ApiHandler implements IHandler<Request, Response> {}
    `;
    const baseSubtypes = findSubtypesInText(source, "BaseRepo", "test.ts");
    expect(baseSubtypes.map((s) => s.name)).toEqual(["UserRepo", "OrderRepo"]);
    expect(baseSubtypes.map((s) => s.detail)).toEqual(["extends", "extends"]);

    const handlerSubtypes = findSubtypesInText(source, "IHandler", "test.ts");
    expect(handlerSubtypes.map((s) => s.name)).toEqual(["ApiHandler"]);
    expect(handlerSubtypes[0].detail).toBe("implements");
  });
});
