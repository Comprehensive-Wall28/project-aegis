import { Controller, Get } from '@nestjs/common';
import { DatabaseManagerService } from '../../config/database/database-manager.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private dbManager: DatabaseManagerService) {}

  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('db')
  checkDb() {
    const active = this.dbManager.getActiveConnection();
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

    // We can access private secondary via casting or if I added a getter.
    // For now, let's just check active.
    // Ideally I should update DatabaseManagerService to expose status.

    return {
      activeConnection: {
        name: active.name,
        state: states[active.readyState] || 'unknown',
        host: active.host,
      },
    };
  }
}
