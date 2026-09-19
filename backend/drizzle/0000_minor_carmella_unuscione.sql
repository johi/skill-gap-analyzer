CREATE TABLE "job_skills" (
	"job_id" bigint NOT NULL,
	"skill_id" bigint NOT NULL,
	"requirement" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_skills_job_id_skill_id_pk" PRIMARY KEY("job_id","skill_id"),
	CONSTRAINT "job_skills_requirement_check" CHECK ("job_skills"."requirement" IN ('must_have', 'nice_to_have'))
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"date_found" date NOT NULL,
	"company" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"source_url" text,
	"location" varchar(255),
	"work_model" varchar(50),
	"employment_type" varchar(100),
	"seniority" varchar(100),
	"primary_role" varchar(100),
	"years_required" varchar(100),
	"education_requirement" text,
	"danish_required" varchar(100),
	"salary_rate" text,
	"interest" smallint,
	"apply_status" varchar(50),
	"gap_notes" text,
	"original_match" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_interest_check" CHECK ("jobs"."interest" IS NULL OR "jobs"."interest" BETWEEN 0 AND 100),
	CONSTRAINT "jobs_original_match_check" CHECK ("jobs"."original_match" IS NULL OR "jobs"."original_match" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_skills" (
	"skill_id" bigint PRIMARY KEY NOT NULL,
	"level" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_skills_level_check" CHECK ("user_skills"."level" BETWEEN 0 AND 5)
);
--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_skills_skill_id_idx" ON "job_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "jobs_date_found_idx" ON "jobs" USING btree ("date_found");--> statement-breakpoint
CREATE INDEX "jobs_company_idx" ON "jobs" USING btree ("company");--> statement-breakpoint
CREATE INDEX "jobs_apply_status_idx" ON "jobs" USING btree ("apply_status");--> statement-breakpoint
CREATE INDEX "skills_category_idx" ON "skills" USING btree ("category");