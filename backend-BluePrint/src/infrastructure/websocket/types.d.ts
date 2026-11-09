// Temporary type declarations until packages are installed
// Remove this file after running: npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

declare module '@nestjs/websockets' {
  export function WebSocketGateway(options?: any): ClassDecorator;
  export function WebSocketServer(): PropertyDecorator;
  export interface OnGatewayConnection {
    handleConnection(client: any): any;
  }
  export interface OnGatewayDisconnect {
    handleDisconnect(client: any): any;
  }
  export interface OnGatewayInit {
    afterInit(server?: any): any;
  }
}

declare module 'socket.io' {
  export interface Socket {
    id: string;
    handshake: {
      query: Record<string, string | string[]>;
      headers: Record<string, string>;
    };
    emit(event: string, data?: any): boolean;
    disconnect(close?: boolean): this;
  }
  
  export class Server {
    emit(event: string, data?: any): boolean;
  }
}
