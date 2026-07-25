import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCamera } from "react-icons/fa";

const DEFAULT_AVATAR = "/avartar.jpg";

interface AvatarUploaderProps {
    currentUrl?: string;
    previewUrl?: string;
    initialFileName?: string;
    onFileSelect: (file: File, previewUrl: string) => void;
    disabled?: boolean;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({
    currentUrl,
    previewUrl = "",
    initialFileName = "",
    onFileSelect,
    disabled = false,
}) => {
    const { t } = useTranslation();
    const [localPreview, setLocalPreview] = useState<string>(previewUrl);
    const [selectedFileName, setSelectedFileName] = useState<string>(initialFileName);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const displaySrc = localPreview || previewUrl || currentUrl || DEFAULT_AVATAR;
    const displayFileName = selectedFileName || initialFileName || "";

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const previewUrl = URL.createObjectURL(file);
        setLocalPreview(previewUrl);
        setSelectedFileName(file.name);
        onFileSelect(file, previewUrl);
    };

    const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = DEFAULT_AVATAR;
    };

    return (
        <div className="flex items-center gap-5 pb-5 border-b border-gray-100">
            <div className="relative flex-shrink-0 group">
                <img
                    src={displaySrc}
                    alt="Avatar"
                    className="h-20 w-20 rounded-full object-cover border-2 border-gray-200 shadow-sm cursor-pointer transition-all duration-200 group-hover:brightness-75"
                    onError={handleImgError}
                    onClick={() => setLightboxOpen(true)}
                    title={t("doctorManagement.clickToViewImage")}
                />
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                        title={t("avatarUploader.updateAvatar")}
                    >
                        <FaCamera className="text-white text-xl drop-shadow" />
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-gray-700">{t("avatarUploader.title")}</p>

                {!disabled && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-500 text-blue-600 text-sm font-medium hover:bg-blue-50 active:scale-95 transition-all duration-150"
                    >
                        <FaCamera className="text-sm" />
                        {t("avatarUploader.updateAvatar")}
                    </button>
                )}

                {displayFileName ? (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="font-bold">✓</span>
                        <span className="truncate max-w-[200px]" title={displayFileName}>
                            {displayFileName}
                        </span>
                        <span className="text-gray-400">— {t("avatarUploader.willUploadOnSave")}</span>
                    </p>
                ) : (
                    <p className="text-xs text-gray-400">{t("avatarUploader.fileRequirements")}</p>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />

            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
                    onClick={() => setLightboxOpen(false)}
                >
                    <div
                        className="relative"
                        onClick={(e) => e.stopPropagation()}
                        style={{ animation: "avatarScaleIn 0.2s ease" }}
                    >
                        <button
                            onClick={() => setLightboxOpen(false)}
                            className="absolute -top-4 -right-4 bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg hover:bg-gray-100 transition"
                        >
                            ✕
                        </button>
                        <img
                            src={displaySrc}
                            alt={t("avatarUploader.title")}
                            className="rounded-2xl shadow-2xl object-contain"
                            style={{ maxWidth: "80vw", maxHeight: "80vh" }}
                            onError={handleImgError}
                        />
                    </div>
                    <style>{`
            @keyframes avatarScaleIn {
              from { transform: scale(0.85); opacity: 0; }
              to   { transform: scale(1);    opacity: 1; }
            }
          `}</style>
                </div>
            )}
        </div>
    );
};

export default AvatarUploader;
