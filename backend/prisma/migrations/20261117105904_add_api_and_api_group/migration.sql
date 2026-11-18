-- CreateTable
CREATE TABLE "apis" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "spec_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "spec_type" TEXT NOT NULL DEFAULT 'REST',
    "spec_version" TEXT,
    "operations" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_groups" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_group_apis" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "api_id" TEXT NOT NULL,

    CONSTRAINT "api_group_apis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apis_project_id_slug_key" ON "apis"("project_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "api_groups_project_id_slug_key" ON "api_groups"("project_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "api_group_apis_group_id_api_id_key" ON "api_group_apis"("group_id", "api_id");

-- AddForeignKey
ALTER TABLE "apis" ADD CONSTRAINT "apis_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apis" ADD CONSTRAINT "apis_spec_id_fkey" FOREIGN KEY ("spec_id") REFERENCES "api_specifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_groups" ADD CONSTRAINT "api_groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_groups" ADD CONSTRAINT "api_groups_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "api_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_group_apis" ADD CONSTRAINT "api_group_apis_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "api_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_group_apis" ADD CONSTRAINT "api_group_apis_api_id_fkey" FOREIGN KEY ("api_id") REFERENCES "apis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
