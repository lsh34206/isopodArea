import { Schema, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { deflate } from 'zlib';


export const messageSchema = new Schema({
    roomId: {type: Schema.Types.ObjectId, required: true},
    senderId: {type: Schema.Types.ObjectId, default: null}, // 시스템(낙찰 안내) 메세지는 발신자가 없다
    senderName: {type: String, default: ''},
    content: {type: String, required: true},
    isSystem: {type: Boolean, default: false},
    isRead: {type: Boolean, default: false},
    createdAt: { type: Date, default: DateUtils.now_date() },
    //ref:'chatrooms'
});