package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func JWTAuthMiddleware(jwtManager *util.JWTManager, blacklist repository.TokenBlacklistRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var token string

		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
				token = parts[1]
			}
		}

		if token == "" {
			cookieToken, err := c.Cookie("accessToken")
			if err == nil && cookieToken != "" {
				token = cookieToken
			}
		}

		if token == "" {
			token = c.Query("token")
		}

		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": constant.MsgMissingAccessToken})
			return
		}

		claims, err := jwtManager.VerifyAccessToken(token)
		if err != nil {
			if errors.Is(err, jwt.ErrTokenExpired) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": constant.MsgTokenExpired})
			} else {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": constant.MsgInvalidToken})
			}
			return
		}

		if blacklist != nil {
			revoked, err := blacklist.IsJTIBlacklisted(c.Request.Context(), claims.ID)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": constant.MsgInvalidToken})
				return
			}
			if revoked {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": constant.MsgTokenRevoked})
				return
			}

			if claims.IssuedAt != nil {
				invalidBefore, ok, err := blacklist.GetUserInvalidBefore(c.Request.Context(), claims.Subject)
				if err != nil {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": constant.MsgInvalidToken})
					return
				}
				// Compare at second precision to match Redis storage and avoid
				// rejecting a freshly issued token that shares the same second.
				if ok && claims.IssuedAt.Unix() < invalidBefore.Unix() {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": constant.MsgTokenRevoked})
					return
				}
			}
		}

		c.Set("userId", claims.Subject)
		c.Set("role", claims.Role)
		c.Set("jti", claims.ID)
		if claims.ExpiresAt != nil {
			c.Set("tokenExp", claims.ExpiresAt.Time)
		}
		c.Next()
	}
}

func RequireRoles(allowed ...domain.Role) gin.HandlerFunc {
	allowedSet := map[domain.Role]struct{}{}
	for _, r := range allowed {
		allowedSet[r] = struct{}{}
	}
	return func(c *gin.Context) {
		roleVal, exists := c.Get("role")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": constant.MsgMissingRole})
			return
		}
		role, ok := roleVal.(domain.Role)
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": constant.MsgInvalidRole})
			return
		}
		if _, ok := allowedSet[role]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": constant.MsgInsufficientPermissions})
			return
		}
		c.Next()
	}
}
