import { Schema, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { deflate } from 'zlib';

export const usersSchema = new Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    phone: {type: String, default: ''},
    avatarPath: {type: String, default: ''},
    bio: {type: String, default: ''},
    createdAt: { type: Date, default: DateUtils.now_date() },
    isActive: { type: Number, default: 1 },
   role: { type: String, default: 'user' },
    point: {type: Number, default: 0},
    massege_list: {type: Array, default: []},
    writer_count: {type: Number, default: 0},
    liked_post_list: {type: Array, default: []},
    xp:{type:Number,default:0}


    
});
