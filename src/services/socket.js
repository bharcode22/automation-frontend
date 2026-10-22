import { io } from 'socket.io-client';
import { getBackendBaseUrl } from './api';

let socketInstance = null;

export function getSocket() {
  const url = getBackendBaseUrl();
  if (!socketInstance || socketInstance._currentUrl !== url) {
    if (socketInstance) {
      socketInstance.disconnect();
    }
    socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    socketInstance._currentUrl = url;
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
