import { Schema, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { deflate } from 'zlib';

export const auctionResultSchema = new Schema({
    auctionId: { type: Schema.Types.ObjectId, required: true },

  title: {type: String, required: true},
    type:{type: String, required: true},
    species:{type: String, required: true},
    subSpecies:{type: String, required: true},
    winnerId: { type: Schema.Types.ObjectId, default: null },
    winnerName: { type: String, default: '' },
  
    finalPrice: { type: Number, required: true },
  
    sellerId: { type: Schema.Types.ObjectId, required: true },
    
  
    isPaid: { type: Boolean, default: false },

  
    endedAt: { type: Date, default:DateUtils.now_date() },
    
  });