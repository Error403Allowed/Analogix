import { GraphQLScalarType, Kind } from "graphql";

export const scalarResolvers = {
  DateTime: new GraphQLScalarType({
    name: "DateTime",
    description: "ISO-8601 date-time string",
    serialize(value: unknown): string {
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "string") return value;
      throw new Error("DateTime must be a Date or ISO string");
    },
    parseValue(value: unknown): string {
      if (typeof value !== "string") throw new Error("DateTime input must be a string");
      return value;
    },
    parseLiteral(ast): string | null {
      if (ast.kind === Kind.STRING) return ast.value;
      return null;
    },
  }),

  JSON: new GraphQLScalarType({
    name: "JSON",
    description: "Arbitrary JSON value",
    serialize: (v) => v,
    parseValue: (v) => v,
    parseLiteral(ast): unknown {
      switch (ast.kind) {
        case Kind.STRING:
        case Kind.BOOLEAN:
          return ast.value;
        case Kind.INT:
        case Kind.FLOAT:
          return Number(ast.value);
        case Kind.OBJECT: {
          const obj: Record<string, unknown> = {};
          ast.fields.forEach((f) => {
            obj[f.name.value] = (f.value as { value?: unknown }).value;
          });
          return obj;
        }
        case Kind.LIST:
          return ast.values.map((v) => (v as { value?: unknown }).value);
        default:
          return null;
      }
    },
  }),
};
