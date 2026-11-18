import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-id-1',
  email: 'test@example.com',
  passwordHash: '$2b$12$hash',
  firstName: 'Test',
  lastName: 'User',
  role: 'VIEWER' as any,
  isActive: true,
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
};

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      const result = await service.create({
        email: 'new@example.com',
        password: 'Pass@1234',
        firstName: 'New',
        lastName: 'User',
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw ConflictException if email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.create({ email: 'test@example.com', password: 'Pass@1234', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return user without passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findOne('user-id-1');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException for unknown id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });
});
