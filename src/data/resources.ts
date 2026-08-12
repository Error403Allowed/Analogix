import { RESOURCES, type ResourceLink, type SubjectResources as SharedSubjectResources } from "@analogix/shared/resources";
import type { SubjectId } from "@/constants/subjects";

export type { ResourceLink };
export type SubjectResources = Omit<SharedSubjectResources, "subjectId"> & { subjectId: SubjectId };

const typedResources = RESOURCES as SubjectResources[];

export default typedResources;
