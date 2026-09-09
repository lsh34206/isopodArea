import { Schema, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { deflate } from 'zlib';



export const careSheetSchema = new Schema({
    title: {type: String, required: true},
    type:{type: String, required: true},
    species:{type: String, required: true},
    subSpecies:{type: String, required: true},
    description: {type: String, default:`학명:\n관용명:\n난이도:\n적정온도:\n적정습도:\n먹이:\n습성:\n성장속도:\n추가설명:`},
    createdAt: { type: Date, default:DateUtils.now_date() },
    uploaderId: {type: Schema.Types.ObjectId, required: true},
    uploaderName: {type: String, required: true},
    imgsPath: {type: Array, default:[]},
    
    
    likes: {type:Array,default:[]},
    like_count: {type: Number,default:0},
    comment_count: {type: Number,default:0},
    comments:{type:Array,default:[]},
    view_count: {type: Number,default:0},
    


});
