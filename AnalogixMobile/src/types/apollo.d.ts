import type { TypedDocumentNode } from "@apollo/client";

declare module "graphql-tag" {
  function gql(
    literals: string | readonly string[],
    ...args: any[]
  ): TypedDocumentNode<any, any>;
}
