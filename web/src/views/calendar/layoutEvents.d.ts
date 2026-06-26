import { AppEvent } from "@/types/events";
export interface LayoutEvent {
    event: AppEvent;
    top: number;
    height: number;
    col: number;
    totalCols: number;
    span: number;
}
export declare function layoutEvents(events: AppEvent[], hourH: number): LayoutEvent[];
//# sourceMappingURL=layoutEvents.d.ts.map