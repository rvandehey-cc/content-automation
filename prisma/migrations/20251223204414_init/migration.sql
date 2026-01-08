-- CreateTable
CREATE TABLE "site_profiles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "created_by" VARCHAR(255),

    CONSTRAINT "site_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" UUID NOT NULL,
    "site_profile_id" UUID,
    "status" VARCHAR(50) NOT NULL,
    "urls" JSONB NOT NULL,
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(255),
    "config_snapshot" JSONB,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_metrics" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "urls_scraped" INTEGER NOT NULL DEFAULT 0,
    "urls_failed" INTEGER NOT NULL DEFAULT 0,
    "images_downloaded" INTEGER NOT NULL DEFAULT 0,
    "images_failed" INTEGER NOT NULL DEFAULT 0,
    "files_processed" INTEGER NOT NULL DEFAULT 0,
    "files_failed" INTEGER NOT NULL DEFAULT 0,
    "posts_detected" INTEGER NOT NULL DEFAULT 0,
    "pages_detected" INTEGER NOT NULL DEFAULT 0,
    "total_duration_ms" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_entries" (
    "id" UUID NOT NULL,
    "run_id" UUID,
    "level" VARCHAR(20) NOT NULL,
    "service" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_previews" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "scraped_html" TEXT,
    "processed_html" TEXT,
    "content_type" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_previews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_profiles_created_at_idx" ON "site_profiles"("created_at");

-- CreateIndex
CREATE INDEX "site_profiles_created_by_idx" ON "site_profiles"("created_by");

-- CreateIndex
CREATE INDEX "runs_status_idx" ON "runs"("status");

-- CreateIndex
CREATE INDEX "runs_site_profile_id_idx" ON "runs"("site_profile_id");

-- CreateIndex
CREATE INDEX "runs_created_at_idx" ON "runs"("created_at");

-- CreateIndex
CREATE INDEX "runs_started_at_idx" ON "runs"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "run_metrics_run_id_key" ON "run_metrics"("run_id");

-- CreateIndex
CREATE INDEX "run_metrics_run_id_idx" ON "run_metrics"("run_id");

-- CreateIndex
CREATE INDEX "run_metrics_created_at_idx" ON "run_metrics"("created_at");

-- CreateIndex
CREATE INDEX "log_entries_run_id_idx" ON "log_entries"("run_id");

-- CreateIndex
CREATE INDEX "log_entries_level_idx" ON "log_entries"("level");

-- CreateIndex
CREATE INDEX "log_entries_service_idx" ON "log_entries"("service");

-- CreateIndex
CREATE INDEX "log_entries_timestamp_idx" ON "log_entries"("timestamp");

-- CreateIndex
CREATE INDEX "log_entries_run_id_timestamp_idx" ON "log_entries"("run_id", "timestamp");

-- CreateIndex
CREATE INDEX "content_previews_run_id_idx" ON "content_previews"("run_id");

-- CreateIndex
CREATE INDEX "content_previews_url_idx" ON "content_previews"("url");

-- CreateIndex
CREATE INDEX "content_previews_content_type_idx" ON "content_previews"("content_type");

-- CreateIndex
CREATE INDEX "content_previews_created_at_idx" ON "content_previews"("created_at");

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_site_profile_id_fkey" FOREIGN KEY ("site_profile_id") REFERENCES "site_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_metrics" ADD CONSTRAINT "run_metrics_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_previews" ADD CONSTRAINT "content_previews_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
