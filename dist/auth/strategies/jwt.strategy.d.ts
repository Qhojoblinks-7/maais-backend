import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    private cacheService;
    constructor(config: ConfigService, prisma: PrismaService, cacheService: CacheService);
    validate(payload: {
        sub: string;
        email: string;
        role: string;
    }): Promise<{
        id: string;
        email: string;
        role: string;
        isActive: boolean;
        staffProfile?: {
            id: string;
            departmentId?: string;
        };
        studentProfile?: {
            id: string;
        };
        parentProfile?: {
            id: string;
        };
    }>;
}
export {};
