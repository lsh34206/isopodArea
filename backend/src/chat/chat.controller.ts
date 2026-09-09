import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Get('rooms')
    async getMailbox(@Req() req) {
        return this.chatService.getMailbox(req.session?.user);
    }

    @Get('rooms/unread-count')
    async getUnreadCount(@Req() req) {
        return this.chatService.getUnreadCount(req.session?.user);
    }

    @Post('rooms/dm')
    async getOrCreateDmRoom(@Body() body, @Req() req) {
        return this.chatService.getOrCreateDmRoom(req.session?.user, body?.targetUserId);
    }

    @Get('rooms/:roomId')
    async getRoomDetail(@Param('roomId') roomId: string, @Req() req) {
        return this.chatService.getRoomDetail(req.session?.user, roomId);
    }

    @Get('rooms/:roomId/messages')
    async getMessages(@Param('roomId') roomId: string, @Req() req) {
        return this.chatService.getMessages(req.session?.user, roomId);
    }

    @Post('rooms/:roomId/messages')
    async sendMessage(@Param('roomId') roomId: string, @Body() body, @Req() req) {
        return this.chatService.sendMessage(req.session?.user, roomId, body?.content);
    }
}
