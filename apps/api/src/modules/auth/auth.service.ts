import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signToken } from '../../lib/jwt.js';
import type { SignupInput, LoginInput, CreateStaffInput, UpdateStaffInput } from './auth.schema.js';

const publicUser = (u: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  restaurantId: string;
}) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  phone: u.phone,
  restaurantId: u.restaurantId,
});

export const authService = {
  async signup(input: SignupInput) {
    const existing = await prisma.user.findFirst({ where: { email: input.email } });
    if (existing) throw HttpError.conflict('An account with this email already exists');

    const passwordHash = await hashPassword(input.password);

    const { restaurant, user } = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: input.restaurantName,
          gstNumber: input.gstNumber,
          city: input.city,
          state: input.state,
          phone: input.phone,
          email: input.email,
        },
      });
      const user = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          email: input.email,
          name: input.ownerName,
          phone: input.phone,
          passwordHash,
          role: UserRole.OWNER,
        },
      });
      return { restaurant, user };
    });

    const token = signToken({ sub: user.id, rid: restaurant.id, role: user.role });
    return { token, user: publicUser(user), restaurant };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findFirst({ where: { email: input.email, active: true } });
    if (!user) throw HttpError.unauthorized('Invalid email or password');

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) throw HttpError.unauthorized('Invalid email or password');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: user.restaurantId } });
    if (!restaurant.active) throw HttpError.forbidden('This restaurant account is suspended');

    const token = signToken({ sub: user.id, rid: user.restaurantId, role: user.role });
    return { token, user: publicUser(user), restaurant };
  },

  async me(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { restaurant: true },
    });
    return { user: publicUser(user), restaurant: user.restaurant };
  },

  async createStaff(restaurantId: string, input: CreateStaffInput) {
    const conflict = await prisma.user.findFirst({
      where: { restaurantId, email: input.email },
    });
    if (conflict) throw HttpError.conflict('A staff member with this email already exists');

    const passwordHash = await hashPassword(input.password);
    try {
      const user = await prisma.user.create({
        data: {
          restaurantId,
          email: input.email,
          name: input.name,
          phone: input.phone,
          passwordHash,
          role: input.role,
        },
      });
      return publicUser(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw HttpError.conflict('Duplicate email');
      }
      throw err;
    }
  },

  async listStaff(restaurantId: string) {
    const users = await prisma.user.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });
    return users.map(publicUser);
  },

  async updateStaff(restaurantId: string, actorId: string, userId: string, input: UpdateStaffInput) {
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.restaurantId !== restaurantId) throw HttpError.notFound('Staff member not found');

    // Guard: don't let the last active OWNER be demoted or deactivated
    if (target.role === UserRole.OWNER && (input.role && input.role !== UserRole.OWNER || input.active === false)) {
      const owners = await prisma.user.count({
        where: { restaurantId, role: UserRole.OWNER, active: true },
      });
      if (owners <= 1) throw HttpError.badRequest('Cannot demote or deactivate the last owner');
    }

    const data: Parameters<typeof prisma.user.update>[0]['data'] = {
      name: input.name,
      phone: input.phone,
      role: input.role,
      active: input.active,
    };
    if (input.password) {
      data.passwordHash = await hashPassword(input.password);
    }

    const updated = await prisma.user.update({ where: { id: userId }, data });
    return publicUser(updated);
  },
};
