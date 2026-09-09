import { Schema, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { deflate } from 'zlib';



export const auctionBidSchema = new Schema({
    auctionId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
    
      roomId: {
        type: String,
        required: true,
      },
    
      bidderId: {
        type: Schema.Types.ObjectId,
        required: true,
      },
    
      bidderName: {
        type: String,
        required: true,
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