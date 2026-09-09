import { Model } from 'mongoose';

export class AvatarUtils {

    // 목록 조회 결과(작성자 id를 가진 문서 배열)에 작성자의 현재 프로필 사진 경로를 붙여준다.
    // 대부분 게시판은 uploaderId를 쓰지만 market은 sellerId를 쓰므로 필드명을 지정할 수 있게 한다.
    static async attachAvatars(items: any[], usersModel: Model<any>, idField = 'uploaderId') {
        const ids = [...new Set(items.map((item) => String(item[idField])))];
        if (ids.length === 0) return items;

        const users = await usersModel.find({ _id: { $in: ids } }).select('avatarPath').lean().exec();
        const avatarMap = new Map(users.map((user: any) => [String(user._id), user.avatarPath]));

        return items.map((item) => ({
            ...item.toObject(),
            uploaderAvatar: avatarMap.get(String(item[idField])) || '',
        }));
    }

}
