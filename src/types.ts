import { assertNever } from "./lib/asserts";
import { UnionToTupleString, Writable } from "./lib/types";
import { floatSafeRemainder } from "./lib/math";

type ZodTypeAny = ZodType<any, any>;
abstract class ZodType<Output, Def> {
  readonly _output!: Output;
  readonly _def: Def;

  constructor(def: Def) {
    this._def = def;
  }

  abstract _parse(data: unknown):
    | {
        isValid: true;
        data: Output;
      }
    | {
        isValid: false;
        reason?: string;
      };

  safeParse(
    data: unknown
  ): { success: true; data: Output } | { success: false; error: Error } {
    const result = this._parse(data);
    if (result.isValid) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        error: new Error(result.reason ?? "data is invalid"),
      };
    }
  }

  parse(data: unknown) {
    const result = this.safeParse(data);
    if (result.success) {
      return result.data;
    } else {
      throw result.error;
    }
  }

  optional() {
    return ZodOptional.create(this);
  }

  nullable() {
    return ZodNullable.create(this);
  }

  array() {
    return ZodArray.create(this);
  }
}

type ZodStringCheck =
  | {
      kind: "min";
      value: number;
      message?: string;
    }
  | {
      kind: "max";
      value: number;
      message?: string;
    }
  | {
      kind: "length";
      value: number;
      message?: string;
    }
  | {
      kind: "email";
      message?: string;
    }
  | {
      kind: "regex";
      regex: RegExp;
      message?: string;
    }
  | {
      kind: "trim";
      message?: string;
    };

type ZodStringDef = {
  checks: ZodStringCheck[];
};

class ZodString extends ZodType<string, ZodStringDef> {
  _parse(
    data: unknown
  ):
    | { isValid: false; reason?: string | undefined }
    | { isValid: true; data: string } {
    if (typeof data !== "string") {
      return {
        isValid: false,
        reason: `${data} is not a string`,
      };
    }

    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (data.length < check.value) {
          return {
            isValid: false,
            reason:
              check.message ??
              `${data} should be at least ${check.value} characters`,
          };
        }
      } else if (check.kind === "max") {
        if (data.length > check.value) {
          return {
            isValid: false,
            reason:
              check.message ??
              `${data} should be ${check.value} characters or fewer`,
          };
        }
      } else if (check.kind === "length") {
        if (data.length !== check.value) {
          return {
            isValid: false,
            reason:
              check.message ?? `${data} should be ${check.value} characters`,
          };
        }
      } else if (check.kind === "email") {
        const emailRegex =
          /^(?!\.)(?!.*\.\.)([A-Z0-9_+-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
        if (!emailRegex.test(data)) {
          return {
            isValid: false,
            reason: check.message ?? "invalid email",
          };
        }
      } else if (check.kind === "regex") {
        if (!check.regex.test(data)) {
          return {
            isValid: false,
            reason: check.message ?? `${data} does not satisfies given regex`,
          };
        }
      } else if (check.kind === "trim") {
        console.info("result", data.trim() === "hello");
        return {
          isValid: true,
          data: data.trim(),
        };
      } else {
        assertNever(check);
      }
    }

    return {
      isValid: true,
      data,
    };
  }

  private _addCheck(check: ZodStringCheck) {
    this._def.checks.push(check);

    return new ZodString({
      checks: this._def.checks,
    });
  }

  min(minLength: number, message?: string) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      message,
    });
  }

  max(maxLength: number, message?: string) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      message,
    });
  }

  length(length: number, message?: string) {
    return this._addCheck({
      kind: "length",
      value: length,
      message,
    });
  }

  email(message?: string) {
    return this._addCheck({
      kind: "email",
      message,
    });
  }

  regex(regex: RegExp, message?: string) {
    return this._addCheck({
      kind: "regex",
      regex,
      message,
    });
  }

  trim(message?: string) {
    return this._addCheck({
      kind: "trim",
      message,
    });
  }

  static create() {
    return new ZodString({
      checks: [],
    });
  }
}

type ZodNumberCheck =
  | {
      kind: "min";
      value: number;
      isInclusive: boolean;
      message?: string;
    }
  | {
      kind: "max";
      value: number;
      isInclusive: boolean;
      message?: string;
    }
  | {
      kind: "int";
      message?: string;
    }
  | {
      kind: "multipleOf";
      value: number;
      message?: string;
    }
  | {
      kind: "finite";
      message?: string;
    };

type ZodNumberDef = {
  checks: ZodNumberCheck[];
};

class ZodNumber extends ZodType<number, ZodNumberDef> {
  _parse(
    data: unknown
  ):
    | { isValid: false; reason?: string | undefined }
    | { isValid: true; data: number } {
    if (typeof data !== "number") {
      return {
        isValid: false,
        reason: `${data} is not a number`,
      };
    }

    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (check.isInclusive) {
          if (data < check.value) {
            return {
              isValid: false,
              reason:
                check.message ??
                `${data} should be greater than or equal to ${check.value}`,
            };
          }
        } else {
          if (data <= check.value) {
            return {
              isValid: false,
              reason:
                check.message ??
                `${data} should be greater than ${check.value}`,
            };
          }
        }
      } else if (check.kind === "max") {
        if (check.isInclusive) {
          if (data > check.value) {
            return {
              isValid: false,
              reason:
                check.message ??
                `${data} should be less than or equal to ${check.value}`,
            };
          }
        } else {
          if (data >= check.value) {
            return {
              isValid: false,
              reason:
                check.message ?? `${data} should be less than ${check.value}`,
            };
          }
        }
      } else if (check.kind === "int") {
        if (!Number.isInteger(data)) {
          return {
            isValid: false,
            reason: check.message ?? `${data} is not an integer`,
          };
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(data, check.value)) {
          return {
            isValid: false,
            reason:
              check.message ?? `${data} should be multiple of ${check.value}`,
          };
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(data)) {
          return {
            isValid: false,
            reason: check.message ?? `${data} is not a finite number`,
          };
        }
      } else {
        assertNever(check);
      }
    }

    return {
      isValid: true,
      data,
    };
  }

  private _addCheck(check: ZodNumberCheck) {
    this._def.checks.push(check);

    return new ZodNumber({
      checks: this._def.checks,
    });
  }

  gt(value: number, message?: string) {
    return this._addCheck({ kind: "min", value, isInclusive: false, message });
  }

  gte(value: number, message?: string) {
    return this._addCheck({ kind: "min", value, isInclusive: true, message });
  }

  lt(value: number, message?: string) {
    return this._addCheck({ kind: "max", value, isInclusive: false, message });
  }

  lte(value: number, message?: string) {
    return this._addCheck({ kind: "max", value, isInclusive: true, message });
  }

  int(message?: string) {
    return this._addCheck({ kind: "int", message });
  }

  positive(message?: string) {
    return this._addCheck({
      kind: "min",
      value: 0,
      isInclusive: false,
      message,
    });
  }

  nonnegative(message?: string) {
    return this._addCheck({
      kind: "min",
      value: 0,
      isInclusive: true,
      message,
    });
  }

  negative(message?: string) {
    return this._addCheck({
      kind: "max",
      value: 0,
      isInclusive: false,
      message,
    });
  }

  nonpositive(message?: string) {
    return this._addCheck({
      kind: "max",
      value: 0,
      isInclusive: true,
      message,
    });
  }

  multipleOf(value: number, message?: string) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message,
    });
  }

  finite(message?: string) {
    return this._addCheck({
      kind: "finite",
      message,
    });
  }

  safe(message?: string) {
    return this._addCheck({
      kind: "min",
      value: Number.MIN_SAFE_INTEGER,
      isInclusive: true,
      message,
    })._addCheck({
      kind: "max",
      value: Number.MAX_SAFE_INTEGER,
      isInclusive: true,
      message,
    });
  }

  static create() {
    return new ZodNumber({
      checks: [],
    });
  }
}

type ZodEnumDef<T extends [string, ...string[]]> = {
  values: T;
};

class ZodEnum<T extends [string, ...string[]]> extends ZodType<
  T[number],
  ZodEnumDef<T>
> {
  _parse(
    data: unknown
  ):
    | { isValid: false; reason?: string | undefined }
    | { isValid: true; data: any } {
    if (typeof data !== "string") {
      return {
        isValid: false,
        reason: `${data} should be string`,
      };
    }

    if (this._def.values.includes(data)) {
      return {
        isValid: true,
        data,
      };
    } else {
      return {
        isValid: false,
        reason: `${data} is not a tuple member of ${this._def.values}`,
      };
    }
  }

  get enum(): {
    [K in T[number]]: K;
  } {
    const entries = this._def.values.map((value) => [value, value]);
    return Object.fromEntries(entries);
  }

  static create<U extends string, T extends Readonly<[U, ...U[]]>>(
    values: T
  ): ZodEnum<Writable<T>>;
  static create<U extends string, T extends [U, ...U[]]>(values: T) {
    return new ZodEnum({
      values,
    });
  }
}

type ZodOptionalDef<T extends ZodTypeAny> = {
  innerType: T;
};

class ZodOptional<T extends ZodTypeAny> extends ZodType<
  T["_output"] | undefined,
  ZodOptionalDef<T>
> {
  _parse(
    data: unknown
  ):
    | { isValid: false; reason?: string | undefined }
    | { isValid: true; data: T["_output"] | undefined } {
    if (typeof data === "undefined") {
      return {
        isValid: true,
        data,
      };
    }

    return this._def.innerType._parse(data);
  }

  unwrap() {
    return this._def.innerType;
  }

  static create<T extends ZodTypeAny>(innerType: T) {
    return new ZodOptional({
      innerType,
    });
  }
}

type ZodNullableDef<T extends ZodTypeAny> = {
  innerType: T;
};

class ZodNullable<T extends ZodTypeAny> extends ZodType<
  T["_output"] | null,
  ZodNullableDef<T>
> {
  _parse(
    data: unknown
  ):
    | { isValid: false; reason?: string | undefined }
    | { isValid: true; data: T["_output"] | null } {
    if (data === null) {
      return {
        isValid: true,
        data,
      };
    }

    return this._def.innerType._parse(data);
  }

  unwrap() {
    return this._def.innerType;
  }

  static create<T extends ZodTypeAny>(innerType: T) {
    return new ZodNullable({
      innerType,
    });
  }
}

type ZodObjectDef<T extends Record<string, ZodTypeAny>> = {
  shape: T;
  extraKeyStrategy: "strip" | "passthrough" | "strict";
};

class ZodObject<T extends Record<string, ZodTypeAny>> extends ZodType<
  { [K in keyof T]: T[K]["_output"] },
  ZodObjectDef<T>
> {
  _parse(
    data: unknown
  ):
    | { isValid: false; reason?: string | undefined }
    | { isValid: true; data: { [K in keyof T]: T[K]["_output"] } } {
    if (typeof data === "object") {
      if (data === null) {
        return {
          isValid: false,
          reason: `${data} is null`,
        };
      }

      if (Array.isArray(data)) {
        return {
          isValid: false,
          reason: `${data} is an array`,
        };
      }

      if (
        "then" in data &&
        typeof data.then === "function" &&
        "catch" in data &&
        typeof data.catch === "function"
      ) {
        return {
          isValid: false,
          reason: `${data} is promise`,
        };
      }

      if (data instanceof RegExp) {
        return {
          isValid: false,
          reason: `${data} is a regex`,
        };
      }

      if (data instanceof Date) {
        return {
          isValid: false,
          reason: `${data} is an date`,
        };
      }

      if (data instanceof Set) {
        return {
          isValid: false,
          reason: `${data} is an set`,
        };
      }

      if (data instanceof Map) {
        return {
          isValid: false,
          reason: `${data} is an map`,
        };
      }

      const shapeKeys = Object.keys(this._def.shape);
      for (let i = 0; i < shapeKeys.length; ++i) {
        const shapeKey = shapeKeys[i];
        if (shapeKey && !(shapeKey in data)) {
          return {
            isValid: false,
            reason: `${shapeKey} is in ${this._def.shape}, but not in ${data}`,
          };
        }
      }

      const extraKeys = [];
      for (const key in data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }

      if (extraKeys.length > 0 && this._def.extraKeyStrategy === "strict") {
        return {
          isValid: false,
          reason: `extra key(s) found: ${extraKeys.join(", ")}`,
        };
      }

      const reshapedData: any = {};
      for (const key in data) {
        if (this._def.extraKeyStrategy === "strip") {
          if (!extraKeys.includes(key)) {
            reshapedData[key] = data[key as keyof typeof data];
          }
        } else {
          reshapedData[key] = data[key as keyof typeof data];
        }
      }

      for (const key in reshapedData) {
        const result = this._def.shape[key]?._parse(reshapedData[key]);
        if (result && !result.isValid) {
          return {
            isValid: false,
            reason: result.reason,
          };
        }
      }

      return {
        isValid: true,
        data: reshapedData,
      };
    } else {
      return {
        isValid: false,
        reason: `${data} is not an object`,
      };
    }
  }

  passthrough() {
    return new ZodObject({
      shape: this._def.shape,
      extraKeyStrategy: "passthrough",
    });
  }

  strict() {
    return new ZodObject({
      shape: this._def.shape,
      extraKeyStrategy: "strict",
    });
  }

  strip() {
    return new ZodObject({
      shape: this._def.shape,
      extraKeyStrategy: "strip",
    });
  }

  get shape() {
    return this._def.shape;
  }

  keyof(): ZodEnum<UnionToTupleString<keyof T>> {
    return ZodEnum.create(
      Object.keys(this._def.shape) as [string, ...string[]]
    ) as any;
  }

  extend<T extends Record<string, ZodTypeAny>>(shape: T) {
    return new ZodObject({
      ...this._def,
      shape: {
        ...this.shape,
        ...shape,
      },
    });
  }

  merge<T extends Record<string, ZodTypeAny>>(
    zodObject: ZodType<{ [K in keyof T]: T[K]["_output"] }, ZodObjectDef<T>>
  ) {
    return this.extend(zodObject._def.shape);
  }

  pick<Mask extends Partial<Record<keyof T, true>>>(
    mask: Mask
  ): ZodObject<Pick<T, Extract<keyof T, keyof Mask>>> {
    const newShape = {} as T;
    for (const key in this.shape) {
      if (mask[key]) {
        newShape[key] = this.shape[key];
      }
    }

    return new ZodObject({
      ...this._def,
      shape: newShape,
    });
  }

  omit<Mask extends Partial<Record<keyof T, true>>>(
    mask: Mask
  ): ZodObject<Omit<T, keyof Mask>> {
    const newShape = {} as T;

    for (const key in this.shape) {
      if (!mask[key]) {
        newShape[key] = this.shape[key];
      }
    }

    return new ZodObject({
      ...this._def,
      shape: newShape,
    });
  }

  partial<Mask extends Partial<Record<keyof T, true>>>(
    mask?: Mask
  ): ZodObject<{
    [K in keyof T]: K extends keyof Mask ? ZodOptional<T[K]> : T[K];
  }> {
    const newShape = {} as any;
    for (const key in this.shape) {
      if (mask) {
        if (mask[key]) {
          newShape[key] = this.shape[key]?.optional();
        } else {
          newShape[key] = this.shape[key];
        }
      } else {
        newShape[key] = this.shape[key]?.optional();
      }
    }

    return new ZodObject({
      ...this._def,
      shape: newShape,
    });
  }

  required<Mask extends Partial<Record<keyof T, true>>>(
    mask?: Mask
  ): ZodObject<{
    [K in keyof T]: K extends keyof Mask ? UnwrapOptional<T[K]> : T[K];
  }> {
    const newShape: any = {};

    for (const key in this.shape) {
      let zodTypeAny = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = zodTypeAny;
      } else {
        while (zodTypeAny instanceof ZodOptional) {
          zodTypeAny = zodTypeAny._def.innerType;
        }
        newShape[key] = zodTypeAny;
      }
    }

    return new ZodObject({
      ...this._def,
      shape: newShape,
    });
  }

  static create<T extends Record<string, ZodTypeAny>>(shape: T) {
    return new ZodObject({
      shape,
      extraKeyStrategy: "strip",
    });
  }
}

type ZodArrayCheck =
  | {
      kind: "min";
      value: number;
      message?: string;
    }
  | {
      kind: "max";
      value: number;
      message?: string;
    }
  | {
      kind: "length";
      value: number;
      message?: string;
    };

type ZodArrayDef<T> = {
  element: T;
  nonempty: boolean;
  checks: ZodArrayCheck[];
};

class ZodArray<T extends ZodTypeAny> extends ZodType<
  T["_output"][],
  ZodArrayDef<T>
> {
  _parse(
    data: unknown
  ):
    | { isValid: false; reason?: string | undefined }
    | { isValid: true; data: T[] } {
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        reason: `${data} is not an array`,
      };
    }

    if (this._def.nonempty && data.length === 0) {
      return {
        isValid: false,
        reason: `${data} should be non empty`,
      };
    }

    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (data.length < check.value) {
          return {
            isValid: false,
            reason: `${data}'s length should be greater or equal to ${check.value}`,
          };
        }
      } else if (check.kind === "max") {
        if (data.length > check.value) {
          return {
            isValid: false,
            reason: `${data}'s length should be less or equal to ${check.value}`,
          };
        }
      } else if (check.kind === "length") {
        if (data.length !== check.value) {
          return {
            isValid: false,
            reason: `${data}'s length should be ${check.value}`,
          };
        }
      } else {
        assertNever(check);
      }
    }

    for (let i = 0; i < data.length; ++i) {
      const item = data[i];

      const result = this._def.element._parse(item);
      if (!result.isValid) {
        return {
          isValid: false,
          reason: result.reason,
        };
      }
    }

    return {
      isValid: true,
      data,
    };
  }

  get element() {
    return this._def.element;
  }

  nonempty() {
    return new ZodArray({
      ...this._def,
      nonempty: true,
    });
  }

  _addCheck(check: ZodArrayCheck) {
    this._def.checks.push(check);

    return new ZodArray({
      ...this._def,
      checks: this._def.checks,
    });
  }

  min(minLength: number, message?: string) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      message,
    });
  }

  max(maxLength: number, message?: string) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      message,
    });
  }

  length(length: number, message?: string) {
    return this._addCheck({
      kind: "length",
      value: length,
      message,
    });
  }

  static create<T extends ZodTypeAny>(element: T) {
    return new ZodArray({
      element,
      nonempty: false,
      checks: [],
    });
  }
}

export const z = {
  string: ZodString.create,
  number: ZodNumber.create,
  enum: ZodEnum.create,
  optional: ZodOptional.create,
  nullable: ZodNullable.create,
  object: ZodObject.create,
  array: ZodArray.create,
};

type UnwrapOptional<T extends ZodTypeAny> = T extends ZodOptional<infer U>
  ? UnwrapOptional<U>
  : T;
