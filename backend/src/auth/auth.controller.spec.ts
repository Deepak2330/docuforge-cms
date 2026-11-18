import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call authService.register on /register', async () => {
    mockAuthService.register.mockResolvedValue({ accessToken: 'token', refreshToken: 'refresh', expiresIn: 900 });
    const req = { ip: '127.0.0.1', headers: {} } as any;
    const dto = { email: 'test@example.com', password: 'Pass@123!', firstName: 'Test', lastName: 'User' };
    await controller.register(dto, req);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto, '127.0.0.1');
  });

  it('should call authService.login on /login', async () => {
    mockAuthService.login.mockResolvedValue({ user: {}, tokens: { accessToken: 'token' } });
    const req = { ip: '127.0.0.1', headers: {} } as any;
    await controller.login({ email: 'test@example.com', password: 'Pass@123!' }, req);
    expect(mockAuthService.login).toHaveBeenCalled();
  });
});
