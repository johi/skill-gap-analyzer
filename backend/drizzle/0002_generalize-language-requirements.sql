CREATE TABLE "job_language_requirements" (
	"job_id" bigint NOT NULL,
	"language" varchar(2) NOT NULL,
	"requirement" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_language_requirements_job_id_language_pk" PRIMARY KEY("job_id","language"),
	CONSTRAINT "job_language_requirements_language_check" CHECK ("job_language_requirements"."language" ~ '^[a-z]{2}$'),
	CONSTRAINT "job_language_requirements_requirement_check" CHECK ("job_language_requirements"."requirement" IN ('preferred', 'required'))
);
--> statement-breakpoint
ALTER TABLE "job_language_requirements" ADD CONSTRAINT "job_language_requirements_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_language_requirements_language_idx" ON "job_language_requirements" USING btree ("language");--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "danish_required";