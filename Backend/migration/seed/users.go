package seed

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func (s *Seeder) seedDepartments(ctx context.Context) ([]*domain.Department, error) {
	existing, err := s.deptRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	byName := make(map[string]*domain.Department, len(existing))
	for _, d := range existing {
		byName[d.Name] = d
	}

	result := make([]*domain.Department, 0, seedCount)
	created := 0
	now := time.Now().UTC()

	for i := 0; i < seedCount; i++ {
		name := pick(departmentNames, i)
		if d, ok := byName[name]; ok {
			result = append(result, d)
			continue
		}

		dept := &domain.Department{
			ID:          primitive.NewObjectID(),
			Name:        name,
			Description: fmt.Sprintf("%s department for remote patient monitoring", name),
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		createdDept, err := s.deptRepo.Create(ctx, dept)
		if err != nil {
			return nil, err
		}
		byName[name] = createdDept
		result = append(result, createdDept)
		created++
	}

	log.Printf("[seed] departments: %d total (%d created)", len(result), created)
	return result, nil
}

func (s *Seeder) seedAdmins(ctx context.Context) ([]*userDomain.BaseUser, error) {
	return s.seedBaseUsers(ctx, "admin", seedPassword("admin"), 1985, func(i int) string {
		if i == 0 {
			return "System Admin"
		}
		return fmt.Sprintf("Seed Admin %02d", i+1)
	})
}

func (s *Seeder) seedDoctors(ctx context.Context, departments []*domain.Department) ([]*userDomain.Doctor, error) {
	hashed, err := util.HashPassword(seedPassword("doctor"))
	if err != nil {
		return nil, err
	}

	result := make([]*userDomain.Doctor, 0, seedCount)
	created := 0

	for i := 0; i < seedCount; i++ {
		email := seedEmail("doctor", i)
		if existing, err := s.doctorRepo.FindStaffByEmail(ctx, email); err == nil {
			result = append(result, existing)
			continue
		} else if !errors.Is(err, mongo.ErrNoDocuments) {
			return nil, err
		}

		dept := departments[i%len(departments)]
		name := "Dr. Alice Nguyen"
		if i > 0 {
			name = fmt.Sprintf("Dr. Seed Doctor %02d", i+1)
		}

		doctor := &userDomain.Doctor{
			MedicalStaff: userDomain.MedicalStaff{
				BaseUser: userDomain.BaseUser{
					Role:     userDomain.RoleDoctor,
					Name:     name,
					Email:    email,
					Password: hashed,
					Provider: localProvider,
					Gender:   seedGender(i),
					Dob:      seedDob(i, 1980),
					Phone:    fmt.Sprintf("0902%06d", i+1),
					Status:   userDomain.StatusActive,
				},
				DepartmentID:      dept.ID,
				Workplace:         "City General Hospital",
				LicenseNumber:     fmt.Sprintf("DOC-2024-%03d", i+1),
				YearsOfExperience: 3 + (i % 20),
			},
			Specialization: pick(doctorSpecializations, i),
		}

		createdDoctor, err := s.doctorRepo.Create(ctx, doctor)
		if err != nil {
			return nil, err
		}
		result = append(result, createdDoctor)
		created++
	}

	log.Printf("[seed] doctors: %d total (%d created)", len(result), created)
	return result, nil
}

func (s *Seeder) seedNurses(ctx context.Context, departments []*domain.Department) ([]*userDomain.Nurse, error) {
	hashed, err := util.HashPassword(seedPassword("nurse"))
	if err != nil {
		return nil, err
	}

	result := make([]*userDomain.Nurse, 0, seedCount)
	created := 0

	for i := 0; i < seedCount; i++ {
		email := seedEmail("nurse", i)
		if existing, err := s.nurseRepo.FindStaffByEmail(ctx, email); err == nil {
			result = append(result, existing)
			continue
		} else if !errors.Is(err, mongo.ErrNoDocuments) {
			return nil, err
		}

		dept := departments[i%len(departments)]
		name := "Jane Tran"
		if i > 0 {
			name = fmt.Sprintf("Seed Nurse %02d", i+1)
		}

		nurse := &userDomain.Nurse{
			MedicalStaff: userDomain.MedicalStaff{
				BaseUser: userDomain.BaseUser{
					Role:     userDomain.RoleNurse,
					Name:     name,
					Email:    email,
					Password: hashed,
					Provider: localProvider,
					Gender:   seedGender(i),
					Dob:      seedDob(i, 1992),
					Phone:    fmt.Sprintf("0903%06d", i+1),
					Status:   userDomain.StatusActive,
				},
				DepartmentID:      dept.ID,
				Workplace:         "City General Hospital",
				LicenseNumber:     fmt.Sprintf("NUR-2024-%03d", i+1),
				YearsOfExperience: 1 + (i % 15),
			},
		}

		createdNurse, err := s.nurseRepo.Create(ctx, nurse)
		if err != nil {
			return nil, err
		}
		result = append(result, createdNurse)
		created++
	}

	log.Printf("[seed] nurses: %d total (%d created)", len(result), created)
	return result, nil
}

func (s *Seeder) seedPatients(ctx context.Context) ([]*userDomain.Patient, error) {
	hashed, err := util.HashPassword(seedPassword("patient"))
	if err != nil {
		return nil, err
	}

	result := make([]*userDomain.Patient, 0, seedCount)
	created := 0

	for i := 0; i < seedCount; i++ {
		email := seedEmail("patient", i)
		if existing, err := s.patientRepo.FindPatientByEmail(ctx, email); err == nil {
			result = append(result, existing)
			continue
		} else if !errors.Is(err, mongo.ErrNoDocuments) {
			return nil, err
		}

		name := "John Le"
		if i > 0 {
			name = fmt.Sprintf("Seed Patient %02d", i+1)
		}

		patient := &userDomain.Patient{
			BaseUser: userDomain.BaseUser{
				Role:     userDomain.RolePatient,
				Name:     name,
				Email:    email,
				Password: hashed,
				Provider: localProvider,
				Gender:   seedGender(i),
				Dob:      seedDob(i, 1975),
				Phone:    fmt.Sprintf("0904%06d", i+1),
				Status:   userDomain.StatusActive,
			},
			InsuranceNumber:       fmt.Sprintf("INS-2024-%04d", i+1),
			CCCD:                  fmt.Sprintf("00107501%04d", i+1),
			EmergencyContactName:  fmt.Sprintf("Emergency Contact %02d", i+1),
			EmergencyContactPhone: fmt.Sprintf("0909%06d", i+1),
			MedicalHistory:        pick([]string{"Hypertension", "Type 2 diabetes", "Asthma", "Heart disease"}, i),
			DiseaseTypes: userDomain.DiseaseTypes{
				BloodPressure: i%2 == 0,
				Glucose:       i%3 != 0,
			},
		}

		createdPatient, err := s.patientRepo.Create(ctx, patient)
		if err != nil {
			return nil, err
		}
		result = append(result, createdPatient)
		created++
	}

	log.Printf("[seed] patients: %d total (%d created)", len(result), created)
	return result, nil
}

func (s *Seeder) seedBaseUsers(
	ctx context.Context,
	role string,
	password string,
	baseYear int,
	nameFn func(int) string,
) ([]*userDomain.BaseUser, error) {
	hashed, err := util.HashPassword(password)
	if err != nil {
		return nil, err
	}

	var domainRole userDomain.Role
	switch role {
	case "admin":
		domainRole = userDomain.RoleAdmin
	default:
		return nil, fmt.Errorf("unsupported base user role: %s", role)
	}

	result := make([]*userDomain.BaseUser, 0, seedCount)
	created := 0

	for i := 0; i < seedCount; i++ {
		email := seedEmail(role, i)
		if existing, err := s.baseUserRepo.FindByEmail(ctx, email); err == nil {
			result = append(result, existing)
			continue
		} else if !errors.Is(err, mongo.ErrNoDocuments) {
			return nil, err
		}

		now := time.Now().UTC()
		id := primitive.NewObjectID()
		user := userDomain.BaseUser{
			ID:           id,
			UserPublicID: util.GenerateUserPublicID(id, domainRole),
			Role:         domainRole,
			Name:         nameFn(i),
			Email:        email,
			Password:     hashed,
			Provider:     localProvider,
			Gender:       seedGender(i),
			Dob:          seedDob(i, baseYear),
			Phone:        fmt.Sprintf("0901%06d", i+1),
			Status:       userDomain.StatusActive,
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		if _, err := s.usersCol.InsertOne(ctx, user); err != nil {
			return nil, err
		}
		result = append(result, &user)
		created++
	}

	log.Printf("[seed] %ss: %d total (%d created)", role, len(result), created)
	return result, nil
}

func (s *Seeder) countCollection(ctx context.Context, collection string, filter bson.M) (int64, error) {
	return s.db.Collection(collection).CountDocuments(ctx, filter)
}
