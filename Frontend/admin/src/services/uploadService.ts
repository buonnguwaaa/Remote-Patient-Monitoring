import api from "./api";

export async function uploadAvatar(userId: string, file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);

    const response = await api.post(`/users/${userId}/avatar`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data.avatarUrl as string;
}
