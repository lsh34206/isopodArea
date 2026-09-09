import { Schema, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { deflate } from 'zlib';



export const marketSchema = new Schema({
    title: {type: String, required: true},
    transactionType:{type: String, required: true},
    price:{type:Number,required:true},
    type:{type: String, required: true},
    species:{type: String, required: true},
    subSpecies:{type: String, required: true},
    description: {type: String, required: true},
    createdAt: { type: Date, default:DateUtils.now_date() },
    sellerId: {type: Schema.Types.ObjectId, required: true},
    sellerName: {type: String, required: true},
    imgsPath: {type: Array, default:[]},
    
    likes: {type:Array,default:[]},
    like_count: {type: Number,default:0},
    comment_count: {type: Number,default:0},
    comments:{type:Array,default:[]},
    view_count: {type: Number,default:0},



});