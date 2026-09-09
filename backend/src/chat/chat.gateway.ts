import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

interface SessionUser {
    _id: string;
    name: string;
    role?: string;
}

@WebSocketGateway({
    cors: {
        origin: ['http://localhost:5173'],
        credentials: true,
    },
})
export class ChatGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly chatService: ChatService) {}

    private getSessionUser(client: Socket): SessionUser | undefined {
        return (client.request as any)?.session?.user;
    }

    // 로그인 상태가 확정된 시점(헤더 마운트 시)에 클라이언트가 명시적으로 알려주면
    // 개인 알림방(user:{id})에 합류시켜, 어느 화면에 있든 새 쪽지/낙찰 안내를 받을 수 있게 한다.
    @SubscribeMessage('chatIdentify')
    handleIdentify(@ConnectedSocket() client: Socket) {
        const sessionUser = this.getSessionUser(client);
        if (sessionUser) {
            client.join(`user:${sessionUser._id}`);
        }
    }

    @SubscribeMessage('chatJoinRoom')
    async handleJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
        const sessionUser = this.getSessionUser(client);
        const detail = await this.chatService.getRoomDetail(sessionUser, data?.roomId);
        if (!detail.success) {
            client.emit('chatError', { message: detail.message });
            return;
        }
        client.join(`room:${data.roomId}`);
        await this.chatService.markRead(sessionUser, data.roomId);
    }

    @SubscribeMessage('chatLeaveRoom')
    handleLeaveRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
        client.leave(`room:${data.roomId}`);
    }

    @SubscribeMessage('chatSendMessage')
    async handleSendMessage(
        @MessageBody() data: { roomId: string; content: string },
        @ConnectedSocket() client: Socket,
    ) {
        const sessionUser = this.getSessionUser(client);
        const result = await this.chatService.sendMessage(sessionUser, data?.roomId, data?.content);
        if (!result.success) {
            client.emit('chatError', { message: result.message });
            return;
        }
        this.server.to(`room:${data.roomId}`).emit('chatNewMessage', { message: result.message });
        if (result.otherId) {
            this.server.to(`user:${result.otherId}`).emit('chatMailboxUpdate', { roomId: result.roomId });
        }
    }
}
