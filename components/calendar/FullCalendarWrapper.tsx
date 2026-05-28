'use client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { IMeeting } from '@/lib/types';

interface Props {
  events: any[];
  onDateClick: (dateStr: string) => void;
  onEventClick: (meeting: IMeeting) => void;
}

export default function FullCalendarWrapper({ events, onDateClick, onEventClick }: Props) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listWeek',
      }}
      events={events}
      dateClick={({ dateStr }) => onDateClick(dateStr)}
      eventClick={({ event }) => {
        const meeting = event.extendedProps.meeting as IMeeting;
        if (meeting) onEventClick(meeting);
      }}
      eventDisplay="block"
      dayMaxEvents={3}
      height={600}
      eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: 'short' }}
      slotEventOverlap={false}
      nowIndicator={true}
    />
  );
}
