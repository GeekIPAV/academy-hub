import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { AcaoRow } from "@/lib/admin-acoes-gestao.functions";

export interface CardFieldsConfig {
  showDate: boolean;
  showCategory: boolean;
  showStatus: boolean;
  showCapacity: boolean;
  showPrograma: boolean;
}

export const DEFAULT_CARD_FIELDS: CardFieldsConfig = {
  showDate: true,
  showCategory: true,
  showStatus: false,
  showCapacity: false,
  showPrograma: false,
};

interface Props {
  data: AcaoRow[];
  cardFields: CardFieldsConfig;
  onOpen: (id: string) => void;
}

export function AcoesCalendar({ data, cardFields, onOpen }: Props) {
  const events = useMemo(
    () =>
      data
        .filter((a) => a.start_date)
        .map((a) => ({
          id: a.id,
          title: a.title ?? "(sem título)",
          start: a.start_date ?? undefined,
          end: a.end_date ?? undefined,
          extendedProps: a,
        })),
    [data],
  );

  return (
    <div className="rounded-md border bg-card p-3 [&_.fc]:font-sans [&_.fc_.fc-button]:bg-primary [&_.fc_.fc-button]:border-primary [&_.fc_.fc-button:hover]:bg-primary/90">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height="auto"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek",
        }}
        events={events}
        eventClick={(info) => {
          onOpen(info.event.id);
        }}
        eventContent={(info) => {
          const a = info.event.extendedProps as AcaoRow;
          return (
            <div className="px-1 py-0.5 text-xs leading-tight">
              <div className="truncate font-medium">{info.event.title}</div>
              {cardFields.showDate && a.start_date && (
                <div className="opacity-80">{a.start_date}</div>
              )}
              {cardFields.showCategory && a.formato && (
                <div className="opacity-80">{a.formato}</div>
              )}
              {cardFields.showStatus && a.registration_status && (
                <div className="opacity-80">{a.registration_status}</div>
              )}
              {cardFields.showCapacity && a.max_capacity != null && (
                <div className="opacity-80">cap: {a.max_capacity}</div>
              )}
              {cardFields.showPrograma && a.programa_title && (
                <div className="truncate opacity-80">{a.programa_title}</div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
