import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { ScheduleModule } from "@nestjs/schedule";
import {MongooseModule} from "@nestjs/mongoose"
import { communityFreeSchema } from './schema/free.schema';
import { communityLibrarySchema } from './schema/library.schema';
import { communityNoticeSchema } from './schema/notice.schema';
import { communityQuestionSchema } from './schema/question.schema';
import { usersSchema } from '../auth/schema/users.schema';


const mongoSchema =MongooseModule.forFeature([
  { name: 'communityFree', schema: communityFreeSchema },
  { name: 'communityLibrary', schema: communityLibrarySchema },
  { name: 'communityNotice', schema: communityNoticeSchema },
  { name: 'communityQuestion', schema: communityQuestionSchema },
  { name: 'users', schema: usersSchema },
])

@Module({
  controllers: [CommunityController],
  providers: [CommunityService],
  imports:[mongoSchema,
    ScheduleModule.forRoot()

  ]
})
export class CommunityModule {
  constructor(){
    console.log("community 모듈 로드 완료");
  }
}




