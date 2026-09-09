import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';

const WITHDRAWN_NAME = '탈퇴된 회원';
const SYSTEM_NAME = '시스템';

interface SessionUser {
    _id: string;
    name: string;
    role?: string;
}

@Injectable()
export class ChatService {
    constructor(
        @InjectModel('chatRooms') private readonly chatRoomModel: Model<any>,
        @InjectModel('messages') private readonly messageModel: Model<any>,
        @InjectModel('users') private readonly usersModel: Model<any>,
    ) {}

    // 로그인한 사용자가 참여중인 대화방 목록(우편함)
    async getMailbox(sessionUser: SessionUser | undefined) {
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.', rooms: [] };
        }
        const myId = String(sessionUser._id);

        const rooms = await this.chatRoomModel
            .find({ participants: myId })
            .sort({ last_message_time: -1 })
            .lean()
            .exec();

        const otherIds = [
            ...new Set(
                rooms
                    .map((room: any) => room.participants.map(String).find((pid: string) => pid !== myId))
                    .filter(Boolean),
            ),
        ];
        const users = await this.usersModel.find({ _id: { $in: otherIds } }).select('name avatarPath').lean().exec();
        const userMap = new Map(users.map((user: any) => [String(user._id), user]));

        const rows = await Promise.all(
            rooms.map(async (room: any) => {
                const otherId = room.participants.map(String).find((pid: string) => pid !== myId) ?? null;
                const other = otherId ? userMap.get(otherId) : null;
                const unreadCount = await this.messageModel
                    .countDocuments({ roomId: room._id, isRead: false, senderId: { $ne: myId } })
                    .exec();

                return {
                    _id: room._id,
                    type: room.type,
                    auctionId: room.auctionId,
                    lastMessage: room.last_message,
                    lastMessageTime: room.last_message_time,
                    otherUser: {
                        _id: otherId,
                        name: other ? other.name : WITHDRAWN_NAME,
                        avatarPath: other ? other.avatarPath : '',
                    },
                    unreadCount,
                };
            }),
        );

        return { success: true, rooms: rows };
    }

    // 헤더 배지용 - 전체 안 읽은 메세지 수
    async getUnreadCount(sessionUser: SessionUser | undefined) {
        if (!sessionUser) {
            return { success: false, count: 0 };
        }
        const myRooms = await this.chatRoomModel.find({ participants: sessionUser._id }).select('_id').lean().exec();
        const count = await this.messageModel
            .countDocuments({
                roomId: { $in: myRooms.map((room: any) => room._id) },
                isRead: false,
                senderId: { $ne: sessionUser._id },
            })
            .exec();

        return { success: true, count };
    }

    // 다른 회원과의 1:1 대화방을 가져오거나 새로 만든다.
    async getOrCreateDmRoom(sessionUser: SessionUser | undefined, targetUserId: string) {
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.', room: null };
        }
        if (!isValidObjectId(targetUserId)) {
            return { success: false, message: '존재하지 않는 회원입니다.', room: null };
        }
        if (String(sessionUser._id) === String(targetUserId)) {
            return { success: false, message: '본인에게는 쪽지를 보낼 수 없습니다.', room: null };
        }

        const targetUser = await this.usersModel.findById(targetUserId).select('_id').exec();
        if (!targetUser) {
            return { success: false, message: '존재하지 않는 회원입니다.', room: null };
        }

        let room = await this.chatRoomModel
            .findOne({ type: 'dm', participants: { $all: [sessionUser._id, targetUserId], $size: 2 } })
            .exec();

        if (!room) {
            room = await this.chatRoomModel.create({
                type: 'dm',
                auctionId: null,
                participants: [sessionUser._id, targetUserId],
                createdAt: DateUtils.now_date(),
                last_message: '',
                last_message_time: DateUtils.now_date(),
            });
        }

        return { success: true, room };
    }

    // 대화 상대 정보 등 방 상세
    async getRoomDetail(sessionUser: SessionUser | undefined, roomId: string) {
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.', room: null };
        }
        if (!isValidObjectId(roomId)) {
            return { success: false, message: '존재하지 않는 대화방입니다.', room: null };
        }

        const room = await this.chatRoomModel.findById(roomId).lean().exec();
        if (!room) {
            return { success: false, message: '존재하지 않는 대화방입니다.', room: null };
        }
        const myId = String(sessionUser._id);
        if (!room.participants.map(String).includes(myId)) {
            return { success: false, message: '접근 권한이 없습니다.', room: null };
        }

        const otherId = room.participants.map(String).find((pid: string) => pid !== myId) ?? null;
        const other = otherId ? await this.usersModel.findById(otherId).select('name avatarPath role').exec() : null;

        return {
            success: true,
            room: {
                _id: room._id,
                type: room.type,
                auctionId: room.auctionId,
                otherUser: {
                    _id: otherId,
                    name: other ? other.name : WITHDRAWN_NAME,
                    avatarPath: other ? other.avatarPath : '',
                    role: other ? other.role : 'user',
                },
            },
        };
    }

    // 대화 내용을 불러오면서, 상대가 보낸 안 읽은 메세지를 읽음 처리한다.
    async getMessages(sessionUser: SessionUser | undefined, roomId: string) {
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.', messages: [] };
        }
        if (!isValidObjectId(roomId)) {
            return { success: false, message: '존재하지 않는 대화방입니다.', messages: [] };
        }

        const room = await this.chatRoomModel.findById(roomId).exec();
        if (!room) {
            return { success: false, message: '존재하지 않는 대화방입니다.', messages: [] };
        }
        if (!room.participants.map(String).includes(String(sessionUser._id))) {
            return { success: false, message: '접근 권한이 없습니다.', messages: [] };
        }

        const messages = await this.messageModel.find({ roomId: room._id }).sort({ createdAt: 1 }).exec();
        await this.markRead(sessionUser, roomId);

        return { success: true, messages };
    }

    // 상대가 보낸 메세지를 읽음 처리 (채팅방에 접속해 있는 동안에도 실시간으로 호출됨)
    async markRead(sessionUser: SessionUser | undefined, roomId: string) {
        if (!sessionUser || !isValidObjectId(roomId)) return;
        await this.messageModel
            .updateMany({ roomId, isRead: false, senderId: { $ne: sessionUser._id } }, { $set: { isRead: true } })
            .exec();
    }

    async sendMessage(sessionUser: SessionUser | undefined, roomId: string, content: string) {
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }
        if (!isValidObjectId(roomId)) {
            return { success: false, message: '존재하지 않는 대화방입니다.' };
        }

        const trimmed = (content ?? '').trim();
        if (!trimmed) {
            return { success: false, message: '메세지를 입력해 주세요.' };
        }
        if (trimmed.length > 1000) {
            return { success: false, message: '메세지는 1000자 이하로 입력해 주세요.' };
        }

        const room = await this.chatRoomModel.findById(roomId).exec();
        if (!room) {
            return { success: false, message: '존재하지 않는 대화방입니다.' };
        }
        const myId = String(sessionUser._id);
        if (!room.participants.map(String).includes(myId)) {
            return { success: false, message: '접근 권한이 없습니다.' };
        }

        const now = DateUtils.now_date();
        const message = await this.messageModel.create({
            roomId: room._id,
            senderId: sessionUser._id,
            senderName: sessionUser.name,
            content: trimmed,
            isSystem: false,
            isRead: false,
            createdAt: now,
        });

        await this.chatRoomModel.updateOne({ _id: room._id }, { $set: { last_message: trimmed, last_message_time: now } }).exec();

        const otherId = room.participants.map(String).find((pid: string) => pid !== myId) ?? null;

        return { success: true, message, roomId: String(room._id), otherId };
    }

    // 경매가 낙찰되면 주최자-낙찰자 전용 채팅방을 만들고, 우편함에 낙찰 안내 메세지를 남긴다.
    async createAuctionResultRoom(params: {
        auctionId: unknown;
        title: string;
        sellerId: unknown;
        winnerId: unknown;
        winnerName: string;
        finalPrice: number;
    }) {
        const { auctionId, title, sellerId, winnerId, winnerName, finalPrice } = params;
        if (!winnerId) return null; // 유찰이면 채팅방을 만들지 않는다.

        let room = await this.chatRoomModel.findOne({ type: 'auction', auctionId }).exec();
        if (!room) {
            room = await this.chatRoomModel.create({
                type: 'auction',
                auctionId,
                participants: [sellerId, winnerId],
                createdAt: DateUtils.now_date(),
                last_message: '',
                last_message_time: DateUtils.now_date(),
            });
        }

        const now = DateUtils.now_date();
        const content = `🎉 '${title}' 경매가 ${winnerName}님에게 ${finalPrice.toLocaleString()}원에 낙찰되었습니다. 이 채팅방에서 거래를 진행해 주세요.`;
        const message = await this.messageModel.create({
            roomId: room._id,
            senderId: null,
            senderName: SYSTEM_NAME,
            content,
            isSystem: true,
            isRead: false,
            createdAt: now,
        });

        await this.chatRoomModel.updateOne({ _id: room._id }, { $set: { last_message: content, last_message_time: now } }).exec();

        return { room, message };
    }
}
