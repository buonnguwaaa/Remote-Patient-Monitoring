package seed

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/mongo"
)

// DropDatabase removes all collections in the target database before seeding.
func DropDatabase(ctx context.Context, db *mongo.Database) error {
	log.Printf("[seed] dropping database %q...", db.Name())
	if err := db.Drop(ctx); err != nil {
		return err
	}
	log.Printf("[seed] database %q dropped", db.Name())
	return nil
}
