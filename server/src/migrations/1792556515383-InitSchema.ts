import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1792556515383 implements MigrationInterface {
    name = 'InitSchema1792556515383'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`task_completions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`completeTime\` varchar(20) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`taskId\` int NULL, INDEX \`IDX_a979ec83a30f605167ad4a42a5\` (\`taskId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(254) NOT NULL, \`password\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`main_categories\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`name\` varchar(50) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`sub_categories\` (\`id\` int NOT NULL AUTO_INCREMENT, \`mainCategoryId\` int NULL, \`userId\` int NOT NULL, \`name\` varchar(50) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`tasks\` (\`id\` int NOT NULL AUTO_INCREMENT, \`subCategoryId\` int NULL, \`userId\` int NOT NULL, \`name\` varchar(50) NOT NULL, \`cycleType\` enum ('DAILY', 'WEEKLY', 'MONTHLY', 'ONCE') NOT NULL DEFAULT 'DAILY', \`cycleValue\` tinyint UNSIGNED NULL, \`dueDate\` date NULL, \`deadLine\` tinyint UNSIGNED NOT NULL, \`remindTime\` tinyint UNSIGNED NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        // migration:generate가 MySQL CHECK 제약은 자동으로 못 잡아서(task.entity.ts의
        // @Check 데코레이터 주석 참고 — RdbmsSchemaBuilder가 MySQL이면 건너뜀) 수동 추가.
        // 예전엔 새 환경(OCI 등)마다 이 SQL을 직접 손으로 실행해야 했는데, 이제 마이그레이션
        // 한 번으로 해결됨
        await queryRunner.query(
            'ALTER TABLE `tasks` ADD CONSTRAINT `CHK_task_dead_line_remind_time` CHECK (`deadLine` <> `remindTime`)',
        );
        await queryRunner.query(`CREATE TABLE \`devices\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`deviceToken\` varchar(255) NOT NULL, \`deviceAlarm\` tinyint NOT NULL DEFAULT 0, \`platform\` enum ('ios', 'android') NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_05f2cc5738c5f49272d5156637\` (\`deviceToken\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_settings\` (\`userId\` int NOT NULL, \`discordRoom\` varchar(255) NULL, \`discordAlarm\` tinyint NOT NULL DEFAULT 0, \`timezone\` varchar(50) NOT NULL DEFAULT 'Asia/Seoul', PRIMARY KEY (\`userId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`refreshes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`refreshToken\` varchar(128) NOT NULL, \`clientType\` enum ('web', 'app') NOT NULL, \`expiresAt\` datetime NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`revokeAt\` datetime NULL, UNIQUE INDEX \`IDX_3002f724565613631d3b8c325a\` (\`refreshToken\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`task_completions\` ADD CONSTRAINT \`FK_a979ec83a30f605167ad4a42a51\` FOREIGN KEY (\`taskId\`) REFERENCES \`tasks\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`main_categories\` ADD CONSTRAINT \`FK_5d0990756d9e6585e9225b1a776\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sub_categories\` ADD CONSTRAINT \`FK_acba6eee704e3352be4f53ac523\` FOREIGN KEY (\`mainCategoryId\`) REFERENCES \`main_categories\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sub_categories\` ADD CONSTRAINT \`FK_d0c293f99b17474af4528e3813a\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tasks\` ADD CONSTRAINT \`FK_671fcb9855cdc07d79b58ca2abe\` FOREIGN KEY (\`subCategoryId\`) REFERENCES \`sub_categories\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tasks\` ADD CONSTRAINT \`FK_166bd96559cb38595d392f75a35\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`devices\` ADD CONSTRAINT \`FK_e8a5d59f0ac3040395f159507c6\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_settings\` ADD CONSTRAINT \`FK_986a2b6d3c05eb4091bb8066f78\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`refreshes\` ADD CONSTRAINT \`FK_1c9bd026acb7548182cbc3cb4c5\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`refreshes\` DROP FOREIGN KEY \`FK_1c9bd026acb7548182cbc3cb4c5\``);
        await queryRunner.query(`ALTER TABLE \`user_settings\` DROP FOREIGN KEY \`FK_986a2b6d3c05eb4091bb8066f78\``);
        await queryRunner.query(`ALTER TABLE \`devices\` DROP FOREIGN KEY \`FK_e8a5d59f0ac3040395f159507c6\``);
        await queryRunner.query(`ALTER TABLE \`tasks\` DROP FOREIGN KEY \`FK_166bd96559cb38595d392f75a35\``);
        await queryRunner.query(`ALTER TABLE \`tasks\` DROP FOREIGN KEY \`FK_671fcb9855cdc07d79b58ca2abe\``);
        await queryRunner.query('ALTER TABLE `tasks` DROP CHECK `CHK_task_dead_line_remind_time`');
        await queryRunner.query(`ALTER TABLE \`sub_categories\` DROP FOREIGN KEY \`FK_d0c293f99b17474af4528e3813a\``);
        await queryRunner.query(`ALTER TABLE \`sub_categories\` DROP FOREIGN KEY \`FK_acba6eee704e3352be4f53ac523\``);
        await queryRunner.query(`ALTER TABLE \`main_categories\` DROP FOREIGN KEY \`FK_5d0990756d9e6585e9225b1a776\``);
        await queryRunner.query(`ALTER TABLE \`task_completions\` DROP FOREIGN KEY \`FK_a979ec83a30f605167ad4a42a51\``);
        await queryRunner.query(`DROP INDEX \`IDX_3002f724565613631d3b8c325a\` ON \`refreshes\``);
        await queryRunner.query(`DROP TABLE \`refreshes\``);
        await queryRunner.query(`DROP TABLE \`user_settings\``);
        await queryRunner.query(`DROP INDEX \`IDX_05f2cc5738c5f49272d5156637\` ON \`devices\``);
        await queryRunner.query(`DROP TABLE \`devices\``);
        await queryRunner.query(`DROP TABLE \`tasks\``);
        await queryRunner.query(`DROP TABLE \`sub_categories\``);
        await queryRunner.query(`DROP TABLE \`main_categories\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_a979ec83a30f605167ad4a42a5\` ON \`task_completions\``);
        await queryRunner.query(`DROP TABLE \`task_completions\``);
    }

}
