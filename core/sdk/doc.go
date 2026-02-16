// Package sdk provides the public API for doc-assembly.
//
// Use sdk.New() to create an Engine, register extensions, and call Run():
//
//	engine := sdk.New()
//	engine.RegisterInjector(myInjector)
//	engine.SetMapper(myMapper)
//	engine.Run()
//
// For custom configuration:
//
//	engine := sdk.NewWithConfig("settings/app.yaml")
//	engine.Run()
//
// Run database migrations:
//
//	engine := sdk.New()
//	engine.RunMigrations()
package sdk
