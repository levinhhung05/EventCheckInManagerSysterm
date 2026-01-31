import { create } from 'zustand'

export const useEventStore = create((set) => ({
  selectedEvent: null,
  events: [],
  
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  
  setEvents: (events) => set({ events }),
  
  clearSelectedEvent: () => set({ selectedEvent: null }),
}))
