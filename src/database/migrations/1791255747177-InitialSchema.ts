import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791255747177 implements MigrationInterface {
  name = 'InitialSchema1791255747177';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` char(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`email\` varchar(190) NOT NULL, \`password_hash\` varchar(255) NOT NULL, \`first_name\` varchar(100) NOT NULL, \`last_name\` varchar(100) NOT NULL, \`roles\` text NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`providers\` (\`id\` char(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`user_id\` char(36) NOT NULL, \`display_name\` varchar(120) NOT NULL, \`specialty\` varchar(120) NULL, \`bio\` text NULL, \`avatar_url\` varchar(500) NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`bank_alias\` varchar(60) NULL, \`bank_cbu\` varchar(30) NULL, \`bank_holder\` varchar(120) NULL, \`bank_cuil\` varchar(20) NULL, \`bank_name\` varchar(80) NULL, UNIQUE INDEX \`REL_842a46f6b0079a69520561eeb6\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`weekly_availability\` (\`id\` char(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`provider_id\` char(36) NOT NULL, \`day_of_week\` tinyint NOT NULL, \`start_time\` varchar(5) NOT NULL, \`end_time\` varchar(5) NOT NULL, INDEX \`IDX_472a6cd1cd65461b39610c1c4c\` (\`provider_id\`, \`day_of_week\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`availability_exceptions\` (\`id\` char(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`provider_id\` char(36) NOT NULL, \`date\` date NOT NULL, \`type\` enum ('UNAVAILABLE', 'AVAILABLE') NOT NULL, \`start_time\` varchar(5) NULL, \`end_time\` varchar(5) NULL, \`reason\` varchar(255) NULL, INDEX \`IDX_fb2b13e164f02b2260ba213e88\` (\`provider_id\`, \`date\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`categories\` (\`id\` char(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`name\` varchar(100) NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`IDX_8b0be371d28245da6e4f4b6187\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`services\` (\`id\` char(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`name\` varchar(150) NOT NULL, \`description\` text NULL, \`image_url\` varchar(500) NULL, \`duration_minutes\` smallint UNSIGNED NOT NULL, \`price\` decimal(12,2) NOT NULL, \`prep_minutes\` smallint UNSIGNED NOT NULL DEFAULT '0', \`cleanup_minutes\` smallint UNSIGNED NOT NULL DEFAULT '0', \`is_active\` tinyint NOT NULL DEFAULT 1, \`recommendation_tags\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`service_dates\` (\`service_id\` char(36) NOT NULL, \`date\` date NOT NULL, PRIMARY KEY (\`service_id\`, \`date\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`provider_services\` (\`provider_id\` char(36) NOT NULL, \`service_id\` char(36) NOT NULL, PRIMARY KEY (\`provider_id\`, \`service_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`treatments\` (\`id\` char(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`name\` varchar(150) NOT NULL, \`description\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`recommendation_tags\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`treatment_services\` (\`treatment_id\` char(36) NOT NULL, \`position\` smallint UNSIGNED NOT NULL, \`service_id\` char(36) NOT NULL, PRIMARY KEY (\`treatment_id\`, \`position\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clients\` (\`id\` char(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`user_id\` char(36) NULL, \`first_name\` varchar(100) NOT NULL, \`last_name\` varchar(100) NOT NULL, \`dni\` varchar(20) NOT NULL, \`phone\` varchar(40) NOT NULL, \`email\` varchar(190) NULL, INDEX \`IDX_3567e933b1eef4720d92e9af2e\` (\`last_name\`), INDEX \`IDX_aa22377d7d3e794ae4cd39cd9e\` (\`phone\`), UNIQUE INDEX \`IDX_8e645da308339e84f45d6cfe5d\` (\`dni\`), UNIQUE INDEX \`REL_07a7a09b04e7b035c9d90cf498\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`appointments\` (\`id\` char(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`code\` varchar(12) NOT NULL, \`client_id\` char(36) NOT NULL, \`provider_id\` char(36) NOT NULL, \`service_id\` char(36) NOT NULL, \`start_at\` datetime(3) NOT NULL, \`end_at\` datetime(3) NOT NULL, \`blocked_from\` datetime(3) NOT NULL, \`blocked_until\` datetime(3) NOT NULL, \`status\` enum ('CREATED', 'PAYMENT_INFORMED', 'DEPOSIT_PAID', 'FINISHED', 'CANCELLED', 'EXPIRED') NOT NULL, \`hold_expires_at\` datetime(3) NULL, \`price\` decimal(12,2) NOT NULL, \`deposit_amount\` decimal(12,2) NOT NULL, \`guest_token_hash\` char(64) NULL, \`created_by_staff\` tinyint NOT NULL DEFAULT 0, \`rescheduled\` tinyint NOT NULL DEFAULT 0, \`reschedule_reason\` varchar(500) NULL, \`cancellation_reason\` varchar(500) NULL, \`cancelled_by\` enum ('CLIENT', 'PROVIDER', 'ADMIN') NULL, \`deposit_outcome\` enum ('REFUND', 'FORFEIT', 'NOT_APPLICABLE') NULL, \`cancelled_at\` datetime(3) NULL, \`recommendation_id\` char(36) NULL, \`reminder_sent_at\` datetime(3) NULL, INDEX \`IDX_ccc5bbce58ad6bc96faa428b1e\` (\`client_id\`), INDEX \`IDX_1cc2f75700cd3f7db931ed877c\` (\`status\`, \`start_at\`), INDEX \`IDX_ce5d4628a5eda89a931b18dbdb\` (\`status\`, \`hold_expires_at\`), INDEX \`IDX_ad0f82e6a27eb6949f2a334fe8\` (\`provider_id\`, \`blocked_from\`, \`blocked_until\`), UNIQUE INDEX \`IDX_d838dde2371446d33c990332cb\` (\`code\`), UNIQUE INDEX \`IDX_0be8832c5fdba5d3e1cb107121\` (\`guest_token_hash\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`deposits\` (\`id\` char(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`appointment_id\` char(36) NOT NULL, \`amount\` decimal(12,2) NOT NULL, \`status\` enum ('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING', \`receipt_key\` varchar(80) NOT NULL, \`receipt_size_bytes\` int UNSIGNED NOT NULL, \`uploaded_at\` datetime(3) NOT NULL, \`reviewed_at\` datetime(3) NULL, \`reviewed_by_user_id\` char(36) NULL, \`rejection_reason\` varchar(500) NULL, INDEX \`IDX_ea98b8a3587b72644b1dcc3436\` (\`appointment_id\`), INDEX \`IDX_6f61d8aaf4fa58a9507836ca0d\` (\`status\`, \`uploaded_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`recommendations\` (\`id\` char(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`client_id\` char(36) NULL, \`answers\` text NOT NULL, \`type\` enum ('SERVICE', 'TREATMENT') NOT NULL, \`service_id\` char(36) NULL, \`treatment_id\` char(36) NULL, \`confidence\` decimal(5,3) NOT NULL, \`source\` enum ('LAYA', 'RULES') NOT NULL, \`outcome\` enum ('PENDING', 'ACCEPTED', 'DISCARDED') NOT NULL DEFAULT 'PENDING', \`led_to_booking\` tinyint NOT NULL DEFAULT 0, INDEX \`IDX_35393de58b4f4292d60ebcf461\` (\`client_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`service_categories\` (\`service_id\` char(36) NOT NULL, \`category_id\` char(36) NOT NULL, INDEX \`IDX_e745636979d86799a14c0357a3\` (\`service_id\`), INDEX \`IDX_781505e61aebb8a55f23fa7e1a\` (\`category_id\`), PRIMARY KEY (\`service_id\`, \`category_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`providers\` ADD CONSTRAINT \`FK_842a46f6b0079a69520561eeb62\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`weekly_availability\` ADD CONSTRAINT \`FK_f3cdb4b25d55818f40e5d94ee99\` FOREIGN KEY (\`provider_id\`) REFERENCES \`providers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`availability_exceptions\` ADD CONSTRAINT \`FK_58b7eee31557accd84f7424143f\` FOREIGN KEY (\`provider_id\`) REFERENCES \`providers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`service_dates\` ADD CONSTRAINT \`FK_c69ef4c5eebe5a0748883258821\` FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`provider_services\` ADD CONSTRAINT \`FK_f7a9f75184826281d7e79449791\` FOREIGN KEY (\`provider_id\`) REFERENCES \`providers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`provider_services\` ADD CONSTRAINT \`FK_4155bec585f9bf02e99ba19a34c\` FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`treatment_services\` ADD CONSTRAINT \`FK_fb0c4e37010c9377df605fe851d\` FOREIGN KEY (\`treatment_id\`) REFERENCES \`treatments\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`treatment_services\` ADD CONSTRAINT \`FK_94400046b337e12dc4386d7ae1a\` FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clients\` ADD CONSTRAINT \`FK_07a7a09b04e7b035c9d90cf4984\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`appointments\` ADD CONSTRAINT \`FK_ccc5bbce58ad6bc96faa428b1e4\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`appointments\` ADD CONSTRAINT \`FK_e3e268ed1125872144e68b9a41c\` FOREIGN KEY (\`provider_id\`) REFERENCES \`providers\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`appointments\` ADD CONSTRAINT \`FK_2a2088e8eaa8f28d8de2bdbb857\` FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`deposits\` ADD CONSTRAINT \`FK_ea98b8a3587b72644b1dcc3436d\` FOREIGN KEY (\`appointment_id\`) REFERENCES \`appointments\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`service_categories\` ADD CONSTRAINT \`FK_e745636979d86799a14c0357a3e\` FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`service_categories\` ADD CONSTRAINT \`FK_781505e61aebb8a55f23fa7e1aa\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`service_categories\` DROP FOREIGN KEY \`FK_781505e61aebb8a55f23fa7e1aa\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`service_categories\` DROP FOREIGN KEY \`FK_e745636979d86799a14c0357a3e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`deposits\` DROP FOREIGN KEY \`FK_ea98b8a3587b72644b1dcc3436d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`appointments\` DROP FOREIGN KEY \`FK_2a2088e8eaa8f28d8de2bdbb857\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`appointments\` DROP FOREIGN KEY \`FK_e3e268ed1125872144e68b9a41c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`appointments\` DROP FOREIGN KEY \`FK_ccc5bbce58ad6bc96faa428b1e4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clients\` DROP FOREIGN KEY \`FK_07a7a09b04e7b035c9d90cf4984\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`treatment_services\` DROP FOREIGN KEY \`FK_94400046b337e12dc4386d7ae1a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`treatment_services\` DROP FOREIGN KEY \`FK_fb0c4e37010c9377df605fe851d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`provider_services\` DROP FOREIGN KEY \`FK_4155bec585f9bf02e99ba19a34c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`provider_services\` DROP FOREIGN KEY \`FK_f7a9f75184826281d7e79449791\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`service_dates\` DROP FOREIGN KEY \`FK_c69ef4c5eebe5a0748883258821\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`availability_exceptions\` DROP FOREIGN KEY \`FK_58b7eee31557accd84f7424143f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`weekly_availability\` DROP FOREIGN KEY \`FK_f3cdb4b25d55818f40e5d94ee99\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`providers\` DROP FOREIGN KEY \`FK_842a46f6b0079a69520561eeb62\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_781505e61aebb8a55f23fa7e1a\` ON \`service_categories\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_e745636979d86799a14c0357a3\` ON \`service_categories\``,
    );
    await queryRunner.query(`DROP TABLE \`service_categories\``);
    await queryRunner.query(`DROP INDEX \`IDX_35393de58b4f4292d60ebcf461\` ON \`recommendations\``);
    await queryRunner.query(`DROP TABLE \`recommendations\``);
    await queryRunner.query(`DROP INDEX \`IDX_6f61d8aaf4fa58a9507836ca0d\` ON \`deposits\``);
    await queryRunner.query(`DROP INDEX \`IDX_ea98b8a3587b72644b1dcc3436\` ON \`deposits\``);
    await queryRunner.query(`DROP TABLE \`deposits\``);
    await queryRunner.query(`DROP INDEX \`IDX_0be8832c5fdba5d3e1cb107121\` ON \`appointments\``);
    await queryRunner.query(`DROP INDEX \`IDX_d838dde2371446d33c990332cb\` ON \`appointments\``);
    await queryRunner.query(`DROP INDEX \`IDX_ad0f82e6a27eb6949f2a334fe8\` ON \`appointments\``);
    await queryRunner.query(`DROP INDEX \`IDX_ce5d4628a5eda89a931b18dbdb\` ON \`appointments\``);
    await queryRunner.query(`DROP INDEX \`IDX_1cc2f75700cd3f7db931ed877c\` ON \`appointments\``);
    await queryRunner.query(`DROP INDEX \`IDX_ccc5bbce58ad6bc96faa428b1e\` ON \`appointments\``);
    await queryRunner.query(`DROP TABLE \`appointments\``);
    await queryRunner.query(`DROP INDEX \`REL_07a7a09b04e7b035c9d90cf498\` ON \`clients\``);
    await queryRunner.query(`DROP INDEX \`IDX_8e645da308339e84f45d6cfe5d\` ON \`clients\``);
    await queryRunner.query(`DROP INDEX \`IDX_aa22377d7d3e794ae4cd39cd9e\` ON \`clients\``);
    await queryRunner.query(`DROP INDEX \`IDX_3567e933b1eef4720d92e9af2e\` ON \`clients\``);
    await queryRunner.query(`DROP TABLE \`clients\``);
    await queryRunner.query(`DROP TABLE \`treatment_services\``);
    await queryRunner.query(`DROP TABLE \`treatments\``);
    await queryRunner.query(`DROP TABLE \`provider_services\``);
    await queryRunner.query(`DROP TABLE \`service_dates\``);
    await queryRunner.query(`DROP TABLE \`services\``);
    await queryRunner.query(`DROP INDEX \`IDX_8b0be371d28245da6e4f4b6187\` ON \`categories\``);
    await queryRunner.query(`DROP TABLE \`categories\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_fb2b13e164f02b2260ba213e88\` ON \`availability_exceptions\``,
    );
    await queryRunner.query(`DROP TABLE \`availability_exceptions\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_472a6cd1cd65461b39610c1c4c\` ON \`weekly_availability\``,
    );
    await queryRunner.query(`DROP TABLE \`weekly_availability\``);
    await queryRunner.query(`DROP INDEX \`REL_842a46f6b0079a69520561eeb6\` ON \`providers\``);
    await queryRunner.query(`DROP TABLE \`providers\``);
    await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
