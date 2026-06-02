import { Prisma, StylistStatus, UserRole, BookingStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

// ─── Stylist management ────────────────────────────────────────────────────────

const adminStylistSelect = {
  id: true,
  specialty: true,
  location: true,
  bio: true,
  avatarUrl: true,
  portfolioUrls: true,
  priceFrom: true,
  rating: true,
  reviewCount: true,
  isAvailable: true,
  isVerified: true,
  status: true,
  approvedAt: true,
  approvedById: true,
  experience: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  },
  approvedBy: { select: { id: true, name: true } },
  services: {
    where: { isActive: true },
    select: { id: true, name: true, category: true, price: true, duration: true, imageUrl: true },
    orderBy: { name: "asc" as const },
  },
} satisfies Prisma.StylistSelect;

export const adminRepository = {
  // ─── Stylists ──────────────────────────────────────────────────────────────

  async listStylists(params: {
    page: number;
    limit: number;
    status?: StylistStatus;
    search?: string;
  }) {
    const where: Prisma.StylistWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { specialty: { contains: params.search, mode: "insensitive" } },
        { location: { contains: params.search, mode: "insensitive" } },
        { user: { name: { contains: params.search, mode: "insensitive" } } },
        { user: { email: { contains: params.search, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.stylist.findMany({
        where,
        select: adminStylistSelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.stylist.count({ where }),
    ]);
    return { items, total };
  },

  async findStylistById(id: string) {
    return prisma.stylist.findUnique({ where: { id }, select: adminStylistSelect });
  },

  async updateStylistStatus(params: {
    id: string;
    status: StylistStatus;
    approvedById?: string;
    approvedAt?: Date;
  }) {
    return prisma.stylist.update({
      where: { id: params.id },
      data: {
        status: params.status,
        isVerified: params.status === StylistStatus.APPROVED,
        ...(params.approvedById !== undefined ? { approvedById: params.approvedById } : {}),
        ...(params.approvedAt !== undefined ? { approvedAt: params.approvedAt } : {}),
      },
      select: adminStylistSelect,
    });
  },

  async countPendingStylists() {
    return prisma.stylist.count({ where: { status: StylistStatus.PENDING_APPROVAL } });
  },

  // ─── Users ─────────────────────────────────────────────────────────────────

  async listUsers(params: {
    page: number;
    limit: number;
    search?: string;
    role?: UserRole;
  }) {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (params.role) where.role = params.role;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          role: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          deletedAt: true,
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            stylist: { select: { id: true, specialty: true, user: { select: { name: true } } } },
          },
        },
      },
    });
  },

  async updateUserRole(id: string, role: UserRole) {
    return prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  },

  async softDeleteUser(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, name: true, deletedAt: true },
    });
  },

  // ─── Bookings ──────────────────────────────────────────────────────────────

  async listBookings(params: {
    page: number;
    limit: number;
    status?: BookingStatus;
    stylistId?: string;
    userId?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.BookingWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.stylistId) where.stylistId = params.stylistId;
    if (params.userId) where.userId = params.userId;
    if (params.from || params.to) {
      where.startTime = {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      };
    }

    const [items, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          serviceId: true,
          packageId: true,
          service: { select: { id: true, name: true, category: true, price: true, duration: true, imageUrl: true } },
          services: {
            select: {
              id: true,
              serviceId: true,
              price: true,
              service: { select: { id: true, name: true, category: true, price: true, duration: true, imageUrl: true } },
            },
          },
          user: { select: { id: true, name: true, email: true } },
          stylist: {
            select: {
              id: true,
              specialty: true,
              location: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);
    return { items, total };
  },

  async findBookingById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, address: true } },
        stylist: {
          select: {
            id: true,
            specialty: true,
            location: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        service: { select: { id: true, name: true, category: true, price: true, duration: true } },
        services: {
          select: {
            id: true,
            price: true,
            service: { select: { id: true, name: true, category: true, price: true, duration: true } },
          },
        },
        package: { select: { id: true, name: true, price: true, duration: true } },
        payment: { select: { id: true, amount: true, status: true, paidAt: true, paystackRef: true } },
      },
    });
  },

  // ─── Services ──────────────────────────────────────────────────────────────

  async listAllServices(params: { page: number; limit: number }) {
    const [items, total] = await prisma.$transaction([
      prisma.service.findMany({
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          duration: true,
          isActive: true,
          createdAt: true,
          stylist: { select: { id: true, specialty: true, user: { select: { name: true } } } },
        },
      }),
      prisma.service.count(),
    ]);
    return { items, total };
  },

  async deactivateService(id: string) {
    return prisma.service.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true },
    });
  },

  // ─── Analytics ─────────────────────────────────────────────────────────────

  async getAnalytics() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalUsers,
      totalStylists,
      pendingApprovals,
      totalBookings,
      bookingsByStatus,
      revenueResult,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, role: UserRole.USER } }),
      prisma.stylist.count({ where: { deletedAt: null } }),
      prisma.stylist.count({ where: { status: StylistStatus.PENDING_APPROVAL } }),
      prisma.booking.count(),
      prisma.booking.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
    ]);

    // Revenue by month (last 6 months) — raw groupBy by year/month
    const monthlyRevenue = await prisma.$queryRaw<
      { year: number; month: number; revenue: bigint }[]
    >`
      SELECT
        EXTRACT(YEAR  FROM p."paidAt")::int AS year,
        EXTRACT(MONTH FROM p."paidAt")::int AS month,
        SUM(p.amount)::bigint AS revenue
      FROM payments p
      WHERE p.status = 'SUCCESS' AND p."paidAt" >= ${sixMonthsAgo}
      GROUP BY year, month
      ORDER BY year, month
    `;

    // Top 5 stylists by revenue
    const topStylists = await prisma.$queryRaw<
      { stylistId: string; name: string; revenue: bigint; bookings: bigint }[]
    >`
      SELECT
        b."stylistId",
        u.name,
        SUM(p.amount)::bigint AS revenue,
        COUNT(b.id)::bigint   AS bookings
      FROM bookings b
      JOIN payments p ON p."bookingId" = b.id AND p.status = 'SUCCESS'
      JOIN stylists s ON s.id = b."stylistId"
      JOIN users u    ON u.id = s."userId"
      GROUP BY b."stylistId", u.name
      ORDER BY revenue DESC
      LIMIT 5
    `;

    // Top 5 services by booking count
    const topServices = await prisma.bookingService.groupBy({
      by: ["serviceId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const topServiceDetails = await Promise.all(
      topServices.map(async (ts) => {
        const svc = await prisma.service.findUnique({
          where: { id: ts.serviceId },
          select: { id: true, name: true, category: true },
        });
        return { ...svc, bookingCount: ts._count.id };
      })
    );

    return {
      totalUsers,
      totalStylists,
      pendingApprovals,
      totalBookings,
      totalRevenue: Number(revenueResult._sum.amount ?? 0),
      bookingsByStatus: Object.fromEntries(
        bookingsByStatus.map((b) => [b.status, b._count.id])
      ),
      revenueByMonth: monthlyRevenue.map((r) => ({
        year: r.year,
        month: r.month,
        revenue: Number(r.revenue),
      })),
      topStylists: topStylists.map((s) => ({
        stylistId: s.stylistId,
        name: s.name,
        revenue: Number(s.revenue),
        bookings: Number(s.bookings),
      })),
      topServices: topServiceDetails,
    };
  },

  async getRecentBookings(limit = 10) {
    return prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        startTime: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { name: true } },
        stylist: { select: { specialty: true, user: { select: { name: true } } } },
      },
    });
  },
};
