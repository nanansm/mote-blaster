CREATE TABLE "ai_agents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"instance_id" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"provider" text NOT NULL,
	"api_key" text NOT NULL,
	"model" text NOT NULL,
	"system_prompt" text DEFAULT '' NOT NULL,
	"strict_rules" text DEFAULT '' NOT NULL,
	"media_reply_text" text DEFAULT 'Mohon maaf, saat ini saya hanya bisa membalas pesan teks.' NOT NULL,
	"sheet_config_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agent_paused_chats" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"paused_at" timestamp DEFAULT now() NOT NULL,
	"resume_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_agent_paused_chats" ADD CONSTRAINT "ai_agent_paused_chats_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE cascade ON UPDATE no action;
