import { Test, TestingModule } from '@nestjs/testing';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { GridFsService } from './gridfs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Readable } from 'stream';

describe('VaultController', () => {
    let controller: VaultController;
    let vaultService: VaultService;
    let gridFsService: GridFsService;

    const mockVaultService = {
        initiateUpload: jest.fn(),
        uploadChunk: jest.fn(),
        completeGridFsUpload: jest.fn(),
        listFiles: jest.fn(),
        getDownloadStream: jest.fn(),
        deleteFile: jest.fn(),
    };

    const mockGridFsService = {
        uploadStream: jest.fn(),
    };

    const mockUser = { userId: 'user_id' };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VaultController],
            providers: [
                {
                    provide: VaultService,
                    useValue: mockVaultService,
                },
                {
                    provide: GridFsService,
                    useValue: mockGridFsService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<VaultController>(VaultController);
        vaultService = module.get<VaultService>(VaultService);
        gridFsService = module.get<GridFsService>(GridFsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('initUpload', () => {
        it('should call initiateUpload', async () => {
            const body: any = {
                fileName: 'test.txt',
                originalFileName: 'test.txt',
                fileSize: 100,
                mimeType: 'text/plain',
                encryptedSymmetricKey: 'key',
                encapsulatedKey: 'enc_key'
            };
            await controller.initUpload(mockUser, body);
            expect(vaultService.initiateUpload).toHaveBeenCalledWith('user_id', body);
        });
    });

    describe('uploadChunk', () => {
        it('should call uploadChunk with valid headers', async () => {
            const mockReq = {
                headers: {
                    'x-file-id': 'file_id',
                    'content-length': '10',
                    'content-range': 'bytes 0-9/100',
                },
                raw: new Readable(),
            };

            await controller.uploadChunk(mockUser, mockReq as any);

            expect(vaultService.uploadChunk).toHaveBeenCalledWith(
                'user_id',
                'file_id',
                mockReq.raw,
                10,
                0,
                9,
                100
            );
        });

        it('should throw BadRequestException if headers are missing', async () => {
            const mockReq = { headers: {} };
            await expect(controller.uploadChunk(mockUser, mockReq as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('uploadGridFs', () => {
        it('should handle multipart upload for GridFS', async () => {
            const gridFsId = new Types.ObjectId();
            mockGridFsService.uploadStream.mockResolvedValue(gridFsId);

            const mockReq = {
                parts: async function* () {
                    yield { type: 'field', fieldname: 'fileId', value: 'file_id' };
                    yield { type: 'file', file: new Readable(), filename: 'test.txt' };
                }
            };

            const result = await controller.uploadGridFs(mockUser, mockReq as any);

            expect(gridFsService.uploadStream).toHaveBeenCalled();
            expect(vaultService.completeGridFsUpload).toHaveBeenCalledWith(
                'user_id',
                'file_id',
                gridFsId
            );
            expect(result).toEqual({ success: true });
        });

        it('should throw BadRequestException if no file is uploaded', async () => {
            const mockReq = {
                parts: async function* () {
                    yield { type: 'field', fieldname: 'fileId', value: 'file_id' };
                }
            };

            await expect(controller.uploadGridFs(mockUser, mockReq as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('listFiles', () => {
        it('should call listFiles', async () => {
            await controller.listFiles(mockUser, 'folder_id');
            expect(vaultService.listFiles).toHaveBeenCalledWith('user_id', 'folder_id');
        });
    });

    describe('downloadFile', () => {
        it('should pipe download stream to response', async () => {
            const mockStream = new Readable();
            mockVaultService.getDownloadStream.mockResolvedValue({
                stream: mockStream,
                mimeType: 'text/plain',
                fileName: 'test.txt',
            });

            const mockRes = {
                header: jest.fn().mockReturnThis(),
                send: jest.fn().mockReturnThis(),
            };

            await controller.downloadFile(mockUser, 'file_id', mockRes as any);

            expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'text/plain');
            expect(mockRes.header).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('test.txt'));
            expect(mockRes.send).toHaveBeenCalledWith(mockStream);
        });
    });

    describe('deleteFile', () => {
        it('should call deleteFile', async () => {
            await controller.deleteFile(mockUser, 'file_id');
            expect(vaultService.deleteFile).toHaveBeenCalledWith('user_id', 'file_id');
        });
    });
});
