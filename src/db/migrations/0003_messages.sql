CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`helper_id` integer NOT NULL,
	`action` text NOT NULL,
	`status_after` text NOT NULL,
	`body` text,
	`created_at` text NOT NULL,
	`seen_at` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`helper_id`) REFERENCES `helpers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `changed_since_answer` integer DEFAULT false NOT NULL;