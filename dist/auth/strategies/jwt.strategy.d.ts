import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: {
        sub: string;
        email: string;
        role: string;
    }): Promise<{
        staffProfile: {
            id: string;
            phone: string | null;
            userId: string;
            staffId: string;
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            hiredAt: Date;
            departmentId: string | null;
        };
        studentProfile: {
            id: string;
            userId: string;
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            departmentId: string | null;
            indexNumber: string;
            bio: string | null;
            admissionDate: Date;
            currentClassId: string | null;
            archivedAt: Date | null;
        };
        parentProfile: {
            id: string;
            email: string | null;
            phone: string;
            userId: string;
            firstName: string;
            lastName: string;
            occupation: string | null;
        };
    } & {
        id: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
