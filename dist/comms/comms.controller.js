"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const comms_service_1 = require("./comms.service");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const comms_dto_1 = require("./dto/comms.dto");
const create_ticket_dto_1 = require("./dto/create-ticket.dto");
const ticket_dto_1 = require("./dto/ticket.dto");
let CommsController = class CommsController {
    constructor(commsService) {
        this.commsService = commsService;
    }
    sendNotification(dto, userId) {
        return this.commsService.sendNotification(dto, userId);
    }
    emergency(dto, userId) {
        return this.commsService.broadcastEmergency(dto.title, dto.message, userId);
    }
    getNotifications(studentId, unreadOnly, userId, role) {
        return this.commsService.getStudentNotifications(studentId, unreadOnly, userId, role);
    }
    markRead(id) {
        return this.commsService.markAsRead(id);
    }
    getPulse(academicYearId, userId) {
        return this.commsService.getAnalyticsPulse(academicYearId, userId);
    }
    createTicket(dto, userId) {
        return this.commsService.createTicket(dto, userId);
    }
    getMyTickets(userId, role) {
        return this.commsService.listTickets({}, userId, role);
    }
    listTickets(query, userId, role) {
        return this.commsService.listTickets(query, userId, role);
    }
    updateTicketStatus(id, dto, userId, role) {
        return this.commsService.updateTicketStatus(id, dto, userId, role);
    }
    addReply(id, dto, userId, role) {
        return this.commsService.addTicketReply(id, dto, userId, role);
    }
};
exports.CommsController = CommsController;
__decorate([
    (0, common_1.Post)('notify'),
    (0, roles_decorator_1.Roles)(client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN, client_1.Role.HOD),
    (0, swagger_1.ApiOperation)({ summary: 'Send notification to students' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [comms_dto_1.SendNotificationDto, String]),
    __metadata("design:returntype", void 0)
], CommsController.prototype, "sendNotification", null);
__decorate([
    (0, common_1.Post)('emergency'),
    (0, roles_decorator_1.Roles)(client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Broadcast emergency SMS to all parents' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [comms_dto_1.EmergencyNotificationDto, String]),
    __metadata("design:returntype", void 0)
], CommsController.prototype, "emergency", null);
__decorate([
    (0, common_1.Get)('notifications/:studentId'),
    (0, roles_decorator_1.Roles)(client_1.Role.STUDENT, client_1.Role.TEACHER, client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Get student's notification inbox" }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, common_1.Query)('unreadOnly')),
    __param(2, (0, roles_decorator_1.CurrentUser)('id')),
    __param(3, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, String, String]),
    __metadata("design:returntype", void 0)
], CommsController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Patch)('notifications/:id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark notification as read' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CommsController.prototype, "markRead", null);
__decorate([
    openapi.ApiQuery({ name: "academicYearId", required: false }),
    (0, common_1.Get)('analytics/pulse'),
    (0, roles_decorator_1.Roles)(client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN, client_1.Role.HOD, client_1.Role.TEACHER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get academic pulse dashboard data' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('academicYearId')),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CommsController.prototype, "getPulse", null);
__decorate([
    (0, common_1.Post)('tickets'),
    (0, roles_decorator_1.Roles)(client_1.Role.STUDENT),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Raise a support ticket (student-facing)' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_ticket_dto_1.CreateSupportTicketDto, String]),
    __metadata("design:returntype", void 0)
], CommsController.prototype, "createTicket", null);
__decorate([
    (0, common_1.Get)('tickets/my'),
    (0, roles_decorator_1.Roles)(client_1.Role.STUDENT),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Get current student's support tickets" }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, roles_decorator_1.CurrentUser)('id')),
    __param(1, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CommsController.prototype, "getMyTickets", null);
__decorate([
    (0, common_1.Get)('tickets'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'List tickets (filtered by role)' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __param(2, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ticket_dto_1.TicketQueryDto, String, String]),
    __metadata("design:returntype", void 0)
], CommsController.prototype, "listTickets", null);
__decorate([
    (0, common_1.Patch)('tickets/:id/status'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update ticket status and notes' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, roles_decorator_1.CurrentUser)('id')),
    __param(3, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ticket_dto_1.UpdateTicketStatusDto, String, String]),
    __metadata("design:returntype", void 0)
], CommsController.prototype, "updateTicketStatus", null);
__decorate([
    (0, common_1.Post)('tickets/:id/reply'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add a reply to a ticket' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, roles_decorator_1.CurrentUser)('id')),
    __param(3, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ticket_dto_1.AddTicketReplyDto, String, String]),
    __metadata("design:returntype", void 0)
], CommsController.prototype, "addReply", null);
exports.CommsController = CommsController = __decorate([
    (0, swagger_1.ApiTags)('Comms'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('comms'),
    __metadata("design:paramtypes", [comms_service_1.CommsService])
], CommsController);
//# sourceMappingURL=comms.controller.js.map