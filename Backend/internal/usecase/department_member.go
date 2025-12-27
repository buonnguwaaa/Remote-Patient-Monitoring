package usecase

type Member struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Avatar    string `json:"avatar"`
	CreatedAt string `json:"createdAt"`
}
