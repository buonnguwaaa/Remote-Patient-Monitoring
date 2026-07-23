package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AssignmentService interface {
	AssignPatient(ctx context.Context, input *usecase.AssignPatientInput) (*dto.AssignmentResponse, error)
	GetAllAssignments(ctx context.Context) ([]*dto.AssignmentResponse, error)
	GetAssignmentsByRole(ctx context.Context, input *usecase.GetAssignmentsByRoleInput) ([]*dto.AssignmentResponse, error)
	GetAssignmentsByRolePaginated(ctx context.Context, input *usecase.GetAssignmentsByRoleInput) ([]*dto.AssignmentResponse, int64, error)
	GetMyCareTeam(ctx context.Context, patientID primitive.ObjectID) (*dto.MyCareTeamResponse, error)
	DeleteAssignmentByID(ctx context.Context, input *usecase.DeleteAssignmentInput) error
	// GetDoctorPatientCounts trả về map doctorId (hex) → số bệnh nhân đang quản lý
	GetDoctorPatientCounts(ctx context.Context) (map[string]int64, error)
	// GetNursePatientCounts trả về map nurseId (hex) → số bệnh nhân đang quản lý
	GetNursePatientCounts(ctx context.Context) (map[string]int64, error)
}

type assignmentService struct {
	assignmentRepo      repository.AssignmentRepository
	userRepo            userRepository.BaseUserRepository
	doctorRepo          userRepository.StaffRepository[userDomain.Doctor]
	nurseRepo           userRepository.StaffRepository[userDomain.Nurse]
	notificationService NotificationService
}

func NewAssignmentService(
	assignmentRepo repository.AssignmentRepository,
	userRepo userRepository.BaseUserRepository,
	doctorRepo userRepository.StaffRepository[userDomain.Doctor],
	nurseRepo userRepository.StaffRepository[userDomain.Nurse],
	notificationService NotificationService) AssignmentService {
	return &assignmentService{
		assignmentRepo:      assignmentRepo,
		userRepo:            userRepo,
		doctorRepo:          doctorRepo,
		nurseRepo:           nurseRepo,
		notificationService: notificationService,
	}
}

func (s *assignmentService) AssignPatient(ctx context.Context, input *usecase.AssignPatientInput) (*dto.AssignmentResponse, error) {
	patientID, err := util.MustHexToObjectID(input.PatientID)
	if err != nil {
		return nil, err
	}
	assignerID, err := util.MustHexToObjectID(input.AssignedBy)
	if err != nil {
		return nil, err
	}

	// Verify Patient Exists
	if exists, err := s.userRepo.ExistsByIDAndRole(ctx, patientID, userDomain.RolePatient); err != nil || !exists {
		return nil, errors.New("Không tìm thấy bệnh nhân")
	}

	var doctorID primitive.ObjectID
	if input.DoctorID != "" {
		doctorID, err = util.MustHexToObjectID(input.DoctorID)
		if err != nil {
			return nil, err
		}
		if exists, err := s.userRepo.ExistsByIDAndRole(ctx, doctorID, userDomain.RoleDoctor); err != nil || !exists {
			return nil, errors.New("Không tìm thấy bác sĩ")
		}
	}

	var nurseID primitive.ObjectID
	if input.NurseID != "" {
		nurseID, err = util.MustHexToObjectID(input.NurseID)
		if err != nil {
			return nil, err
		}
		if exists, err := s.userRepo.ExistsByIDAndRole(ctx, nurseID, userDomain.RoleNurse); err != nil || !exists {
			return nil, errors.New("Không tìm thấy y tá")
		}
	}

	if doctorID.IsZero() && nurseID.IsZero() {
		return nil, errors.New("Phải phân công ít nhất một bác sĩ hoặc y tá")
	}

	previousAssignment, _ := s.assignmentRepo.FindByPatientID(ctx, patientID)

	assignment := &domain.Assignment{
		ID:         primitive.NewObjectID(),
		PatientID:  patientID,
		DoctorID:   doctorID,
		NurseID:    nurseID,
		AssignedBy: assignerID,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}

	created, err := s.assignmentRepo.Create(ctx, assignment)
	if err != nil {
		return nil, err
	}

	s.notifyAssignmentCreated(ctx, created, previousAssignment)

	return s.mapToResponse(ctx, created), nil
}

func (s *assignmentService) GetAssignmentsByRole(ctx context.Context, input *usecase.GetAssignmentsByRoleInput) ([]*dto.AssignmentResponse, error) {
	userID, err := util.MustHexToObjectID(input.UserID)
	if err != nil {
		return nil, err
	}

	var (
		assignments []*domain.Assignment
		userInfoMap map[primitive.ObjectID]repository.UserDisplayInfo
	)

	switch input.Role {
	case userDomain.RoleDoctor:
		assignments, userInfoMap, err = s.assignmentRepo.FindByDoctorIDWithNames(ctx, userID)
	case userDomain.RoleNurse:
		assignments, userInfoMap, err = s.assignmentRepo.FindByNurseIDWithNames(ctx, userID)
	default:
		return nil, errors.New("Vai trò không hợp lệ để xem phân công")
	}

	if err != nil {
		return nil, err
	}

	return s.mapListToResponse(assignments, userInfoMap), nil
}

func (s *assignmentService) GetAssignmentsByRolePaginated(ctx context.Context, input *usecase.GetAssignmentsByRoleInput) ([]*dto.AssignmentResponse, int64, error) {
	userID, err := util.MustHexToObjectID(input.UserID)
	if err != nil {
		return nil, 0, err
	}

	var (
		assignments []*domain.Assignment
		userInfoMap map[primitive.ObjectID]repository.UserDisplayInfo
		total       int64
	)

	switch input.Role {
	case userDomain.RoleDoctor:
		assignments, userInfoMap, total, err = s.assignmentRepo.FindByDoctorIDWithNamesPaginated(ctx, userID, input.Offset, input.Limit)
	case userDomain.RoleNurse:
		assignments, userInfoMap, total, err = s.assignmentRepo.FindByNurseIDWithNamesPaginated(ctx, userID, input.Offset, input.Limit)
	default:
		return nil, 0, errors.New("Vai trò không hợp lệ để xem phân công")
	}

	if err != nil {
		return nil, 0, err
	}

	return s.mapListToResponse(assignments, userInfoMap), total, nil
}

func (s *assignmentService) GetAllAssignments(ctx context.Context) ([]*dto.AssignmentResponse, error) {
	assignments, userInfoMap, err := s.assignmentRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	return s.mapListToResponse(assignments, userInfoMap), nil
}

func (s *assignmentService) GetMyCareTeam(ctx context.Context, patientID primitive.ObjectID) (*dto.MyCareTeamResponse, error) {
	assignment, err := s.assignmentRepo.FindByPatientID(ctx, patientID)
	if err != nil {
		return nil, err
	}

	res := &dto.MyCareTeamResponse{}

	if assignment.DoctorID != primitive.NilObjectID {
		if doctorBase, err := s.doctorRepo.FindStaffByID(ctx, assignment.DoctorID); err == nil {
			res.Doctor = &dto.DoctorInfoResponse{
				StaffInfoResponse: dto.StaffInfoResponse{
					BaseUserInfoResponse: dto.BaseUserInfoResponse{
						ID:        doctorBase.ID.Hex(),
						Name:      doctorBase.Name,
						AvatarUrl: doctorBase.AvatarUrl,
						Phone:     doctorBase.Phone,
						Role:      doctorBase.Role,
						Gender:    doctorBase.Gender,
					},
					DepartmentID:      doctorBase.DepartmentID.Hex(),
					Workplace:         doctorBase.Workplace,
					LicenseNumber:     doctorBase.LicenseNumber,
					YearsOfExperience: doctorBase.YearsOfExperience,
				},
				Specialization:                 doctorBase.Specialization,
				AcademicDegree:                 doctorBase.AcademicDegree,
				AcademicDegreeLabel:            doctorBase.AcademicDegree.Label(),
				ProfessionalQualification:      doctorBase.ProfessionalQualification,
				ProfessionalQualificationLabel: doctorBase.ProfessionalQualification.Label(),
				AcademicTitle:                  doctorBase.AcademicTitle,
				AcademicTitleLabel:             doctorBase.AcademicTitle.Label(),
				DisplayName:                    doctorBase.DisplayName(),
			}
		}
	}

	if assignment.NurseID != primitive.NilObjectID {
		if nurseBase, err := s.nurseRepo.FindStaffByID(ctx, assignment.NurseID); err == nil {
			res.Nurse = &dto.NurseInfoResponse{
				StaffInfoResponse: dto.StaffInfoResponse{
					BaseUserInfoResponse: dto.BaseUserInfoResponse{
						ID:        nurseBase.ID.Hex(),
						Name:      nurseBase.Name,
						AvatarUrl: nurseBase.AvatarUrl,
						Phone:     nurseBase.Phone,
						Role:      nurseBase.Role,
						Gender:    nurseBase.Gender,
					},
					DepartmentID:      nurseBase.DepartmentID.Hex(),
					Workplace:         nurseBase.Workplace,
					LicenseNumber:     nurseBase.LicenseNumber,
					YearsOfExperience: nurseBase.YearsOfExperience,
				},
			}
		}
	}

	return res, nil
}

func (s *assignmentService) DeleteAssignmentByID(ctx context.Context, input *usecase.DeleteAssignmentInput) error {
	assignmentID, err := util.MustHexToObjectID(input.AssignmentID)
	if err != nil {
		return err
	}

	assignment, err := s.assignmentRepo.FindByID(ctx, assignmentID)
	if err != nil {
		return err
	}

	if err := s.assignmentRepo.DeleteByID(ctx, assignmentID); err != nil {
		return err
	}

	s.notifyAssignmentRemoved(ctx, assignment)
	return nil
}

func (s *assignmentService) GetDoctorPatientCounts(ctx context.Context) (map[string]int64, error) {
	return s.assignmentRepo.CountByDoctorIDs(ctx)
}

func (s *assignmentService) GetNursePatientCounts(ctx context.Context) (map[string]int64, error) {
	return s.assignmentRepo.CountByNurseIDs(ctx)
}

func (s *assignmentService) mapListToResponse(assignments []*domain.Assignment, userInfoMap map[primitive.ObjectID]repository.UserDisplayInfo) []*dto.AssignmentResponse {
	var responses []*dto.AssignmentResponse
	for _, a := range assignments {
		responses = append(responses, s.mapToResponseWithNames(a, userInfoMap))
	}
	return responses
}

func (s *assignmentService) mapToResponseWithNames(a *domain.Assignment, userInfoMap map[primitive.ObjectID]repository.UserDisplayInfo) *dto.AssignmentResponse {
	patient := userInfoMap[a.PatientID]
	doctor := userInfoMap[a.DoctorID]
	nurse := userInfoMap[a.NurseID]

	return &dto.AssignmentResponse{
		ID:                  a.ID,
		PatientID:           a.PatientID,
		PatientPublicID:     patient.PublicID,
		PatientName:         patient.Name,
		DoctorID:            a.DoctorID,
		DoctorPublicID:      doctor.PublicID,
		DoctorName:          doctor.Name,
		NurseID:             a.NurseID,
		NursePublicID:       nurse.PublicID,
		NurseName:           nurse.Name,
		AssignedBy:          a.AssignedBy,
		CreatedAt:           a.CreatedAt,
		UpdatedAt:           a.UpdatedAt,
		PatientDiseaseTypes: &patient.DiseaseTypes,
	}
}

func (s *assignmentService) mapToResponse(ctx context.Context, a *domain.Assignment) *dto.AssignmentResponse {
	resp := &dto.AssignmentResponse{
		ID:         a.ID,
		PatientID:  a.PatientID,
		DoctorID:   a.DoctorID,
		NurseID:    a.NurseID,
		AssignedBy: a.AssignedBy,
		CreatedAt:  a.CreatedAt,
		UpdatedAt:  a.UpdatedAt,
	}

	if u, err := s.userRepo.FindByID(ctx, a.PatientID); err == nil {
		resp.PatientName = u.Name
		resp.PatientPublicID = u.UserPublicID
	}
	if !a.DoctorID.IsZero() {
		if u, err := s.userRepo.FindByID(ctx, a.DoctorID); err == nil {
			resp.DoctorName = u.Name
			resp.DoctorPublicID = u.UserPublicID
		}
	}
	if !a.NurseID.IsZero() {
		if u, err := s.userRepo.FindByID(ctx, a.NurseID); err == nil {
			resp.NurseName = u.Name
			resp.NursePublicID = u.UserPublicID
		}
	}

	return resp
}

func (s *assignmentService) notifyAssignmentCreated(ctx context.Context, assignment *domain.Assignment, previous *domain.Assignment) {
	if s.notificationService == nil || assignment == nil {
		return
	}

	names := s.resolveAssignmentNames(ctx, assignment)
	patientName := names[assignment.PatientID]
	if patientName == "" {
		patientName = "bệnh nhân"
	}

	basePayload := map[string]string{
		"type":         "assignment",
		"assignmentId": assignment.ID.Hex(),
		"patientId":    assignment.PatientID.Hex(),
	}

	s.publishAssignmentNotification(ctx, assignment.PatientID, domain.NotificationTypeAssignment,
		"Phân công chăm sóc mới",
		buildPatientAssignmentBody(names, assignment),
		cloneAssignmentPayload(basePayload, "PatientNotifications"),
		fmt.Sprintf("assignment:patient:%s:%s", assignment.ID.Hex(), assignment.PatientID.Hex()),
	)

	if !assignment.DoctorID.IsZero() {
		s.publishAssignmentNotification(ctx, assignment.DoctorID, domain.NotificationTypeAssignment,
			"Phân công bệnh nhân mới",
			fmt.Sprintf("Bạn được phân công chăm sóc bệnh nhân %s.", patientName),
			cloneAssignmentPayload(basePayload, "Patients"),
			fmt.Sprintf("assignment:doctor:%s:%s", assignment.ID.Hex(), assignment.DoctorID.Hex()),
		)
	}

	if !assignment.NurseID.IsZero() {
		s.publishAssignmentNotification(ctx, assignment.NurseID, domain.NotificationTypeAssignment,
			"Phân công bệnh nhân mới",
			fmt.Sprintf("Bạn được phân công chăm sóc bệnh nhân %s.", patientName),
			cloneAssignmentPayload(basePayload, "NursePatientDetail"),
			fmt.Sprintf("assignment:nurse:%s:%s", assignment.ID.Hex(), assignment.NurseID.Hex()),
		)
	}

	if previous == nil {
		return
	}

	if !previous.DoctorID.IsZero() && previous.DoctorID != assignment.DoctorID {
		s.publishAssignmentNotification(ctx, previous.DoctorID, domain.NotificationTypeAssignment,
			"Phân công đã thay đổi",
			fmt.Sprintf("Bạn không còn được phân công chăm sóc bệnh nhân %s.", patientName),
			cloneAssignmentPayload(basePayload, "Patients"),
			fmt.Sprintf("assignment:removed-doctor:%s:%s", assignment.ID.Hex(), previous.DoctorID.Hex()),
		)
	}

	if !previous.NurseID.IsZero() && previous.NurseID != assignment.NurseID {
		s.publishAssignmentNotification(ctx, previous.NurseID, domain.NotificationTypeAssignment,
			"Phân công đã thay đổi",
			fmt.Sprintf("Bạn không còn được phân công chăm sóc bệnh nhân %s.", patientName),
			cloneAssignmentPayload(basePayload, "NursePatients"),
			fmt.Sprintf("assignment:removed-nurse:%s:%s", assignment.ID.Hex(), previous.NurseID.Hex()),
		)
	}
}

func (s *assignmentService) notifyAssignmentRemoved(ctx context.Context, assignment *domain.Assignment) {
	if s.notificationService == nil || assignment == nil {
		return
	}

	names := s.resolveAssignmentNames(ctx, assignment)
	patientName := names[assignment.PatientID]
	if patientName == "" {
		patientName = "bệnh nhân"
	}

	basePayload := map[string]string{
		"type":         "assignment",
		"assignmentId": assignment.ID.Hex(),
		"patientId":    assignment.PatientID.Hex(),
	}

	s.publishAssignmentNotification(ctx, assignment.PatientID, domain.NotificationTypeAssignment,
		"Phân công chăm sóc đã hủy",
		"Phân công chăm sóc của bạn đã được hủy.",
		cloneAssignmentPayload(basePayload, "PatientNotifications"),
		fmt.Sprintf("assignment:removed:patient:%s", assignment.ID.Hex()),
	)

	if !assignment.DoctorID.IsZero() {
		s.publishAssignmentNotification(ctx, assignment.DoctorID, domain.NotificationTypeAssignment,
			"Phân công đã hủy",
			fmt.Sprintf("Phân công chăm sóc bệnh nhân %s đã được hủy.", patientName),
			cloneAssignmentPayload(basePayload, "Patients"),
			fmt.Sprintf("assignment:removed:doctor:%s:%s", assignment.ID.Hex(), assignment.DoctorID.Hex()),
		)
	}

	if !assignment.NurseID.IsZero() {
		s.publishAssignmentNotification(ctx, assignment.NurseID, domain.NotificationTypeAssignment,
			"Phân công đã hủy",
			fmt.Sprintf("Phân công chăm sóc bệnh nhân %s đã được hủy.", patientName),
			cloneAssignmentPayload(basePayload, "NursePatients"),
			fmt.Sprintf("assignment:removed:nurse:%s:%s", assignment.ID.Hex(), assignment.NurseID.Hex()),
		)
	}
}

func (s *assignmentService) publishAssignmentNotification(
	ctx context.Context,
	userID primitive.ObjectID,
	notificationType domain.NotificationType,
	title string,
	body string,
	data map[string]string,
	dedupKey string,
) {
	if userID.IsZero() {
		return
	}

	_, err := s.notificationService.PublishToUser(ctx, &usecase.InternalPublishNotificationInput{
		UserID:   userID,
		Type:     notificationType,
		Title:    title,
		Body:     body,
		Data:     data,
		DedupKey: dedupKey,
	})
	if err != nil {
		log.Printf("[WARN] failed to send assignment notification (non-fatal) user=%s dedup=%s: %v", userID.Hex(), dedupKey, err)
	}
}

func (s *assignmentService) resolveAssignmentNames(ctx context.Context, assignment *domain.Assignment) map[primitive.ObjectID]string {
	names := make(map[primitive.ObjectID]string)
	if assignment == nil {
		return names
	}

	ids := []primitive.ObjectID{assignment.PatientID}
	if !assignment.DoctorID.IsZero() {
		ids = append(ids, assignment.DoctorID)
	}
	if !assignment.NurseID.IsZero() {
		ids = append(ids, assignment.NurseID)
	}

	for _, id := range ids {
		if u, err := s.userRepo.FindByID(ctx, id); err == nil && u != nil {
			names[id] = u.Name
		}
	}
	return names
}

func buildPatientAssignmentBody(names map[primitive.ObjectID]string, assignment *domain.Assignment) string {
	var careTeam []string
	if !assignment.DoctorID.IsZero() {
		if name := strings.TrimSpace(names[assignment.DoctorID]); name != "" {
			careTeam = append(careTeam, "BS. "+name)
		}
	}
	if !assignment.NurseID.IsZero() {
		if name := strings.TrimSpace(names[assignment.NurseID]); name != "" {
			careTeam = append(careTeam, "YT. "+name)
		}
	}

	if len(careTeam) == 0 {
		return "Bạn đã được phân công đội chăm sóc mới."
	}
	return "Bạn đã được phân công cho " + strings.Join(careTeam, " và ") + "."
}

func cloneAssignmentPayload(base map[string]string, targetScreen string) map[string]string {
	payload := make(map[string]string, len(base)+1)
	for key, value := range base {
		payload[key] = value
	}
	payload["targetScreen"] = targetScreen
	return payload
}
