import type { ComponentType } from "react";
import { WidgetWelcome } from "@/components/widgets/WidgetWelcome";
import { WidgetElearning } from "@/components/widgets/WidgetElearning";
import { WidgetProgramStatus } from "@/components/widgets/WidgetProgramStatus";
import { WidgetTrainerCohorts } from "@/components/widgets/WidgetTrainerCohorts";
import { WidgetAdminStats } from "@/components/widgets/WidgetAdminStats";

export const WIDGET_REGISTRY: Record<string, ComponentType> = {
  welcome: WidgetWelcome,
  elearning: WidgetElearning,
  "program-status": WidgetProgramStatus,
  "trainer-cohorts": WidgetTrainerCohorts,
  "admin-stats": WidgetAdminStats,
};
