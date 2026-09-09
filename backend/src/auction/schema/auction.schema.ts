import { Schema, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { deflate } from 'zlib';

export const auctionSchema = new Schema({
    title: {type: String, required: true},

    type:{type: String, required: true},
    species:{type: String, required: true},
    subSpecies:{type: String, required: true},
    description: {type: String, required: true},
    createdAt: { type: Date, default:DateUtils.now_date() },
    sellerId: {type: Schema.Types.ObjectId, required: true},
    sellerName: {type: String, required: true},
    imgsPath: {type: Array, default:[]},
    startBid:{type:Number,required:true},
    endTime:{type:Number,required:true},
    highBid:{type:Number,default:0},
    highBidderId:{type:Schema.Types.ObjectId,default:null},
    highBidderName:{type:String,default:null},
    status:{type:Boolean,default:true},




});