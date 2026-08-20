import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptLocale from "@fullcalendar/core/locales/pt";

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
    <div className="alu-calendar rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locale={ptLocale}
        initialView="dayGridMonth"
        height="auto"
        dayMaxEvents={3}
        firstDay={1}
        buttonText={{
          today: "Hoje",
          month: "Mês",
          week: "Semana",
        }}
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
          const aberto = a.registration_status === "Aberto";
          return (
            <div className="flex items-start gap-1.5 px-1.5 py-1 text-xs leading-tight">
              <span
                aria-hidden
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: aberto ? "var(--accent)" : "rgba(255,255,255,0.5)" }}
              />
              <div className="min-w-0">
                <div className="truncate font-semibold">{info.event.title}</div>
                {cardFields.showDate && a.start_date && (
                  <div className="truncate opacity-80">{a.start_date}</div>
                )}
                {cardFields.showCategory && a.formato && (
                  <div className="truncate opacity-80">{a.formato}</div>
                )}
                {cardFields.showStatus && a.registration_status && (
                  <div className="truncate opacity-80">{a.registration_status}</div>
                )}
                {cardFields.showCapacity && a.max_capacity != null && (
                  <div className="truncate opacity-80">cap: {a.max_capacity}</div>
                )}
                {cardFields.showPrograma && a.programa_title && (
                  <div className="truncate opacity-80">{a.programa_title}</div>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

