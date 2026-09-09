import { Module } from '@nestjs/common';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { AuctionGateway } from './auction.gateway';
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from '@nestjs/serve-static';
import {MongooseModule} from "@nestjs/mongoose"
import { join } from 'path';
import { auctionSchema } from './schema/auction.schema';
import { auctionBidSchema } from './schema/auctionBid.schema';
import { auctionChatSchema } from './schema/auctionChat.schema';
import { auctionResultSchema } from './schema/auctionResult.schema';
import { usersSchema } from '../auth/schema/users.schema';
import { chatroomSchema } from '../chat/schema/chatRoom.schema';
import { messageSchema } from '../chat/schema/message.schema';
import { ChatService } from '../chat/chat.service';


const mongoSchema =MongooseModule.forFeature([
  { name: 'Auction', schema: auctionSchema },
  { name: 'AuctionBid', schema: auctionBidSchema },
  { name: 'AuctionChat', schema: auctionChatSchema },
  { name: 'AuctionResult', schema: auctionResultSchema },
  { name: 'users', schema: usersSchema },
  { name: 'chatRooms', schema: chatroomSchema },
  { name: 'messages', schema: messageSchema },
])

@Module(
{
  controllers: [AuctionController],
providers:[AuctionService, AuctionGateway, ChatService],
imports:[mongoSchema,
  ScheduleModule.forRoot()]
}
)

export class auctionModule{
 constructor(){
   console.log("auction 모듈 로드 완료");
 }
}
