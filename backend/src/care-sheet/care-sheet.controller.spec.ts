import { Test, TestingModule } from '@nestjs/testing';
import { CareSheetController } from './care-sheet.controller';

describe('CareSheetController', () => {
  let controller: CareSheetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CareSheetController],
    }).compile();

    controller = module.get<CareSheetController>(CareSheetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
