CREATE TABLE `event_helpers` (
	`event_id` integer NOT NULL,
	`helper_id` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`event_id`, `helper_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`helper_id`) REFERENCES `helpers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `helpers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organizer_id` integer NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`link_token` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `helpers_link_token_unique` ON `helpers` (`link_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `helpers_organizer_email_unique` ON `helpers` (`organizer_id`,`email`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `helper_id` integer REFERENCES helpers(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `assigned_at` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `accepted_at` text;