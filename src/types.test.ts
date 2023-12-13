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
