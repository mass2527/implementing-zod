import { assertNever } from "./asserts";
import { floatSafeRemainder } from "./math";

abstract class ZodType<Output, Def> {
  readonly _output!: Output;
  readonly _def: Def;

  constructor(def: Def) {
    this._def = def;
  }

  protected abstract _parse(data: unknown):
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
  protected _parse(
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
  protected _parse(
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

export const z = {
  string: ZodString.create,
  number: ZodNumber.create,
};
