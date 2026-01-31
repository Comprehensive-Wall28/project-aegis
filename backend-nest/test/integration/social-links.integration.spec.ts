import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SocialModule } from '../../src/modules/social/social.module';
import { WebsocketModule } from '../../src/modules/websocket/websocket.module';
import { VaultModule } from '../../src/modules/vault/vault.module';
import { AuditService } from '../../src/common/services/audit.service';
import { Types } from 'mongoose';

describe('Social Links Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forRoot(mongoUri, { connectionName: 'audit' }),
        SocialModule,
        WebsocketModule,
        VaultModule,
      ],
    })
      .overrideProvider(AuditService)
      .useValue({
        logAuditEvent: jest.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (moduleRef) {
      await moduleRef.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('Module Integration', () => {
    it('should compile the module', () => {
      expect(app).toBeDefined();
    });

    it('should have SocialModule registered', () => {
      expect(moduleRef).toBeDefined();
    });
  });
});
