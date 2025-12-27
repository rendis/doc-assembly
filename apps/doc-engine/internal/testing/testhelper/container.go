//go:build integration

package testhelper

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib" // Register pgx driver with database/sql for Snapshot/Restore
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/network"
	"github.com/testcontainers/testcontainers-go/wait"
)

var (
	testContainer *postgres.PostgresContainer
	testNetwork   *testcontainers.DockerNetwork
	testPool      *pgxpool.Pool
	once          sync.Once
	initErr       error
	restoreMu     sync.Mutex
)

// GetTestPool returns a connection pool to a PostgreSQL testcontainer
// with all Liquibase migrations applied.
// Uses singleton pattern - container is shared across all tests.
// Tests are responsible for cleaning up their own data.
func GetTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	once.Do(func() {
		testContainer, testNetwork, testPool, initErr = setupTestContainer()
		// Note: Snapshot/Restore disabled to avoid connection termination issues.
		// Tests should clean up their own data with defer cleanup functions.
	})

	if initErr != nil {
		t.Skipf("Skipping integration test: %v", initErr)
	}

	return testPool
}

func setupTestContainer() (*postgres.PostgresContainer, *testcontainers.DockerNetwork, *pgxpool.Pool, error) {
	ctx := context.Background()

	// 1. Create Docker network for container communication
	// Best practice: Use network.New() instead of GenericNetwork
	nw, err := network.New(ctx)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("creating network: %w", err)
	}

	// 2. Start PostgreSQL container with network
	// Best practice: Use postgres.Run() with BasicWaitStrategies()
	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("doc_engine_test"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		postgres.WithSQLDriver("pgx"), // Required for Snapshot/Restore
		postgres.BasicWaitStrategies(),
		network.WithNetwork([]string{"postgres"}, nw),
	)
	if err != nil {
		nw.Remove(ctx)
		return nil, nil, nil, fmt.Errorf("starting postgres: %w", err)
	}

	// 3. Run Liquibase migrations
	if err := runLiquibaseMigrations(ctx, nw); err != nil {
		pgContainer.Terminate(ctx)
		nw.Remove(ctx)
		return nil, nil, nil, fmt.Errorf("running migrations: %w", err)
	}

	// 4. Get connection string and create pool
	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		pgContainer.Terminate(ctx)
		nw.Remove(ctx)
		return nil, nil, nil, fmt.Errorf("getting connection string: %w", err)
	}

	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		pgContainer.Terminate(ctx)
		nw.Remove(ctx)
		return nil, nil, nil, fmt.Errorf("creating pool: %w", err)
	}

	return pgContainer, nw, pool, nil
}

func runLiquibaseMigrations(ctx context.Context, nw *testcontainers.DockerNetwork) error {
	dbDir := findDBDir()
	if dbDir == "" {
		return fmt.Errorf("could not find db directory with changelog.master.xml")
	}

	// According to Testcontainers documentation:
	// - CopyDirToContainer requires parent directory to exist
	// - Exec only works on running containers
	// Solution: Start container with sleep, create dir, copy files, then run liquibase via Exec

	// Start container with a long-running entrypoint (sleep)
	// This allows us to copy files before running liquibase
	req := testcontainers.ContainerRequest{
		Image:      "liquibase/liquibase:4.30-alpine",
		Entrypoint: []string{"/bin/sh"},
		Cmd:        []string{"-c", "sleep 300"}, // Keep container alive for 5 min
		Networks:   []string{nw.Name},
		WaitingFor: wait.ForLog("").WithStartupTimeout(10 * time.Second), // Container starts immediately
	}

	// Create and start container
	liquibaseC, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		return fmt.Errorf("starting liquibase container: %w", err)
	}
	defer liquibaseC.Terminate(ctx)

	// Create target directory (now that container is running, Exec works)
	_, _, err = liquibaseC.Exec(ctx, []string{"mkdir", "-p", "/liquibase/changelog"})
	if err != nil {
		return fmt.Errorf("creating changelog directory: %w", err)
	}

	// Copy master changelog file
	masterFile := filepath.Join(dbDir, "changelog.master.xml")
	if err := liquibaseC.CopyFileToContainer(ctx, masterFile, "/liquibase/changelog/changelog.master.xml", 0644); err != nil {
		return fmt.Errorf("copying master changelog: %w", err)
	}

	// Create src directory and copy src contents
	_, _, err = liquibaseC.Exec(ctx, []string{"mkdir", "-p", "/liquibase/changelog/src"})
	if err != nil {
		return fmt.Errorf("creating src directory: %w", err)
	}

	// Copy src directory (contains all migration changelogs)
	srcDir := filepath.Join(dbDir, "src")
	if err := liquibaseC.CopyDirToContainer(ctx, srcDir, "/liquibase/changelog/src", 0755); err != nil {
		return fmt.Errorf("copying src: %w", err)
	}

	// Run liquibase update command
	exitCode, output, err := liquibaseC.Exec(ctx, []string{
		"liquibase",
		"--url=jdbc:postgresql://postgres:5432/doc_engine_test",
		"--username=test",
		"--password=test",
		"--changeLogFile=changelog.master.xml",
		"--searchPath=/liquibase/changelog",
		"--logLevel=warning",
		"update",
	})
	if err != nil {
		return fmt.Errorf("executing liquibase: %w", err)
	}

	if exitCode != 0 {
		outputBytes, _ := io.ReadAll(output)
		return fmt.Errorf("liquibase failed (exit %d): %s", exitCode, string(outputBytes))
	}

	return nil
}

func findDBDir() string {
	// Try environment variable first
	if envDir := os.Getenv("DB_CHANGELOG_DIR"); envDir != "" {
		if _, err := os.Stat(filepath.Join(envDir, "changelog.master.xml")); err == nil {
			return envDir
		}
	}

	// Relative paths from various possible working directories
	// Tests may run from: module root (apps/doc-engine), test package dir, or project root
	candidates := []string{
		"../../db",                // from apps/doc-engine
		"../../../../../../../db", // from apps/doc-engine/internal/adapters/secondary/database/postgres
		"../../../../../../db",    // one less level
		"../../../../../db",       // from apps/doc-engine/internal/adapters/secondary
		"db",                      // from project root
		"./db",                    // from project root (explicit)
	}

	cwd, _ := os.Getwd()

	for _, candidate := range candidates {
		var abs string
		if filepath.IsAbs(candidate) {
			abs = candidate
		} else {
			abs = filepath.Join(cwd, candidate)
		}
		if _, err := os.Stat(filepath.Join(abs, "changelog.master.xml")); err == nil {
			return abs
		}
	}

	// Fallback: try to find by walking up from current directory
	dir := cwd
	for i := 0; i < 10; i++ { // max 10 levels up
		candidate := filepath.Join(dir, "db")
		if _, err := os.Stat(filepath.Join(candidate, "changelog.master.xml")); err == nil {
			return candidate
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return ""
}

// CleanupContainers terminates all test containers.
// Call from TestMain or use t.Cleanup() in individual tests.
func CleanupContainers(ctx context.Context) {
	if testPool != nil {
		testPool.Close()
	}
	if testContainer != nil {
		testContainer.Terminate(ctx)
	}
	if testNetwork != nil {
		testNetwork.Remove(ctx)
	}
}
