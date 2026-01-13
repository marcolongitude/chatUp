import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetChatMessagesUseCase } from '../../core/use-cases/message/get-chat-messages.use-case';
import { SendMessageUseCase } from '../../core/use-cases/message/send-message.use-case';
import { SendMessageDto } from '../../core/dtos/send-message.dto';

interface AuthenticatedUser {
  id: string;
  userId: string;
  email?: string;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly getChatMessagesUseCase: GetChatMessagesUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
  ) {}

  @Get('messages/:contactId')
  async getMessages(
    @Request() req: AuthenticatedRequest,
    @Param('contactId') contactId: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ) {
    const userId = req.user.userId;
    const messages = await this.getChatMessagesUseCase.execute(
      userId,
      contactId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );

    return messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      content: m.content,
      timestamp: m.timestamp,
      isDelivered: m.isDelivered,
      isRead: m.isRead,
    }));
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SendMessageDto,
  ) {
    const userId = req.user.userId;
    const message = await this.sendMessageUseCase.execute({
      senderId: userId,
      receiverId: dto.receiverId,
      content: dto.content,
    });

    return {
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      timestamp: message.timestamp,
      isDelivered: message.isDelivered,
      isRead: message.isRead,
    };
  }
}
