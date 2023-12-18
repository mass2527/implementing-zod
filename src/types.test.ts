import { expect, expectTypeOf, test } from "vitest";
import { z } from "./types";

test("ZodString", () => {
  const string = z.string();

  // safeParse
  expect(string.safeParse("1").success).toBe(true);
  expect(string.safeParse(1).success).toBe(false);

  // parse
  expect(string.parse("1"));
  expect(() => string.parse(1)).toThrow();

  // output
  expectTypeOf(string["_output"]).toBeString();

  // min
  const minFive = z.string().min(5);
  expect(() => minFive.parse("a")).toThrow();
  expect(minFive.parse("abcde")).toBe("abcde");

  // max
  const maxFive = z.string().max(5);
  expect(maxFive.parse("a")).toBe("a");
  expect(() => maxFive.parse("abcdef")).toThrow();

  // length
  const five = z.string().length(5);
  expect(() => five.parse("a")).toThrow();
  expect(five.parse("abcde")).toBe("abcde");

  // email
  const email = z.string().email();
  expect(() => email.parse("test@")).toThrow();
  expect(email.parse("test@gmail.com")).toBe("test@gmail.com");

  // regex
  const startsWithHelloString = z.string().regex(/^hello/);
  expect(() => startsWithHelloString.parse("abc")).toThrow();
  expect(startsWithHelloString.parse("hello world")).toBe("hello world");

  // trim
  const trim = z.string().trim();
  expect(trim.parse(" hello")).toBe("hello");
});

test("ZodNumber", () => {
  const number = z.number();

  // safeParse
  expect(number.safeParse("1").success).toBe(false);
  expect(number.safeParse(1).success).toBe(true);

  // parse
  expect(number.parse(1));
  expect(() => number.parse("1")).toThrow();

  // output
  expectTypeOf(number["_output"]).toBeNumber();

  // gt
  const gtFive = z.number().gt(5);
  expect(gtFive.parse(6)).toBe(6);
  expect(() => gtFive.parse(5)).toThrow();

  // gte
  const gteFive = z.number().gte(5);
  expect(gteFive.parse(5)).toBe(5);
  expect(() => gteFive.parse(4)).toThrow();

  // lt
  const ltFive = z.number().lt(5);
  expect(ltFive.parse(4)).toBe(4);
  expect(() => ltFive.parse(5)).toThrow();

  // lte
  const lteFive = z.number().lte(5);
  expect(lteFive.parse(5)).toBe(5);
  expect(() => lteFive.parse(6)).toThrow();

  // int
  const int = z.number().int();
  expect(int.parse(5)).toBe(5);
  expect(() => lteFive.parse(5.1)).toThrow();

  // positive
  const positive = z.number().positive();
  expect(() => positive.parse(-Number.MIN_VALUE)).toThrow();
  expect(() => positive.parse(0)).toThrow();
  expect(positive.parse(Number.MIN_VALUE)).toBe(Number.MIN_VALUE);

  // nonnegative
  const nonnegative = z.number().nonnegative();
  expect(() => nonnegative.parse(-Number.MIN_VALUE)).toThrow();
  expect(nonnegative.parse(0)).toBe(0);
  expect(nonnegative.parse(Number.MIN_VALUE)).toBe(Number.MIN_VALUE);

  // negative
  const negative = z.number().negative();
  expect(negative.parse(-Number.MIN_VALUE)).toBe(-Number.MIN_VALUE);
  expect(() => negative.parse(0)).toThrow();
  expect(() => negative.parse(Number.MIN_VALUE)).toThrow();

  // nonpositive
  const nonpositive = z.number().nonpositive();
  expect(nonpositive.parse(-Number.MIN_VALUE)).toBe(-Number.MIN_VALUE);
  expect(nonpositive.parse(0)).toBe(0);
  expect(() => nonpositive.parse(Number.MIN_VALUE)).toThrow();

  // multipleOf
  const multipleOfFive = z.number().multipleOf(5);
  expect(multipleOfFive.parse(5)).toBe(5);
  expect(() => multipleOfFive.parse(4)).toThrow();

  const multipleOfOneTenth = z.number().multipleOf(0.1);
  expect(multipleOfOneTenth.parse(49.9)).toBe(49.9);

  // finite
  const finite = z.number().finite();
  expect(() => finite.parse(Infinity)).toThrow();
  expect(() => finite.parse(-Infinity)).toThrow();
  expect(() => finite.parse(0 / 0)).toThrow();
  expect(finite.parse(0)).toBe(0);

  // safe
  const safe = z.number().safe();
  expect(safe.parse(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  expect(() => safe.parse(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  expect(safe.parse(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER);
  expect(() => safe.parse(Number.MIN_SAFE_INTEGER - 1)).toThrow();
});

test("ZodEnum", () => {
  const fishEnum = z.enum(["Salmon", "Tuna", "Trout"]);

  // safeParse
  expect(fishEnum.safeParse("Solomon").success).toBe(false);
  expect(fishEnum.safeParse("Salmon").success).toBe(true);

  // parse
  expect(fishEnum.parse("Salmon"));
  expect(() => fishEnum.parse("Solomon")).toThrow();

  // output type
  expectTypeOf(fishEnum["_output"]).toEqualTypeOf<
    "Salmon" | "Tuna" | "Trout"
  >();

  // readonly type
  const readonly = ["Salmon", "Tuna", "Trout"] as const;
  z.enum(readonly);

  // enum
  expectTypeOf(fishEnum.enum).toEqualTypeOf<{
    Salmon: "Salmon";
    Tuna: "Tuna";
    Trout: "Trout";
  }>();
  expect(fishEnum.enum).toEqual({
    Salmon: "Salmon",
    Tuna: "Tuna",
    Trout: "Trout",
  });
});

test("ZodOptional", () => {
  // optional
  const optionalString1 = z.optional(z.string());
  expect(optionalString1.parse(undefined)).toBeUndefined();
  expect(optionalString1.parse("hello")).toBe("hello");
  expectTypeOf(optionalString1["_output"]).toEqualTypeOf<string | undefined>();

  const optionalString2 = z.string().optional();
  expect(optionalString2.parse(undefined)).toBeUndefined();
  expect(optionalString2.parse("hello")).toBe("hello");
  expectTypeOf(optionalString2["_output"]).toEqualTypeOf<string | undefined>();

  // unwrap
  const optionalString = z.string().optional();
  const string = optionalString.unwrap();
  expect(() => string.parse(undefined)).toThrow();
  expect(string.parse("hello")).toBe("hello");
  expectTypeOf(string["_output"]).toEqualTypeOf<string>();
});

test("ZodNullable", () => {
  // nullable
  const nullableString1 = z.nullable(z.string());
  expect(nullableString1.parse("hello")).toBe("hello");
  expect(nullableString1.parse(null)).toBeNull();
  expectTypeOf(nullableString1["_output"]).toEqualTypeOf<string | null>();

  const nullableString2 = z.string().nullable();
  expect(nullableString2.parse("hello")).toBe("hello");
  expect(nullableString2.parse(null)).toBeNull();
  expectTypeOf(nullableString2["_output"]).toEqualTypeOf<string | null>();

  // // unwrap
  const nullableString = z.string().nullable();
  const string = nullableString.unwrap();
  expect(() => string.parse(null)).toThrow();
  expect(string.parse("hello")).toBe("hello");
  expectTypeOf(string["_output"]).toEqualTypeOf<string>();
});

test("ZodObject - strip(default)", () => {
  const personSchema = z.object({
    name: z.string(),
    age: z.number(),
    bloodType: z.enum(["A", "B", "AB", "O"]),
  });
  expect(
    personSchema.parse({
      name: "mike",
      age: 20,
      bloodType: "A",

      someExtraKey: "this is extra key",
    })
  ).toEqual({
    name: "mike",
    age: 20,
    bloodType: "A",
  });
  expect(() =>
    personSchema.parse({
      name: "mike",
      age: 20,
    })
  ).toThrow();
});

test("ZodObject - passthrough", () => {
  const personSchemaPassthrough = z
    .object({
      name: z.string(),
      age: z.number(),
      bloodType: z.enum(["A", "B", "AB", "O"]),
    })
    .passthrough();
  expect(
    personSchemaPassthrough.passthrough().parse({
      name: "mike",
      age: 20,
      bloodType: "A",

      someExtraKey: "this is extra key",
    })
  ).toEqual({
    name: "mike",
    age: 20,
    bloodType: "A",

    someExtraKey: "this is extra key",
  });

  expect(() =>
    personSchemaPassthrough.parse({
      name: "mike",
      age: 20,
    })
  ).toThrow();
});

test("ZodObject - strict", () => {
  const personSchemaStrict = z
    .object({
      name: z.string(),
      age: z.number(),
      bloodType: z.enum(["A", "B", "AB", "O"]),
    })
    .strict();
  expect(() =>
    personSchemaStrict.strict().parse({
      name: "mike",
      age: 20,
      bloodType: "A",

      someExtraKey: "this is extra key",
    })
  ).toThrow();
});

test("ZodObject - strict then strip", () => {
  const personSchemaStrictThenStrip = z
    .object({
      name: z.string(),
      age: z.number(),
      bloodType: z.enum(["A", "B", "AB", "O"]),
    })
    .strict()
    .strip();
  expect(
    personSchemaStrictThenStrip.strict().strip().parse({
      name: "mike",
      age: 20,
      bloodType: "A",

      someExtraKey: "this is extra key",
    })
  ).toEqual({
    name: "mike",
    age: 20,
    bloodType: "A",
  });
});

test("ZodObject - non object input", () => {
  const person = z.object({
    name: z.string(),
    age: z.number(),
    bloodType: z.enum(["A", "B", "AB", "O"]),
  });

  // null
  expect(() => person.parse(null)).toThrow();

  // array
  expect(() => person.parse([])).toThrow();

  // promise
  expect(() => person.parse(new Promise(() => {}))).toThrow();

  // regex
  expect(() => person.parse(/123/)).toThrow();

  // date
  expect(() => person.parse(new Date())).toThrow();

  // set
  expect(() => person.parse(new Set())).toThrow();

  // map
  expect(() => person.parse(new Map())).toThrow();

  // type
  expectTypeOf(person["_output"]).toEqualTypeOf<{
    name: string;
    age: number;
    bloodType: "A" | "B" | "O" | "AB";
  }>();
});

test("ZodObject - shape", () => {
  const dogSchema = z.object({
    name: z.string(),
    age: z.number(),
  });
  expectTypeOf(dogSchema.shape.name["_output"]).toEqualTypeOf<string>();
  expectTypeOf(dogSchema.shape.age["_output"]).toEqualTypeOf<number>();
});

test("ZodObject - keyof", () => {
  const dogSchema = z.object({
    name: z.string(),
    age: z.number(),
  });
  const keySchema = dogSchema.keyof();
  expect(keySchema.parse("name")).toBe("name");
  expect(keySchema.parse("age")).toBe("age");
  expect(() => keySchema.parse("weight")).toThrow();
});

test("ZodObject - extend", () => {
  const dogWithBreed = z
    .object({
      name: z.string(),
      age: z.number(),
    })
    .extend({
      breed: z.string(),
    });
  expectTypeOf(dogWithBreed["_output"]).toEqualTypeOf<{
    name: string;
    age: number;
    breed: string;
  }>();

  expect(() =>
    dogWithBreed.parse({
      name: "Bailey",
      age: 2,
    })
  ).toThrow();
  expect(
    dogWithBreed.parse({
      name: "Bailey",
      age: 2,
      breed: "Bulldog",
    })
  ).toEqual({
    name: "Bailey",
    age: 2,
    breed: "Bulldog",
  });

  const overwrittenDogWithBreed = dogWithBreed.extend({
    breed: z.enum(["Poodle", "Boxer"]),
  });
  expect(() =>
    overwrittenDogWithBreed.parse({
      name: "Bailey",
      age: 2,
      breed: "Bulldog",
    })
  ).toThrow();
  expect(
    overwrittenDogWithBreed.parse({
      name: "Bailey",
      age: 2,
      breed: "Poodle",
    })
  ).toEqual({
    name: "Bailey",
    age: 2,
    breed: "Poodle",
  });
  expectTypeOf(overwrittenDogWithBreed["_output"]).toEqualTypeOf<{
    name: string;
    age: number;
    breed: "Poodle" | "Boxer";
  }>();
});

test("ZodObject - merge", () => {
  const teacherWithId = z
    .object({ subject: z.string() })
    .merge(z.object({ id: z.string() }));
  expectTypeOf(teacherWithId["_output"]).toEqualTypeOf<{
    subject: string;
    id: string;
  }>();

  expect(
    teacherWithId.parse({
      subject: "math",
      id: "a",
    })
  ).toEqual({
    subject: "math",
    id: "a",
  });
});

test("ZodObject - pick", () => {
  const recipeName = z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .pick({ name: true });
  expectTypeOf(recipeName["_output"]).toEqualTypeOf<{
    name: string;
  }>();

  expect(
    recipeName.parse({
      name: "chicken",
    })
  ).toEqual({
    name: "chicken",
  });
});

test("ZodObject - omit", () => {
  const noIdRecipe = z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .omit({ id: true });
  expectTypeOf(noIdRecipe["_output"]).toEqualTypeOf<{
    name: string;
  }>();

  expect(
    noIdRecipe.parse({
      name: "a",
    })
  ).toEqual({
    name: "a",
  });
});

test("ZodObject - partial", () => {
  const partialUser = z
    .object({
      email: z.string(),
      username: z.string(),
    })
    .partial();
  expectTypeOf(partialUser["_output"]).toEqualTypeOf<{
    email: string | undefined;
    username: string | undefined;
  }>();

  expect(
    partialUser.parse({
      email: undefined,
      username: undefined,
    })
  ).toEqual({
    email: undefined,
    username: undefined,
  });
});

test("ZodObject - required", () => {
  const requiredUser = z
    .object({
      email: z.string().optional(),
      username: z.string().optional(),
    })
    .required();
  expectTypeOf(requiredUser["_output"]).toEqualTypeOf<{
    email: string;
    username: string;
  }>();

  expect(() =>
    requiredUser.parse({
      email: undefined,
      username: undefined,
    })
  ).toThrow();
  expect(
    requiredUser.parse({
      email: "test@gmail.com",
      username: "test",
    })
  ).toEqual({
    email: "test@gmail.com",
    username: "test",
  });
});
