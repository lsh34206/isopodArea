import { Schema, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { deflate } from 'zlib';

export const communityFreeSchema = new Schema({
    title: {type: String, required: true},
    type:{type: String, required: true},
    content: {type: String, required: true},
    createdAt: { type: Date, default:DateUtils.now_date() },
    uploaderId: {type: Schema.Types.ObjectId, required: true},
    uploaderName: {type: String, required: true},
    imgsPath: {type: Array, default:[]},

    likes: {type:Array,default:[]},
    like_count: {type: Number,default:0},
    comments:{type:Array,default:[]},
    comment_count: {type: Number,default:0},
    view_count: {type: Number,default:0},
    


});
