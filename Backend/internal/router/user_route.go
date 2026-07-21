package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(r *gin.Engine, c *container.MainServerContainer) {
	userGroup := r.Group("/users")
	{
		userGroup.GET("",
			middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
			middleware.RequireRoles(domain.RoleAdmin),
			c.UserHandler.GetBaseUsers,
		)
		userGroup.GET("/:id",
			middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
			middleware.RequireRoles(domain.RoleAdmin),
			c.UserHandler.GetBaseUserByID,
		)
		userGroup.PATCH("/:id",
			middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
			middleware.RequireRoles(domain.RoleAdmin),
			c.UserHandler.UpdateBaseUserByID,
		)
		userGroup.PATCH("/:id/status",
			middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
			middleware.RequireRoles(domain.RoleAdmin),
			c.UserHandler.UpdateBaseUserStatusByID,
		)
		userGroup.DELETE("/:id",
			middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
			middleware.RequireRoles(domain.RoleAdmin),
			c.UserHandler.DeleteBaseUserByID,
		)
		userGroup.POST("/:id/avatar",
			middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
			middleware.RequireRoles(domain.RoleAdmin),
			c.UserHandler.UploadAvatar,
		)

		patientGroup := userGroup.Group("/patients")
		{
			patientGroup.GET("/me",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RolePatient),
				c.UserHandler.GetMyPatientProfile,
			)
			patientGroup.PATCH("/me",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RolePatient),
				c.UserHandler.UpdateMyPatientProfile,
			)
			patientGroup.POST("/me/avatar",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RolePatient),
				c.UserHandler.UploadMyPatientAvatar,
			)
			patientGroup.GET("",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetPatients,
			)
			patientGroup.GET("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetPatientByID,
			)
			patientGroup.PATCH("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleAdmin),
				c.UserHandler.UpdatePatientByID,
			)
		}

		doctorGroup := userGroup.Group("/doctors")
		{
			doctorGroup.GET("",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetDoctors,
			)
			doctorGroup.PATCH("/me",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleDoctor),
				c.UserHandler.UpdateMyDoctorProfile,
			)
			doctorGroup.POST("/me/avatar",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleDoctor),
				c.UserHandler.UploadMyDoctorAvatar,
			)
			doctorGroup.GET("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetDoctorByID,
			)
			doctorGroup.PATCH("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleAdmin),
				c.UserHandler.UpdateDoctorByID,
			)
		}

		nurseGroup := userGroup.Group("/nurses")
		{
			nurseGroup.GET("/me",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleNurse),
				c.UserHandler.GetMyNurseProfile,
			)
			nurseGroup.GET("",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetNurses,
			)
			nurseGroup.GET("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetNurseByID,
			)
			nurseGroup.PATCH("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo),
				middleware.RequireRoles(domain.RoleAdmin),
				c.UserHandler.UpdateNurseByID,
			)
		}
	}
}
