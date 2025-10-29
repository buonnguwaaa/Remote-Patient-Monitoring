package utils 

import (
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func ComparePassword(hashedPassword string, rawPassword string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(rawPassword)) == nil 
}