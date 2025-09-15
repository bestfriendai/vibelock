type CamelToSnake<S extends string> = S extends `${infer P1}${infer P2}`
  ? P2 extends Uncapitalize<P2>
    ? `${P1}${CamelToSnake<P2>}`
    : `${P1}_${CamelToSnake<Uncapitalize<P2>>}`
  : S;

type SnakeToCamel<S extends string> = S extends `${infer P1}_${infer P2}`
  ? `${P1}${Capitalize<SnakeToCamel<P2>>}`
  : S;

type CamelCaseKeys<T> = {
  [K in keyof T as SnakeToCamel<K & string>]: T[K];
};

type SnakeCaseKeys<T> = {
  [K in keyof T as CamelToSnake<K & string>]: T[K];
};

export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function mapFieldsToCamelCase<T extends Record<string, any>>(
  obj: T
): CamelCaseKeys<T> {
  if (!obj || typeof obj !== 'object') return obj as any;

  if (Array.isArray(obj)) {
    return obj.map(mapFieldsToCamelCase) as any;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = toCamelCase(key);
      const value = obj[key];

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[camelKey] = mapFieldsToCamelCase(value);
      } else if (Array.isArray(value)) {
        result[camelKey] = value.map(item =>
          typeof item === 'object' ? mapFieldsToCamelCase(item) : item
        );
      } else {
        result[camelKey] = value;
      }
    }
  }
  return result;
}

export function mapFieldsToSnakeCase<T extends Record<string, any>>(
  obj: T
): SnakeCaseKeys<T> {
  if (!obj || typeof obj !== 'object') return obj as any;

  if (Array.isArray(obj)) {
    return obj.map(mapFieldsToSnakeCase) as any;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = toSnakeCase(key);
      const value = obj[key];

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[snakeKey] = mapFieldsToSnakeCase(value);
      } else if (Array.isArray(value)) {
        result[snakeKey] = value.map(item =>
          typeof item === 'object' ? mapFieldsToSnakeCase(item) : item
        );
      } else {
        result[snakeKey] = value;
      }
    }
  }
  return result;
}

export function createFieldMapper<TCamel, TSnake>() {
  return {
    toCamel: (obj: TSnake): TCamel => mapFieldsToCamelCase(obj as any) as TCamel,
    toSnake: (obj: TCamel): TSnake => mapFieldsToSnakeCase(obj as any) as TSnake,
  };
}