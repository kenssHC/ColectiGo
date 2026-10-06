import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1784505600000 implements MigrationInterface {
  name = 'InitialSchema1784505600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firebase_uid" character varying NOT NULL,
        "display_name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."routes_type_enum" AS ENUM('colectivo', 'auto', 'bus')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."routes_status_enum" AS ENUM('active', 'inactive')`,
    );

    await queryRunner.query(`
      CREATE TABLE "routes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" "public"."routes_type_enum" NOT NULL,
        "fare" numeric(10,2) NOT NULL,
        "color" character varying NOT NULL DEFAULT '#3B82F6',
        "status" "public"."routes_status_enum" NOT NULL DEFAULT 'active',
        "polyline" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_routes_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_routes_status" ON "routes" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "stops" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "order" integer NOT NULL,
        "lat" double precision NOT NULL,
        "lng" double precision NOT NULL,
        "route_id" uuid NOT NULL,
        CONSTRAINT "PK_stops_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stops_route" FOREIGN KEY ("route_id")
          REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_stops_route_id" ON "stops" ("route_id")`);

    await queryRunner.query(
      `CREATE TYPE "public"."route_suggestions_type_enum" AS ENUM('stop_position', 'route_path', 'fare', 'schedule', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."route_suggestions_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );

    await queryRunner.query(`
      CREATE TABLE "route_suggestions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "public"."route_suggestions_type_enum" NOT NULL,
        "description" text NOT NULL,
        "status" "public"."route_suggestions_status_enum" NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "route_id" uuid NOT NULL,
        CONSTRAINT "PK_route_suggestions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_route_suggestions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_route_suggestions_route" FOREIGN KEY ("route_id")
          REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_route_suggestions_user_id" ON "route_suggestions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_route_suggestions_route_id" ON "route_suggestions" ("route_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "route_suggestions"`);
    await queryRunner.query(`DROP TYPE "public"."route_suggestions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."route_suggestions_type_enum"`);
    await queryRunner.query(`DROP TABLE "stops"`);
    await queryRunner.query(`DROP TABLE "routes"`);
    await queryRunner.query(`DROP TYPE "public"."routes_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."routes_type_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
