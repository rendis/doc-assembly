package mapper

import (
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// SystemRoleToResponse converts a SystemRoleAssignment entity to a response DTO.
func SystemRoleToResponse(r *entity.SystemRoleAssignment) *dto.SystemRoleResponse {
	if r == nil {
		return nil
	}
	return &dto.SystemRoleResponse{
		ID:        r.ID,
		UserID:    r.UserID,
		Role:      string(r.Role),
		GrantedBy: r.GrantedBy,
		CreatedAt: r.CreatedAt,
	}
}

// UserBriefToResponse converts a User entity to a brief response DTO.
func UserBriefToResponse(u *entity.User) *dto.UserBriefResponse {
	if u == nil {
		return nil
	}
	return &dto.UserBriefResponse{
		ID:       u.ID,
		Email:    u.Email,
		FullName: u.FullName,
		Status:   string(u.Status),
	}
}

// SystemRoleWithUserToResponse converts a SystemRoleWithUser entity to a response DTO.
func SystemRoleWithUserToResponse(r *entity.SystemRoleWithUser) *dto.SystemRoleWithUserResponse {
	if r == nil {
		return nil
	}
	return &dto.SystemRoleWithUserResponse{
		SystemRoleResponse: *SystemRoleToResponse(&r.SystemRoleAssignment),
		User:               UserBriefToResponse(r.User),
	}
}

// SystemRolesWithUserToResponses converts a slice of SystemRoleWithUser entities to response DTOs.
func SystemRolesWithUserToResponses(roles []*entity.SystemRoleWithUser) []*dto.SystemRoleWithUserResponse {
	result := make([]*dto.SystemRoleWithUserResponse, len(roles))
	for i, r := range roles {
		result[i] = SystemRoleWithUserToResponse(r)
	}
	return result
}

// AssignSystemRoleRequestToCommand converts a request to a command.
func AssignSystemRoleRequestToCommand(userID string, req dto.AssignSystemRoleRequest, grantedBy string) usecase.AssignSystemRoleCommand {
	return usecase.AssignSystemRoleCommand{
		UserID:    userID,
		Role:      entity.SystemRole(req.Role),
		GrantedBy: grantedBy,
	}
}

// RevokeSystemRoleToCommand creates a revoke command.
func RevokeSystemRoleToCommand(userID, revokedBy string) usecase.RevokeSystemRoleCommand {
	return usecase.RevokeSystemRoleCommand{
		UserID:    userID,
		RevokedBy: revokedBy,
	}
}
