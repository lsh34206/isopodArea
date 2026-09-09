import { Schema, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { deflate } from 'zlib';

export const auctionChatSchema = new Schema({
    auctionId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
    
      roomId: {
        type: String,
        required: true,
      },
    
      senderId: {
        type: Schema.Types.ObjectId,
        required: true,
      },
    
      senderName: {
        type: String,
        required: true,
      },
    
      message: {
        type: String,
        required: true,
      },
    
      messageType: {
        type: String,
        enum: ['chat', 'system', 'bid'],
        default: 'chat',
      },
    
      bidPrice: {
        type: Number,
        default: null,
      },
    
      
    
      createdAt: {
        type: Date,
        default: DateUtils.now_date(),
      },



});