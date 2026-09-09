export class ViewUtils {

    // 같은 방문자가 새로고침 등으로 재요청해도 조회수가 중복으로 오르지 않도록
    // 세션에 이미 조회한 게시글 키 목록을 기록해 둔다.
    static hasViewed(req: any, key: string): boolean {
        const viewed: string[] = req.session?.viewedPosts ?? [];
        return viewed.includes(key);
    }

    static markViewed(req: any, key: string) {
        const viewed: string[] = req.session?.viewedPosts ?? [];
        if (!viewed.includes(key)) {
            req.session.viewedPosts = [...viewed, key];
        }
    }

}
