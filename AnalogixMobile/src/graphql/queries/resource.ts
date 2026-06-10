import { gql } from "@apollo/client";

export const RESOURCES = gql`
  query Resources($subjectId: String) {
    resources(subjectId: $subjectId) {
      id
      name
      type
      mimeType
      sizeBytes
      url
      thumbnailUrl
      subjectId
      createdAt
    }
  }
`;

export const UPLOAD_RESOURCE = gql`
  mutation UploadResource($name: String!, $mimeType: String!, $base64: String!, $subjectId: String) {
    uploadResource(name: $name, mimeType: $mimeType, base64: $base64, subjectId: $subjectId) {
      id
      name
      type
      mimeType
      sizeBytes
      url
      thumbnailUrl
      subjectId
      createdAt
    }
  }
`;

export const DELETE_RESOURCE = gql`
  mutation DeleteResource($id: ID!) {
    deleteResource(id: $id) {
      success
    }
  }
`;
