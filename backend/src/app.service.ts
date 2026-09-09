import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AppService {

constructor(
  @InjectModel('users') private readonly usersModel: Model<any>,
  @InjectModel('communityFree') private readonly communityFreeModel: Model<any>,
  @InjectModel('communityLibrary') private readonly communityLibraryModel: Model<any>,
  @InjectModel('communityNotice') private readonly communityNoticeModel: Model<any>,
  @InjectModel('communityQuestion') private readonly communityQuestionModel: Model<any>,
  @InjectModel('CareSheet') private readonly careSheetModel: Model<any>,
  @InjectModel('photo') private readonly photoModel: Model<any>,
  @InjectModel('market') private readonly marketModel: Model<any>,
  @InjectModel('Auction') private readonly auctionModel: Model<any>,
) {}

async getStats(){
  const totalUsers = await this.usersModel.countDocuments();
  const totalPosts = await this.communityFreeModel.countDocuments();
  const totalCareSheets = await this.careSheetModel.countDocuments();
  const totalPhotos = await this.photoModel.countDocuments();
  const totalSells = await this.marketModel.countDocuments();
  const totalAuctions = await this.auctionModel.countDocuments();
  return { success: true, stats: { totalUsers, totalPosts, totalCareSheets, totalPhotos, totalSells, totalAuctions } };
}

}