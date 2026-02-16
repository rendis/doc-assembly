//go:build integration

package testhelper

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// TestUser represents a test user with authentication credentials.
type TestUser struct {
	ID           string
	Email        string
	FullName     string
	SystemRole   *entity.SystemRole
	Token        string
	BearerHeader string
}

// CreateTestUser creates a user in the database and returns a TestUser struct
// with a valid JWT token for authentication.
func CreateTestUser(t *testing.T, pool *pgxpool.Pool, email, fullName string, systemRole *entity.SystemRole) *TestUser {
	t.Helper()
	ctx := context.Background()

	userID := uuid.NewString()
	now := time.Now().UTC()

	// Insert user into identity.users
	_, err := pool.Exec(ctx, `
		INSERT INTO identity.users (id, external_identity_id, email, full_name, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		userID, email, email, fullName, entity.UserStatusActive, now)
	require.NoError(t, err, "failed to create test user")

	// Assign system role if provided
	if systemRole != nil {
		roleID := uuid.NewString()
		_, err = pool.Exec(ctx, `
			INSERT INTO identity.system_roles (id, user_id, role, granted_by, created_at)
			VALUES ($1, $2, $3, $4, $5)`,
			roleID, userID, *systemRole, nil, now)
		require.NoError(t, err, "failed to assign system role")
	}

	token := GenerateTestToken(email, fullName)

	return &TestUser{
		ID:           userID,
		Email:        email,
		FullName:     fullName,
		SystemRole:   systemRole,
		Token:        token,
		BearerHeader: "Bearer " + token,
	}
}

// CleanupUser removes a test user and their associated roles from the database.
func CleanupUser(t *testing.T, pool *pgxpool.Pool, userID string) {
	t.Helper()
	ctx := context.Background()

	// Delete in order of foreign key dependencies
	_, err := pool.Exec(ctx, "DELETE FROM identity.workspace_members WHERE user_id = $1", userID)
	require.NoError(t, err, "failed to cleanup workspace members for user")

	_, err = pool.Exec(ctx, "DELETE FROM identity.tenant_members WHERE user_id = $1", userID)
	require.NoError(t, err, "failed to cleanup tenant members for user")

	_, err = pool.Exec(ctx, "DELETE FROM identity.system_roles WHERE user_id = $1", userID)
	require.NoError(t, err, "failed to cleanup system roles for user")

	_, err = pool.Exec(ctx, "DELETE FROM identity.users WHERE id = $1", userID)
	require.NoError(t, err, "failed to cleanup user")
}

// CreateTestTenant creates a tenant in the database and returns its ID.
func CreateTestTenant(t *testing.T, pool *pgxpool.Pool, name, code string) string {
	t.Helper()
	ctx := context.Background()

	tenantID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO tenancy.tenants (id, name, code, description, settings, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		tenantID, name, code, "Test tenant", "{}", now)
	require.NoError(t, err, "failed to create test tenant")

	return tenantID
}

// CleanupTenant removes a test tenant and all associated data.
func CleanupTenant(t *testing.T, pool *pgxpool.Pool, tenantID string) {
	t.Helper()
	ctx := context.Background()

	// Delete in order of foreign key dependencies
	_, err := pool.Exec(ctx, "DELETE FROM identity.workspace_members WHERE workspace_id IN (SELECT id FROM tenancy.workspaces WHERE tenant_id = $1)", tenantID)
	require.NoError(t, err, "failed to cleanup workspace members for tenant")

	_, err = pool.Exec(ctx, "DELETE FROM tenancy.workspaces WHERE tenant_id = $1", tenantID)
	require.NoError(t, err, "failed to cleanup workspaces for tenant")

	_, err = pool.Exec(ctx, "DELETE FROM identity.tenant_members WHERE tenant_id = $1", tenantID)
	require.NoError(t, err, "failed to cleanup tenant members")

	_, err = pool.Exec(ctx, "DELETE FROM tenancy.tenants WHERE id = $1", tenantID)
	require.NoError(t, err, "failed to cleanup tenant")
}

// CreateTestWorkspace creates a workspace in the database and returns its ID.
func CreateTestWorkspace(t *testing.T, pool *pgxpool.Pool, tenantID *string, name string, wsType entity.WorkspaceType) string {
	t.Helper()
	ctx := context.Background()

	workspaceID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO tenancy.workspaces (id, tenant_id, name, type, status, settings, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		workspaceID, tenantID, name, wsType, entity.WorkspaceStatusActive, "{}", now)
	require.NoError(t, err, "failed to create test workspace")

	return workspaceID
}

// CleanupWorkspace removes a test workspace and all associated data.
func CleanupWorkspace(t *testing.T, pool *pgxpool.Pool, workspaceID string) {
	t.Helper()
	ctx := context.Background()

	// Delete in order of foreign key dependencies
	_, err := pool.Exec(ctx, "DELETE FROM identity.workspace_members WHERE workspace_id = $1", workspaceID)
	require.NoError(t, err, "failed to cleanup workspace members")

	_, err = pool.Exec(ctx, "DELETE FROM tenancy.workspaces WHERE id = $1", workspaceID)
	require.NoError(t, err, "failed to cleanup workspace")
}

// AssignSystemRole assigns a system role to an existing user.
func AssignSystemRole(t *testing.T, pool *pgxpool.Pool, userID string, role entity.SystemRole, grantedBy *string) string {
	t.Helper()
	ctx := context.Background()

	roleID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO identity.system_roles (id, user_id, role, granted_by, created_at)
		VALUES ($1, $2, $3, $4, $5)`,
		roleID, userID, role, grantedBy, now)
	require.NoError(t, err, "failed to assign system role")

	return roleID
}

// CleanupSystemRole removes a system role assignment.
func CleanupSystemRole(t *testing.T, pool *pgxpool.Pool, userID string) {
	t.Helper()
	ctx := context.Background()

	_, err := pool.Exec(ctx, "DELETE FROM identity.system_roles WHERE user_id = $1", userID)
	require.NoError(t, err, "failed to cleanup system role")
}

// CreateTestTenantMember creates a tenant membership in the database and returns its ID.
func CreateTestTenantMember(t *testing.T, pool *pgxpool.Pool,
	tenantID, userID string, role entity.TenantRole, grantedBy *string) string {
	t.Helper()
	ctx := context.Background()

	memberID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO identity.tenant_members
			(id, tenant_id, user_id, role, membership_status, granted_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		memberID, tenantID, userID, role, entity.MembershipStatusActive, grantedBy, now)
	require.NoError(t, err, "failed to create tenant member")

	return memberID
}

// CreateTestTenantMemberWithStatus creates a tenant membership with a specific status.
func CreateTestTenantMemberWithStatus(t *testing.T, pool *pgxpool.Pool,
	tenantID, userID string, role entity.TenantRole, status entity.MembershipStatus, grantedBy *string) string {
	t.Helper()
	ctx := context.Background()

	memberID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO identity.tenant_members
			(id, tenant_id, user_id, role, membership_status, granted_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		memberID, tenantID, userID, role, status, grantedBy, now)
	require.NoError(t, err, "failed to create tenant member")

	return memberID
}

// CreateTestWorkspaceMember creates a workspace membership in the database and returns its ID.
func CreateTestWorkspaceMember(t *testing.T, pool *pgxpool.Pool,
	workspaceID, userID string, role entity.WorkspaceRole, invitedBy *string) string {
	t.Helper()
	ctx := context.Background()

	memberID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO identity.workspace_members
			(id, workspace_id, user_id, role, membership_status, invited_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		memberID, workspaceID, userID, role, entity.MembershipStatusActive, invitedBy, now)
	require.NoError(t, err, "failed to create workspace member")

	return memberID
}

// Ptr is a helper function to create a pointer to a value.
func Ptr[T any](v T) *T {
	return &v
}

// CreateTestFolder creates a folder in the database and returns its ID.
func CreateTestFolder(t *testing.T, pool *pgxpool.Pool,
	workspaceID, name string, parentID *string) string {
	t.Helper()
	ctx := context.Background()

	folderID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO organizer.folders (id, workspace_id, parent_id, name, created_at)
		VALUES ($1, $2, $3, $4, $5)`,
		folderID, workspaceID, parentID, name, now)
	require.NoError(t, err, "failed to create test folder")

	return folderID
}

// CleanupFolder removes a test folder.
func CleanupFolder(t *testing.T, pool *pgxpool.Pool, folderID string) {
	t.Helper()
	ctx := context.Background()

	_, err := pool.Exec(ctx, "DELETE FROM organizer.folders WHERE id = $1", folderID)
	require.NoError(t, err, "failed to cleanup folder")
}

// CreateTestTag creates a tag in the database and returns its ID.
func CreateTestTag(t *testing.T, pool *pgxpool.Pool,
	workspaceID, name, color string) string {
	t.Helper()
	ctx := context.Background()

	tagID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO organizer.tags (id, workspace_id, name, color, created_at)
		VALUES ($1, $2, $3, $4, $5)`,
		tagID, workspaceID, name, color, now)
	require.NoError(t, err, "failed to create test tag")

	return tagID
}

// CleanupTag removes a test tag.
func CleanupTag(t *testing.T, pool *pgxpool.Pool, tagID string) {
	t.Helper()
	ctx := context.Background()

	_, err := pool.Exec(ctx, "DELETE FROM organizer.tags WHERE id = $1", tagID)
	require.NoError(t, err, "failed to cleanup tag")
}

// --- Content Fixtures ---

// CreateTestInjectable creates an injectable definition in the database and returns its ID.
// Schema: content.injectable_definitions
func CreateTestInjectable(t *testing.T, pool *pgxpool.Pool,
	workspaceID *string, key, label string, dataType entity.InjectableDataType) string {
	t.Helper()
	ctx := context.Background()

	injectableID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO content.injectable_definitions (id, workspace_id, key, label, description, data_type, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		injectableID, workspaceID, key, label, "", dataType, now)
	require.NoError(t, err, "failed to create test injectable")

	return injectableID
}

// CleanupInjectable removes a test injectable definition.
func CleanupInjectable(t *testing.T, pool *pgxpool.Pool, injectableID string) {
	t.Helper()
	ctx := context.Background()
	_, _ = pool.Exec(ctx, "DELETE FROM content.injectable_definitions WHERE id = $1", injectableID)
}

// CreateTestTemplate creates a template in the database and returns its ID.
// Schema: content.templates
func CreateTestTemplate(t *testing.T, pool *pgxpool.Pool,
	workspaceID string, title string, folderID *string) string {
	t.Helper()
	ctx := context.Background()

	templateID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO content.templates (id, workspace_id, folder_id, title, is_public_library, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		templateID, workspaceID, folderID, title, false, now)
	require.NoError(t, err, "failed to create test template")

	return templateID
}

// CleanupTemplate removes a test template and all its associated data.
func CleanupTemplate(t *testing.T, pool *pgxpool.Pool, templateID string) {
	t.Helper()
	ctx := context.Background()
	// Cascade: signer roles, injectables, versions, tags, template
	_, _ = pool.Exec(ctx, "DELETE FROM content.template_version_signer_roles WHERE template_version_id IN (SELECT id FROM content.template_versions WHERE template_id = $1)", templateID)
	_, _ = pool.Exec(ctx, "DELETE FROM content.template_version_injectables WHERE template_version_id IN (SELECT id FROM content.template_versions WHERE template_id = $1)", templateID)
	_, _ = pool.Exec(ctx, "DELETE FROM content.template_versions WHERE template_id = $1", templateID)
	_, _ = pool.Exec(ctx, "DELETE FROM content.template_tags WHERE template_id = $1", templateID)
	_, _ = pool.Exec(ctx, "DELETE FROM content.templates WHERE id = $1", templateID)
}

// CreateTestTemplateVersion creates a template version in the database and returns its ID.
// Schema: content.template_versions
func CreateTestTemplateVersion(t *testing.T, pool *pgxpool.Pool,
	templateID string, versionNumber int, name string, status entity.VersionStatus) string {
	t.Helper()
	ctx := context.Background()

	versionID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO content.template_versions
			(id, template_id, version_number, name, description, content_structure, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		versionID, templateID, versionNumber, name, nil, nil, status, now)
	require.NoError(t, err, "failed to create test template version")

	return versionID
}

// CleanupTemplateVersion removes a test template version and its associated data.
func CleanupTemplateVersion(t *testing.T, pool *pgxpool.Pool, versionID string) {
	t.Helper()
	ctx := context.Background()
	_, _ = pool.Exec(ctx, "DELETE FROM content.template_version_signer_roles WHERE template_version_id = $1", versionID)
	_, _ = pool.Exec(ctx, "DELETE FROM content.template_version_injectables WHERE template_version_id = $1", versionID)
	_, _ = pool.Exec(ctx, "DELETE FROM content.template_versions WHERE id = $1", versionID)
}

// CreateTestVersionInjectable links an injectable definition to a version.
// Schema: content.template_version_injectables
func CreateTestVersionInjectable(t *testing.T, pool *pgxpool.Pool,
	versionID, injectableID string, isRequired bool) string {
	t.Helper()
	ctx := context.Background()

	id := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO content.template_version_injectables
			(id, template_version_id, injectable_definition_id, is_required, default_value, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		id, versionID, injectableID, isRequired, nil, now)
	require.NoError(t, err, "failed to create version injectable")

	return id
}

// CleanupVersionInjectable removes a test version injectable.
func CleanupVersionInjectable(t *testing.T, pool *pgxpool.Pool, id string) {
	t.Helper()
	ctx := context.Background()
	_, _ = pool.Exec(ctx, "DELETE FROM content.template_version_injectables WHERE id = $1", id)
}

// CreateTestSignerRole creates a signer role for a version.
// Schema: content.template_version_signer_roles
func CreateTestSignerRole(t *testing.T, pool *pgxpool.Pool,
	versionID, roleName, anchorString string, signerOrder int) string {
	t.Helper()
	ctx := context.Background()

	roleID := uuid.NewString()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO content.template_version_signer_roles
			(id, template_version_id, role_name, anchor_string, signer_order, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		roleID, versionID, roleName, anchorString, signerOrder, now)
	require.NoError(t, err, "failed to create signer role")

	return roleID
}

// CleanupSignerRole removes a test signer role.
func CleanupSignerRole(t *testing.T, pool *pgxpool.Pool, roleID string) {
	t.Helper()
	ctx := context.Background()
	_, _ = pool.Exec(ctx, "DELETE FROM content.template_version_signer_roles WHERE id = $1", roleID)
}

// UpdateWorkspaceStatus updates a workspace's status directly in the database.
func UpdateWorkspaceStatus(t *testing.T, pool *pgxpool.Pool, workspaceID string, status entity.WorkspaceStatus) {
	t.Helper()
	ctx := context.Background()

	_, err := pool.Exec(ctx, `UPDATE tenancy.workspaces SET status = $1 WHERE id = $2`, status, workspaceID)
	require.NoError(t, err, "failed to update workspace status")
}

// CreateTestTemplateTag creates a template-tag relationship in the database.
func CreateTestTemplateTag(t *testing.T, pool *pgxpool.Pool, templateID, tagID string) {
	t.Helper()
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		INSERT INTO content.template_tags (template_id, tag_id)
		VALUES ($1, $2)`, templateID, tagID)
	require.NoError(t, err, "failed to create template tag")
}

// --- Document Fixtures ---

// CleanupDocument removes a test document and all associated data.
func CleanupDocument(t *testing.T, pool *pgxpool.Pool, documentID string) {
	t.Helper()
	ctx := context.Background()
	_, _ = pool.Exec(ctx, "DELETE FROM execution.document_events WHERE document_id = $1", documentID)
	_, _ = pool.Exec(ctx, "DELETE FROM execution.document_recipients WHERE document_id = $1", documentID)
	_, _ = pool.Exec(ctx, "DELETE FROM execution.documents WHERE id = $1", documentID)
}

// PublishTestVersion updates a template version status to PUBLISHED directly in the database.
func PublishTestVersion(t *testing.T, pool *pgxpool.Pool, versionID string) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `UPDATE content.template_versions SET status = 'PUBLISHED' WHERE id = $1`, versionID)
	require.NoError(t, err, "failed to publish version")
}
