import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./src/schema/typeDefs.ts",
  generates: {
    "./src/graphql/generated/types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useTypeImports: true,
        contextType: "../../context#GraphQLContext",
        skipTypename: true,
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
