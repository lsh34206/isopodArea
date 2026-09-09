import { Module } from '@nestjs/common';
import { PhotoService } from './photo.service';
import { PhotoController } from './photo.controller';
import { ScheduleModule } from "@nestjs/schedule";
import {MongooseModule} from "@nestjs/mongoose"
import { photoSchema } from './schema/photo.schema';
import { usersSchema } from '../auth/schema/users.schema';
const mongoSchema =MongooseModule.forFeature([
  { name: 'photo', schema: photoSchema },
  { name: 'users', schema: usersSchema },
])


@Module({
  providers: [PhotoService],
  controllers: [PhotoController],
  imports:[mongoSchema,ScheduleModule.forRoot()]
})
export class PhotoModule {}
