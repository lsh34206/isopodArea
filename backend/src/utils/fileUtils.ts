import { unlink } from 'fs/promises';
import { join } from 'path';

export class FileUtils {

    static async removeUploadedFiles(paths: string[]) {
        await Promise.all(
            (paths ?? []).map((path) => unlink(join(process.cwd(), path)).catch(() => {})),
        );
    }

}
