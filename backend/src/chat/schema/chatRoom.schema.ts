import { Schema, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { deflate } from 'zlib';


export const chatroomSchema = new Schema({
    type: {type: String, required: true},
    auctionId: {type: Schema.Types.ObjectId, default:null},
    createdAt: { type: Date, default: DateUtils.now_date() },
    participants: {type: [Schema.Types.ObjectId], required: true},
    last_message: {type: String, default: ''},
    last_message_time: {type: Date, default: DateUtils.now_date()},
});

