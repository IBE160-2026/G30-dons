CREATE TABLE `outbox_emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organizer_id` integer NOT NULL,
	`to` text NOT NULL,
	`from_name` text NOT NULL,
	`reply_to` text NOT NULL,
	`subject` text NOT NULL,
	`text` text NOT NULL,
	`links` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reminders_sent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`accepted_at` text NOT NULL,
	`sent_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminders_sent_task_accepted_unique` ON `reminders_sent` (`task_id`,`accepted_at`);