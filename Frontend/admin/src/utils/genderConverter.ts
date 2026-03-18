export const mapGenderToDisplay = (gender: string | undefined): string => {
  if (gender === "M") return "Nam";
  if (gender === "F") return "Nữ";
  if (gender === "O") return "Khác";
  return gender || "Chưa xác định";
};

export const mapGenderToApi = (gender: string | undefined): string => {
  if (gender === "Nam") return "M";
  if (gender === "Nữ") return "F";
  return "O";
};
