import { GraphQLScalarType, Kind, type ValueNode } from "graphql";

function parseJSONLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return (ast as { value: unknown }).value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number((ast as { value: string }).value);
    case Kind.OBJECT: {
      const obj: Record<string, unknown> = {};
      for (const field of (ast as unknown as { fields: readonly { name: { value: string }; value: ValueNode }[] }).fields) {
        obj[field.name.value] = parseJSONLiteral(field.value);
      }
      return obj;
    }
    case Kind.LIST:
      return (ast as unknown as { values: readonly ValueNode[] }).values.map(parseJSONLiteral);
    case Kind.NULL:
      return null;
    default:
      return null;
  }
}

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
    parseLiteral: (ast) => parseJSONLiteral(ast),
  }),
};
