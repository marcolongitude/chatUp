/**
 * @deprecated This WebSocket Gateway is deprecated in favor of Electric SQL streaming.
 * Electric SQL provides real-time synchronization via PostgreSQL replication.
 * This gateway is kept temporarily for backward compatibility during migration.
 *
 * Migration status: In progress
 * Removal target: After full Electric SQL migration is complete
 *
 * New implementation: Use TanStack DB collections with Electric SQL sync
 * See: src/core/collections/messagesCollection.ts
 */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SendMessageUseCase } from '../../core/use-cases/message/send-message.use-case';
import { SendMessageDto } from '../../core/dtos/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust for production
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly sendMessageUseCase: SendMessageUseCase) {}

  handleConnection(client: Socket) {
    console.warn(
      '⚠️ [DEPRECATED] WebSocket connection - migrate to Electric SQL',
    );
    console.log(`Client connected: ${client.id}`);
    // Authenticate client via handshake query or headers here
    const userId = client.handshake.query.userId;
    if (userId) {
      client.join(userId); // Join a room for their user ID
      console.log(`Client ${client.id} joined room ${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    console.warn(
      '⚠️ [DEPRECATED] WebSocket sendMessage - migrate to Electric SQL',
    );
    console.log('Received message:', dto);

    // Save to DB
    const message = await this.sendMessageUseCase.execute(dto);

    // Emit to Receiver
    // Note: With Electric SQL, messages sync automatically via PostgreSQL replication
    // This emit is kept for backward compatibility only
    this.server.to(dto.receiverId).emit('newMessage', message);

    // Ack to Sender
    return { status: 'ok', message };
  }
}
