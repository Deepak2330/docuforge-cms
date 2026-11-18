import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create super admin user
  const passwordHash = await bcrypt.hash('Admin@123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@docuforge.dev' },
    update: {},
    create: {
      email: 'admin@docuforge.dev',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // Create editor user
  const editorHash = await bcrypt.hash('Editor@123!', 12);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@docuforge.dev' },
    update: {},
    create: {
      email: 'editor@docuforge.dev',
      passwordHash: editorHash,
      firstName: 'Jane',
      lastName: 'Editor',
      role: Role.EDITOR,
      isActive: true,
    },
  });
  console.log(`Created editor: ${editor.email}`);

  // Create default workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Workspace',
      slug: 'default',
      description: 'Default DocuForge workspace',
      members: {
        create: [
          { userId: admin.id, role: Role.ADMIN },
          { userId: editor.id, role: Role.EDITOR },
        ],
      },
    },
  });
  console.log(`Created workspace: ${workspace.name}`);

  // Create sample project
  const project = await prisma.project.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: 'getting-started' } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Getting Started',
      slug: 'getting-started',
      description: 'Introduction and setup documentation',
      isPublic: true,
      members: {
        create: [
          { userId: admin.id, role: Role.ADMIN },
          { userId: editor.id, role: Role.EDITOR },
        ],
      },
    },
  });
  console.log(`Created project: ${project.name}`);

  // Create default category
  const category = await prisma.category.upsert({
    where: { projectId_slug: { projectId: project.id, slug: 'introduction' } },
    update: {},
    create: {
      projectId: project.id,
      name: 'Introduction',
      slug: 'introduction',
      description: 'Introductory documents',
    },
  });
  console.log(`Created category: ${category.name}`);

  // Create sample document
  const doc = await prisma.document.upsert({
    where: { projectId_slug: { projectId: project.id, slug: 'welcome' } },
    update: {},
    create: {
      projectId: project.id,
      categoryId: category.id,
      createdById: admin.id,
      ownerId: admin.id,
      title: 'Welcome to DocuForge',
      slug: 'welcome',
      description: 'Your comprehensive documentation platform',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Welcome to DocuForge CMS' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'DocuForge is a powerful documentation management system for technical writers and API teams.',
              },
            ],
          },
        ],
      }),
      status: 'PUBLISHED',
      docType: 'USER_GUIDE',
      tags: ['welcome', 'introduction'],
    },
  });
  console.log(`Created document: ${doc.title}`);

  console.log('\nSeed completed successfully!');
  console.log('---');
  console.log('Default credentials:');
  console.log('  Admin: admin@docuforge.dev / Admin@123!');
  console.log('  Editor: editor@docuforge.dev / Editor@123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
