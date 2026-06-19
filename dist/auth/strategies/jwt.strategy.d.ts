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
            firstName: string;
            lastName: string;
            middleName: string;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date;
            photoUrl: string;
            departmentId: string;
            staffId: string;
        };
        studentProfile: {
            id: string;
            indexNumber: string;
            firstName: string;
            lastName: string;
            middleName: string;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date;
            photoUrl: string;
            admissionDate: Date;
            currentClassId: string;
            departmentId: string;
        };
        parentProfile: {
            id: string;
            email: string;
            phone: string;
            firstName: string;
            lastName: string;
            occupation: string;
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
