import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService} from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from '@nestjs/serve-static';
import {MongooseModule} from "@nestjs/mongoose"
import { join } from 'path';
import { messageSchema } from './schema/message.schema';
import { chatroomSchema } from './schema/chatRoom.schema';
import { usersSchema } from '../auth/schema/users.schema';



const mongoSchema =MongooseModule.forFeature([
  { name: 'chatRooms', schema: chatroomSchema },
  { name: 'messages', schema: messageSchema },
  { name: 'users', schema: usersSchema },
])

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  imports:[mongoSchema,
    ScheduleModule.forRoot()

  ]
})
export class ChatModule {
  constructor(){
    console.log("chat 모듈 로드 완료");
  }
}




