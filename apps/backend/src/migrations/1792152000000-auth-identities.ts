import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthIdentities1792152000000 implements MigrationInterface {
  name = 'AuthIdentities1792152000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_identities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "provider" character varying NOT NULL,
        "provider_user_id" character varying NOT NULL,
        "provider_email" character varying,
        "last_used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_identities_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_identities_provider_user"
          UNIQUE ("provider", "provider_user_id"),
        CONSTRAINT "UQ_auth_identities_user_provider"
          UNIQUE ("user_id", "provider"),
        CONSTRAINT "FK_auth_identities_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_identities_user_id" ON "auth_identities" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_auth_identities_user_id"`);
    await queryRunner.query(`DROP TABLE "auth_identities"`);
  }
}
