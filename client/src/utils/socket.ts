import { io } from 'socket.io-client';

export const socket = io('/', { autoConnect: false });

export const joinOutlet = (outletId: string) => {
  if (!socket.connected) socket.connect();
  socket.emit('join_outlet', outletId);
};

export const leaveOutlet = (outletId: string) => {
  socket.emit('leave_outlet', outletId);
};
