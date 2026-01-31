import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleDriveService } from './google-drive.service';
import { google } from 'googleapis';
import { Readable } from 'stream';

// Mock googleapis
jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                setCredentials: jest.fn(),
                generateAuthUrl: jest.fn().mockReturnValue('http://auth.url'),
                getToken: jest.fn().mockResolvedValue({ tokens: { access_token: 'tk', refresh_token: 'rt' } }),
                getAccessToken: jest.fn().mockResolvedValue({ token: 'tk' }),
            })),
        },
        drive: jest.fn().mockImplementation(() => ({
            files: {
                get: jest.fn().mockResolvedValue({ data: new Readable() }),
                delete: jest.fn().mockResolvedValue({}),
            },
        })),
    },
}));

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

describe('GoogleDriveService', () => {
    let service: GoogleDriveService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GoogleDriveService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            const configs: Record<string, string> = {
                                GOOGLE_CLIENT_ID: 'id',
                                GOOGLE_CLIENT_SECRET: 'secret',
                                GOOGLE_REFRESH_TOKEN: 'token',
                                GOOGLE_DRIVE_FOLDER_ID: 'folder',
                            };
                            return configs[key];
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<GoogleDriveService>(GoogleDriveService);
        configService = module.get<ConfigService>(ConfigService);
        jest.clearAllMocks();
    });

    it('should generate auth url', () => {
        expect(service.getAuthUrl()).toBe('http://auth.url');
    });

    it('should exchange code for tokens', async () => {
        const tokens = await service.exchangeCode('code');
        expect(tokens.access_token).toBe('tk');
    });

    describe('upload flow', () => {
        it('should initiate upload', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'http://session.url' },
            });
            const sessionId = await service.initiateUpload('file.txt', 100);
            expect(sessionId).toBeDefined();
        });

        it('should append chunk', async () => {
            // Initiate first to set session
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'http://session.url' },
            });
            const sessionId = await service.initiateUpload('file.txt', 100);

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                status: 308,
                headers: { get: () => 'bytes=0-49' },
            });

            const result = await service.appendChunk(sessionId, Buffer.from('data'), 50, 0, 49, 100);
            expect(result.complete).toBe(false);
            expect(result.receivedSize).toBe(50);
        });

        it('should finalize upload', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'http://session.url' },
            });
            const sessionId = await service.initiateUpload('file.txt', 100);

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                status: 200,
                json: () => Promise.resolve({ id: 'file_id' }),
            });

            const fileId = await service.finalizeUpload(sessionId);
            expect(fileId).toBe('file_id');
        });
    });

    it('should get file stream', async () => {
        const stream = await service.getFileStream('id');
        expect(stream).toBeDefined();
    });

    it('should delete file', async () => {
        await service.deleteFile('id');
        const drive = (google.drive as jest.Mock).mock.results[0].value;
        expect(drive.files.delete).toHaveBeenCalledWith(expect.objectContaining({ fileId: 'id' }));
    });

    it('should retry on 500 error', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({ status: 500 })
            .mockResolvedValueOnce({ status: 200, ok: true, headers: { get: () => 'loc' } });

        await service.initiateUpload('t', 10);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
