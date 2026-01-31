import { Test, TestingModule } from '@nestjs/testing';
import { GoogleDriveController } from './google-drive.controller';
import { GoogleDriveService } from './google-drive.service';

describe('GoogleDriveController', () => {
    let controller: GoogleDriveController;
    let service: GoogleDriveService;

    const mockGoogleDriveService = {
        getAuthUrl: jest.fn(),
        exchangeCode: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GoogleDriveController],
            providers: [
                { provide: GoogleDriveService, useValue: mockGoogleDriveService },
            ],
        }).compile();

        controller = module.get<GoogleDriveController>(GoogleDriveController);
        service = module.get<GoogleDriveService>(GoogleDriveService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getAuthUrl', () => {
        it('should return auth url from service', () => {
            mockGoogleDriveService.getAuthUrl.mockReturnValue('http://auth.url');
            expect(controller.getAuthUrl()).toEqual({ url: 'http://auth.url' });
        });
    });

    describe('callback', () => {
        it('should return error if no code provided', async () => {
            const result = await controller.callback('');
            expect(result).toEqual({ error: 'No code provided' });
        });

        it('should exchange code and return success message', async () => {
            mockGoogleDriveService.exchangeCode.mockResolvedValue({ refresh_token: 'rt' });
            const result = await controller.callback('code');
            expect(result.message).toBe('Authorization successful');
            expect(result.hasRefreshToken).toBe(true);
        });

        it('should handle exchange errors', async () => {
            mockGoogleDriveService.exchangeCode.mockRejectedValue(new Error('OAuth error'));
            const result = await controller.callback('code');
            expect(result.error).toBeDefined();
            expect(result.details).toBe('OAuth error');
        });
    });
});
