import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reemplaza el modelo de paraderos fijos por el modelo real de Huancayo:
 * empresas → flotas → rutas → recorridos (polilíneas de ida/vuelta con
 * variantes). Los datos de rutas anteriores eran de prueba y se eliminan.
 */
export class CompaniesFleetsRoutePaths1787961600000 implements MigrationInterface {
  name = 'CompaniesFleetsRoutePaths1787961600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Datos de prueba del modelo anterior: fuera.
    await queryRunner.query(`DELETE FROM "route_suggestions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stops"`);
    await queryRunner.query(`DELETE FROM "routes"`);

    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "code" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_companies_code" UNIQUE ("code"),
        CONSTRAINT "PK_companies_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fleets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "number" character varying NOT NULL,
        "vehicle_image_url" text,
        "company_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fleets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_fleets_company_number" UNIQUE ("company_id", "number"),
        CONSTRAINT "FK_fleets_company" FOREIGN KEY ("company_id")
          REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_fleets_company_id" ON "fleets" ("company_id")`);

    // Recrear el enum de tipo de vehículo para incluir 'combi'.
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "type" TYPE character varying`,
    );
    await queryRunner.query(`DROP TYPE "public"."routes_type_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."routes_type_enum" AS ENUM('colectivo', 'auto', 'combi', 'bus')`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "type" TYPE "public"."routes_type_enum" USING "type"::"public"."routes_type_enum"`,
    );

    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN IF EXISTS "polyline"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "start_terminal_name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "end_terminal_name" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "routes" ADD "fleet_id" uuid NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "routes" ADD CONSTRAINT "FK_routes_fleet" FOREIGN KEY ("fleet_id")
        REFERENCES "fleets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`CREATE INDEX "IDX_routes_fleet_id" ON "routes" ("fleet_id")`);

    await queryRunner.query(
      `CREATE TYPE "public"."route_paths_direction_enum" AS ENUM('ida', 'vuelta')`,
    );
    await queryRunner.query(`
      CREATE TABLE "route_paths" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "direction" "public"."route_paths_direction_enum" NOT NULL,
        "variant_name" character varying,
        "start_name" character varying NOT NULL,
        "end_name" character varying NOT NULL,
        "coordinates" jsonb NOT NULL,
        "route_id" uuid NOT NULL,
        CONSTRAINT "PK_route_paths_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_route_paths_route" FOREIGN KEY ("route_id")
          REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_route_paths_route_id" ON "route_paths" ("route_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "route_suggestions"`);
    await queryRunner.query(`DROP TABLE "route_paths"`);
    await queryRunner.query(`DROP TYPE "public"."route_paths_direction_enum"`);

    await queryRunner.query(`DELETE FROM "routes"`);
    await queryRunner.query(`ALTER TABLE "routes" DROP CONSTRAINT "FK_routes_fleet"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_routes_fleet_id"`);
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "fleet_id"`);
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "end_terminal_name"`);
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "start_terminal_name"`);
    await queryRunner.query(`ALTER TABLE "routes" ADD "polyline" text`);

    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "type" TYPE character varying`,
    );
    await queryRunner.query(`DROP TYPE "public"."routes_type_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."routes_type_enum" AS ENUM('colectivo', 'auto', 'bus')`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "type" TYPE "public"."routes_type_enum" USING "type"::"public"."routes_type_enum"`,
    );

    await queryRunner.query(`DROP TABLE "fleets"`);
    await queryRunner.query(`DROP TABLE "companies"`);

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
  }
}
