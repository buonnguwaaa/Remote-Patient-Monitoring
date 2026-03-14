import api from "./api";

/**
 * Upload avatar cho 1 user lên Cloudinary qua backend.
 * Ảnh cũ sẽ tự động bị xóa trên Cloudinary.
 *
 * @param userId - ID của user cần cập nhật avatar
 * @param file   - File ảnh được chọn
 * @returns      URL ảnh mới trên Cloudinary
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);

    const response = await api.post(`/upload/users/${userId}/avatar`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data.avatarUrl as string;
}
