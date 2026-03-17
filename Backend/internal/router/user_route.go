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
		// Base user routes
		userGroup.GET("",
			middleware.JWTAuthMiddleware(c.JWTManager),
			// middleware.RequireRoles(domain.RoleAdmin),
			c.UserHandler.GetUsers,
		)
		userGroup.GET("/:id",
			middleware.JWTAuthMiddleware(c.JWTManager),
			c.UserHandler.GetUserByID,
		)
		userGroup.PUT("/:id",
			middleware.JWTAuthMiddleware(c.JWTManager),
			middleware.RequireRoles(domain.RoleAdmin),
			c.UserHandler.UpdateUser,
		)
		userGroup.DELETE("/:id",
			middleware.JWTAuthMiddleware(c.JWTManager),
			middleware.RequireRoles(domain.RoleAdmin),
			c.UserHandler.DeleteUser,
		)
		userGroup.POST("/:id/avatar",
			middleware.JWTAuthMiddleware(c.JWTManager),
			middleware.RequireRoles(domain.RoleAdmin),
			c.UserHandler.UploadAvatar,
		)
		// Patient-specific routes
		patientGroup := userGroup.Group("/patients")
		{
			patientGroup.GET("",
				middleware.JWTAuthMiddleware(c.JWTManager),
				// middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetPatients,
			)
			patientGroup.GET("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager),
				middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetPatientByID,
			)
			patientGroup.PUT("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager),
				middleware.RequireRoles(domain.RoleAdmin),
				c.UserHandler.UpdatePatient,
			)
		}
		// Doctor-specific routes
		doctorGroup := userGroup.Group("/doctors")
		{
			doctorGroup.GET("",
				middleware.JWTAuthMiddleware(c.JWTManager),
				// middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetDoctors,
			)
			doctorGroup.GET("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager),
				// middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetDoctorByID,
			)
			doctorGroup.PUT("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager),
				middleware.RequireRoles(domain.RoleAdmin),
				c.UserHandler.UpdateDoctor,
			)
		}
		// Nurse-specific routes
		nurseGroup := userGroup.Group("/nurses")
		{
			nurseGroup.GET("",
				middleware.JWTAuthMiddleware(c.JWTManager),
				// middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetNurses,
			)
			nurseGroup.GET("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager),
				middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse),
				c.UserHandler.GetNurseByID,
			)
			nurseGroup.PUT("/:id",
				middleware.JWTAuthMiddleware(c.JWTManager),
				middleware.RequireRoles(domain.RoleAdmin),
				c.UserHandler.UpdateNurse,
			)
		}
	}
}
