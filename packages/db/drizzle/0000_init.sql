CREATE TABLE "focus_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_id" text NOT NULL,
	"room_label" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"minutes" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"look" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "focus_visitor_started_idx" ON "focus_sessions" USING btree ("visitor_id","started_at");--> statement-breakpoint
CREATE INDEX "focus_started_idx" ON "focus_sessions" USING btree ("started_at");