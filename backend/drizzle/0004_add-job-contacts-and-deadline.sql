CREATE TABLE "job_contacts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"job_id" bigint NOT NULL,
	"name" varchar(255),
	"role" varchar(255),
	"email" varchar(255),
	"phone" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "application_deadline" date;--> statement-breakpoint
ALTER TABLE "job_contacts" ADD CONSTRAINT "job_contacts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_contacts_job_id_idx" ON "job_contacts" USING btree ("job_id");--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "gap_notes";