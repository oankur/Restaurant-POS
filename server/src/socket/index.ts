import { Server, Socket } from 'socket.io';

let io: Server;

export const setupSocket = (socketServer: Server) => {
  io = socketServer;
  io.on('connection', (socket: Socket) => {
    socket.on('join_outlet', (outletId: string) => {
      socket.join(outletId);
    });
    socket.on('leave_outlet', (outletId: string) => {
      socket.leave(outletId);
    });
  });
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
