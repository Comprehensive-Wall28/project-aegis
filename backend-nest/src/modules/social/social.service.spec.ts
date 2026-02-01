import { Test, TestingModule } from '@nestjs/testing';
import { SocialService } from './social.service';
import { SocialRepository } from './social.repository';
import { CollectionRepository } from './collection.repository';
import { AuditService } from '../../common/services/audit.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

describe('SocialService', () => {
  let service: SocialService;
  let socialRepository: jest.Mocked<SocialRepository>;
  let collectionRepository: jest.Mocked<CollectionRepository>;
  let auditService: jest.Mocked<AuditService>;

  const mockSocialRepository = {
    create: jest.fn(),
    findByMember: jest.fn(),
    findByIdAndMember: jest.fn(),
    updateInviteCode: jest.fn(),
    findByInviteCode: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    deleteById: jest.fn(),
  };

  const mockCollectionRepository = {
    create: jest.fn(),
    deleteByRoom: jest.fn(),
  };

  const mockAuditService = {
    logAuditEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        { provide: SocialRepository, useValue: mockSocialRepository },
        { provide: CollectionRepository, useValue: mockCollectionRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<SocialService>(SocialService);
    socialRepository = module.get(SocialRepository);
    collectionRepository = module.get(CollectionRepository);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should create a room and a default collection', async () => {
      const userId = new Types.ObjectId().toString();
      const dto = { name: 'Test Room', encryptedRoomKey: 'key' };
      const mockRoom = { _id: new Types.ObjectId(), ...dto };

      socialRepository.create.mockResolvedValue(mockRoom as any);

      const result = await service.createRoom(userId, dto);

      expect(socialRepository.create).toHaveBeenCalled();
      expect(collectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'links' }),
      );
      expect(auditService.logAuditEvent).toHaveBeenCalledWith(
        userId,
        'ROOM_CREATE',
        'SUCCESS',
        undefined,
        expect.any(Object),
      );
      expect(result).toEqual(mockRoom);
    });

    it('should throw BadRequestException if name is missing', async () => {
      await expect(
        service.createRoom('id', { name: '', encryptedRoomKey: 'key' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserRooms', () => {
    it('should return simplified room info for a user', async () => {
      const userId = new Types.ObjectId().toString();
      const mockRooms = [
        {
          _id: new Types.ObjectId(),
          name: 'Room 1',
          description: 'Desc',
          icon: 'icon',
          members: [{ userId, role: 'owner', encryptedRoomKey: 'key1' }],
        },
      ];

      socialRepository.findByMember.mockResolvedValue(mockRooms as any);

      const result = await service.getUserRooms(userId);

      expect(result[0].name).toBe('Room 1');
      expect(result[0].role).toBe('owner');
      expect(result[0].encryptedRoomKey).toBe('key1');
    });
  });

  describe('createInvite', () => {
    it('should generate an invite code for an owner', async () => {
      const userId = new Types.ObjectId().toString();
      const roomId = new Types.ObjectId().toString();
      const mockRoom = {
        members: [{ userId, role: 'owner' }],
      };

      socialRepository.findByIdAndMember.mockResolvedValue(mockRoom as any);

      const inviteCode = await service.createInvite(userId, roomId);

      expect(inviteCode).toBeDefined();
      expect(socialRepository.updateInviteCode).toHaveBeenCalledWith(
        roomId,
        expect.any(String),
      );
    });

    it('should throw ForbiddenException if user is only a member', async () => {
      const userId = new Types.ObjectId().toString();
      const roomId = new Types.ObjectId().toString();
      const mockRoom = {
        members: [{ userId, role: 'member' }],
      };

      socialRepository.findByIdAndMember.mockResolvedValue(mockRoom as any);

      await expect(service.createInvite(userId, roomId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('joinRoom', () => {
    it('should add user as a member', async () => {
      const userId = new Types.ObjectId().toString();
      const inviteCode = 'invite123';
      const mockRoom = { _id: new Types.ObjectId(), members: [] };

      socialRepository.findByInviteCode.mockResolvedValue(mockRoom as any);

      const result = await service.joinRoom(userId, inviteCode, 'roomKey');

      expect(socialRepository.addMember).toHaveBeenCalled();
      expect(result).toBe(mockRoom._id.toString());
    });

    it('should throw BadRequestException if already a member', async () => {
      const userId = new Types.ObjectId().toString();
      const mockRoom = { members: [{ userId }] };

      socialRepository.findByInviteCode.mockResolvedValue(mockRoom as any);

      await expect(service.joinRoom(userId, 'code', 'key')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
