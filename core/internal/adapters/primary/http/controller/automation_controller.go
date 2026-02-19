package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/rendis/doc-assembly/core/internal/adapters/primary/http/dto"
	"github.com/rendis/doc-assembly/core/internal/adapters/primary/http/mapper"
	"github.com/rendis/doc-assembly/core/internal/adapters/primary/http/middleware"
	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/port"
	cataloguc "github.com/rendis/doc-assembly/core/internal/core/usecase/catalog"
	injectableuc "github.com/rendis/doc-assembly/core/internal/core/usecase/injectable"
	organizationuc "github.com/rendis/doc-assembly/core/internal/core/usecase/organization"
	templateuc "github.com/rendis/doc-assembly/core/internal/core/usecase/template"
)

const (
	// automationRequestTimeout is a generous timeout for automation API requests.
	automationRequestTimeout = 60 * time.Second
)

// AutomationController handles all /api/v1/automation/* routes.
// It uses automation API key authentication and audit logging.
type AutomationController struct {
	tenantUC          organizationuc.TenantUseCase
	workspaceUC       organizationuc.WorkspaceUseCase
	injectableUC      injectableuc.InjectableUseCase
	templateUC        templateuc.TemplateUseCase
	templateVersionUC templateuc.TemplateVersionUseCase
	documentTypeUC    cataloguc.DocumentTypeUseCase
	keyRepo           port.AutomationAPIKeyRepository
	auditRepo         port.AutomationAuditLogRepository
	templateMapper    *mapper.TemplateMapper
	versionMapper     *mapper.TemplateVersionMapper
	injectableMapper  *mapper.InjectableMapper
	docTypeMapper     *mapper.DocumentTypeMapper
}

// NewAutomationController creates a new AutomationController.
func NewAutomationController(
	tenantUC organizationuc.TenantUseCase,
	workspaceUC organizationuc.WorkspaceUseCase,
	injectableUC injectableuc.InjectableUseCase,
	templateUC templateuc.TemplateUseCase,
	templateVersionUC templateuc.TemplateVersionUseCase,
	documentTypeUC cataloguc.DocumentTypeUseCase,
	keyRepo port.AutomationAPIKeyRepository,
	auditRepo port.AutomationAuditLogRepository,
	templateMapper *mapper.TemplateMapper,
	versionMapper *mapper.TemplateVersionMapper,
	injectableMapper *mapper.InjectableMapper,
	docTypeMapper *mapper.DocumentTypeMapper,
) *AutomationController {
	return &AutomationController{
		tenantUC:          tenantUC,
		workspaceUC:       workspaceUC,
		injectableUC:      injectableUC,
		templateUC:        templateUC,
		templateVersionUC: templateVersionUC,
		documentTypeUC:    documentTypeUC,
		keyRepo:           keyRepo,
		auditRepo:         auditRepo,
		templateMapper:    templateMapper,
		versionMapper:     versionMapper,
		injectableMapper:  injectableMapper,
		docTypeMapper:     docTypeMapper,
	}
}

// RegisterRoutes sets up the /api/v1/automation route group with its own middleware chain.
func (ctrl *AutomationController) RegisterRoutes(base *gin.Engine) {
	g := base.Group("/api/v1/automation")
	g.Use(middleware.Operation())
	g.Use(middleware.RequestTimeout(automationRequestTimeout))
	g.Use(middleware.AutomationKeyAuth(ctrl.keyRepo))
	g.Use(middleware.AutomationAuditLogger(ctrl.auditRepo))

	// Tenants
	g.GET("/tenants", ctrl.listTenants)

	// Workspaces (tenant-scoped)
	g.GET("/tenants/:tenantId/workspaces", ctrl.listWorkspaces)
	g.POST("/tenants/:tenantId/workspaces", ctrl.createWorkspace)

	// Injectables (workspace-scoped)
	g.GET("/workspaces/:workspaceId/injectables", ctrl.listInjectables)

	// Templates (workspace-scoped)
	g.GET("/workspaces/:workspaceId/templates", ctrl.listTemplates)
	g.POST("/workspaces/:workspaceId/templates", ctrl.createTemplate)
	g.GET("/workspaces/:workspaceId/templates/:templateId", ctrl.getTemplate)
	g.PATCH("/workspaces/:workspaceId/templates/:templateId", ctrl.updateTemplate)

	// Document Types
	g.GET("/document-types", ctrl.listDocumentTypes)
	g.POST("/templates/:templateId/document-type", ctrl.assignDocumentType)

	// Versions
	g.GET("/templates/:templateId/versions", ctrl.listVersions)
	g.POST("/templates/:templateId/versions", ctrl.createVersion)
	g.GET("/templates/:templateId/versions/:versionId", ctrl.getVersion)
	g.PATCH("/templates/:templateId/versions/:versionId", ctrl.updateVersion)
	g.POST("/templates/:templateId/versions/:versionId/publish", ctrl.publishVersion)
	g.POST("/templates/:templateId/versions/:versionId/archive", ctrl.archiveVersion)
	g.GET("/templates/:templateId/versions/:versionId/content", ctrl.getVersionContent)
	g.PUT("/templates/:templateId/versions/:versionId/content", ctrl.updateVersionContent)
}

// checkTenantAccess verifies the API key has access to the given tenant.
// Returns false and writes a 403 response if access is denied.
func (ctrl *AutomationController) checkTenantAccess(c *gin.Context, tenantID string) bool {
	allowed := middleware.GetAutomationAllowedTenants(c)
	if len(allowed) == 0 {
		return true // global access
	}
	for _, t := range allowed {
		if t == tenantID {
			return true
		}
	}
	c.JSON(http.StatusForbidden, gin.H{"error": "API key does not have access to this tenant"})
	return false
}

// --- Tenant Handlers ---

// listTenants lists tenants (filtered by allowedTenants if the key is restricted).
func (ctrl *AutomationController) listTenants(c *gin.Context) {
	filters := port.TenantFilters{
		Limit:  100,
		Offset: 0,
	}

	tenants, _, err := ctrl.tenantUC.ListTenantsPaginated(c.Request.Context(), filters)
	if err != nil {
		HandleError(c, err)
		return
	}

	// If the key has restricted access, filter to allowed tenants only.
	allowed := middleware.GetAutomationAllowedTenants(c)
	if len(allowed) > 0 {
		allowedSet := make(map[string]struct{}, len(allowed))
		for _, id := range allowed {
			allowedSet[id] = struct{}{}
		}
		filtered := make([]*entity.Tenant, 0, len(allowed))
		for _, t := range tenants {
			if _, ok := allowedSet[t.ID]; ok {
				filtered = append(filtered, t)
			}
		}
		tenants = filtered
	}

	responses := mapper.TenantsToResponses(tenants)
	c.JSON(http.StatusOK, dto.NewListResponse(responses))
}

// --- Workspace Handlers ---

// listWorkspaces lists workspaces for a tenant.
func (ctrl *AutomationController) listWorkspaces(c *gin.Context) {
	tenantID := c.Param("tenantId")
	if !ctrl.checkTenantAccess(c, tenantID) {
		return
	}

	// automation API returns all workspaces, using a high limit
	filters := port.WorkspaceFilters{
		Limit:  1000,
		Offset: 0,
	}

	workspaces, _, err := ctrl.tenantUC.ListTenantWorkspaces(c.Request.Context(), tenantID, filters)
	if err != nil {
		HandleError(c, err)
		return
	}

	responses := mapper.WorkspacesToResponses(workspaces)
	c.JSON(http.StatusOK, dto.NewListResponse(responses))
}

// createWorkspace creates a new workspace in a tenant.
func (ctrl *AutomationController) createWorkspace(c *gin.Context) {
	tenantID := c.Param("tenantId")
	if !ctrl.checkTenantAccess(c, tenantID) {
		return
	}

	var req dto.AutomationCreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, err)
		return
	}

	cmd := organizationuc.CreateWorkspaceCommand{
		TenantID:  &tenantID,
		Name:      req.Name,
		Type:      entity.WorkspaceTypeClient,
		CreatedBy: "automation",
	}

	workspace, err := ctrl.workspaceUC.CreateWorkspace(c.Request.Context(), cmd)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, mapper.WorkspaceToResponse(workspace))
}

// --- Injectable Handlers ---

// listInjectables lists all injectables for a workspace.
func (ctrl *AutomationController) listInjectables(c *gin.Context) {
	workspaceID := c.Param("workspaceId")

	result, err := ctrl.injectableUC.ListInjectables(c.Request.Context(), &injectableuc.ListInjectablesRequest{
		WorkspaceID: workspaceID,
	})
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, ctrl.injectableMapper.ToListResponse(result.Injectables, result.Groups))
}

// --- Template Handlers ---

// listTemplates lists all templates in a workspace.
func (ctrl *AutomationController) listTemplates(c *gin.Context) {
	workspaceID := c.Param("workspaceId")

	templates, err := ctrl.templateUC.ListTemplates(c.Request.Context(), workspaceID, port.TemplateFilters{})
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.NewListResponse(ctrl.templateMapper.ToListItemResponseList(templates)))
}

// createTemplate creates a new template in a workspace.
func (ctrl *AutomationController) createTemplate(c *gin.Context) {
	workspaceID := c.Param("workspaceId")

	var req dto.AutomationCreateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, err)
		return
	}

	cmd := templateuc.CreateTemplateCommand{
		WorkspaceID: workspaceID,
		Title:       req.Name,
		CreatedBy:   "automation",
	}

	template, version, err := ctrl.templateUC.CreateTemplate(c.Request.Context(), cmd)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, ctrl.templateMapper.ToCreateResponse(template, version))
}

// getTemplate retrieves a template with its details.
func (ctrl *AutomationController) getTemplate(c *gin.Context) {
	templateID := c.Param("templateId")

	details, err := ctrl.templateUC.GetTemplateWithDetails(c.Request.Context(), templateID)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, ctrl.templateMapper.ToDetailsResponse(details))
}

// updateTemplate partially updates a template's metadata.
func (ctrl *AutomationController) updateTemplate(c *gin.Context) {
	templateID := c.Param("templateId")

	var req dto.AutomationUpdateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, err)
		return
	}

	cmd := templateuc.UpdateTemplateCommand{
		ID:    templateID,
		Title: req.Name,
	}

	template, err := ctrl.templateUC.UpdateTemplate(c.Request.Context(), cmd)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, ctrl.templateMapper.ToResponse(template))
}

// --- Document Type Handlers ---

// listDocumentTypes lists all document types.
// Since no tenantId is provided in this route, we return all accessible types.
// For simplicity, we accept an optional tenantId query parameter.
func (ctrl *AutomationController) listDocumentTypes(c *gin.Context) {
	tenantID := c.Query("tenantId")
	if tenantID == "" {
		// Without a tenantId we cannot scope the query; require the caller to pass it.
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantId query parameter is required"})
		return
	}

	if !ctrl.checkTenantAccess(c, tenantID) {
		return
	}

	docTypes, _, err := ctrl.documentTypeUC.ListDocumentTypes(c.Request.Context(), tenantID, port.DocumentTypeFilters{
		Limit:  200,
		Offset: 0,
	})
	if err != nil {
		HandleError(c, err)
		return
	}

	responses := make([]*dto.DocumentTypeResponse, 0, len(docTypes))
	for _, dt := range docTypes {
		responses = append(responses, ctrl.docTypeMapper.ToResponse(dt))
	}
	c.JSON(http.StatusOK, dto.NewListResponse(responses))
}

// assignDocumentType assigns a document type to a template.
func (ctrl *AutomationController) assignDocumentType(c *gin.Context) {
	templateID := c.Param("templateId")

	var req dto.AutomationAssignDocumentTypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, err)
		return
	}

	// Retrieve the template to get workspaceID for conflict checking.
	tmpl, err := ctrl.templateUC.GetTemplate(c.Request.Context(), templateID)
	if err != nil {
		HandleError(c, err)
		return
	}

	cmd := templateuc.AssignDocumentTypeCommand{
		TemplateID:     templateID,
		WorkspaceID:    tmpl.WorkspaceID,
		DocumentTypeID: &req.DocumentTypeID,
		Force:          false,
	}

	result, err := ctrl.templateUC.AssignDocumentType(c.Request.Context(), cmd)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, mapper.AssignResultToResponse(result, ctrl.templateMapper))
}

// --- Version Handlers ---

// listVersions lists all versions for a template.
func (ctrl *AutomationController) listVersions(c *gin.Context) {
	templateID := c.Param("templateId")

	versions, err := ctrl.templateVersionUC.ListVersions(c.Request.Context(), templateID)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, ctrl.versionMapper.ToListResponse(versions))
}

// createVersion creates a new version for a template.
func (ctrl *AutomationController) createVersion(c *gin.Context) {
	templateID := c.Param("templateId")

	var req dto.AutomationCreateVersionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, err)
		return
	}

	automationUser := "automation"
	cmd := templateuc.CreateVersionCommand{
		TemplateID:  templateID,
		Name:        req.Name,
		Description: &req.Description,
		CreatedBy:   &automationUser,
	}

	version, err := ctrl.templateVersionUC.CreateVersion(c.Request.Context(), cmd)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, ctrl.versionMapper.ToResponse(version))
}

// getVersion retrieves a version with details.
func (ctrl *AutomationController) getVersion(c *gin.Context) {
	versionID := c.Param("versionId")

	details, err := ctrl.templateVersionUC.GetVersionWithDetails(c.Request.Context(), versionID)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, ctrl.versionMapper.ToDetailResponse(details))
}

// updateVersion partially updates a version's name and/or description.
func (ctrl *AutomationController) updateVersion(c *gin.Context) {
	versionID := c.Param("versionId")

	var req dto.AutomationUpdateVersionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, err)
		return
	}

	cmd := templateuc.UpdateVersionCommand{
		ID:          versionID,
		Name:        req.Name,
		Description: req.Description,
	}

	version, err := ctrl.templateVersionUC.UpdateVersion(c.Request.Context(), cmd)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, ctrl.versionMapper.ToResponse(version))
}

// publishVersion publishes a version.
func (ctrl *AutomationController) publishVersion(c *gin.Context) {
	versionID := c.Param("versionId")

	if err := ctrl.templateVersionUC.PublishVersion(c.Request.Context(), versionID, "automation"); err != nil {
		HandleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// archiveVersion archives a published version.
func (ctrl *AutomationController) archiveVersion(c *gin.Context) {
	versionID := c.Param("versionId")

	if err := ctrl.templateVersionUC.ArchiveVersion(c.Request.Context(), versionID, "automation"); err != nil {
		HandleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// getVersionContent retrieves the full content (including contentStructure) for a version.
func (ctrl *AutomationController) getVersionContent(c *gin.Context) {
	versionID := c.Param("versionId")

	details, err := ctrl.templateVersionUC.GetVersionWithDetails(c.Request.Context(), versionID)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, ctrl.versionMapper.ToDetailResponse(details))
}

// updateVersionContent replaces the content structure of a DRAFT version.
func (ctrl *AutomationController) updateVersionContent(c *gin.Context) {
	versionID := c.Param("versionId")

	var req dto.AutomationUpdateVersionContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, err)
		return
	}

	if err := ctrl.templateVersionUC.UpdateVersionContent(c.Request.Context(), versionID, req.ContentStructure); err != nil {
		HandleError(c, err)
		return
	}

	c.Status(http.StatusOK)
}
