CREATE TABLE `business_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`websiteUrl` varchar(2048) NOT NULL,
	`hasPrivacyPolicy` int NOT NULL DEFAULT 0,
	`hasTermsOfService` int NOT NULL DEFAULT 0,
	`validationStatus` enum('pending','valid','invalid') NOT NULL DEFAULT 'pending',
	`lastValidatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waba_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`wabaId` varchar(64) NOT NULL,
	`phoneNumberId` varchar(64) NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`businessName` varchar(255),
	`websiteUrl` varchar(2048),
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`displayNameStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`webhookUrl` varchar(2048),
	`webhookVerifyToken` varchar(255),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `waba_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `waba_accounts_wabaId_unique` UNIQUE(`wabaId`)
);
--> statement-breakpoint
CREATE TABLE `webhook_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wabaId` varchar(64) NOT NULL,
	`webhookUrl` varchar(2048) NOT NULL,
	`verifyToken` varchar(255) NOT NULL,
	`isVerified` int NOT NULL DEFAULT 0,
	`subscribedFields` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhook_configurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_configurations_wabaId_unique` UNIQUE(`wabaId`)
);
--> statement-breakpoint
ALTER TABLE `business_profiles` ADD CONSTRAINT `business_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `waba_accounts` ADD CONSTRAINT `waba_accounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhook_configurations` ADD CONSTRAINT `webhook_configurations_wabaId_waba_accounts_wabaId_fk` FOREIGN KEY (`wabaId`) REFERENCES `waba_accounts`(`wabaId`) ON DELETE cascade ON UPDATE no action;