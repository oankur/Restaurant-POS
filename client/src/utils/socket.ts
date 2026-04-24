import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_API_URL || '/', { autoConnect: false });

export const joinOutlet = (outletId: string) => {
  if (!socket.connected) socket.connect();
  socket.emit('join_outlet', outletId);
};

export const leaveOutlet = (outletId: string) => {
  socket.emit('leave_outlet', outletId);
};
