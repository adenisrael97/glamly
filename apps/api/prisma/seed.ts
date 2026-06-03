import {
  PrismaClient,
  UserRole,
  BookingStatus,
  PaymentStatus,
  StylistStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const DEV_PASSWORD = "Password123!";

// ─── Stylist seed data ────────────────────────────────────────────────────────

const STYLISTS = [
  { name: "Jane Okafor",       specialty: "Makeup",       location: "Lekki",           lat: 6.4295, lng: 3.4219, price: 8000,  rating: 4.8, experience: 6, tags: ["Bridal", "Natural Look", "Updo"],           services: ["Makeup", "Hair Styling"], status: StylistStatus.APPROVED },
  { name: "Chinedu Balogun",   specialty: "Barber",       location: "Victoria Island",  lat: 6.4281, lng: 3.4216, price: 5000,  rating: 4.5, experience: 4, tags: ["Fade", "Men's Cut", "Classic"],             services: ["Barber", "Hair Styling"], status: StylistStatus.APPROVED },
  { name: "Aisha Bello",       specialty: "Makeup",       location: "Ikeja",            lat: 6.6018, lng: 3.3515, price: 7000,  rating: 4.7, experience: 5, tags: ["Bridal", "Glam", "Pedicure"],               services: ["Makeup", "Nails"],        status: StylistStatus.APPROVED },
  { name: "Tunde Ojo",         specialty: "Barber",       location: "Yaba",             lat: 6.5095, lng: 3.3715, price: 6000,  rating: 4.2, experience: 3, tags: ["Braids", "Fade", "Kids"],                   services: ["Barber", "Braiding"],     status: StylistStatus.APPROVED },
  { name: "Ngozi Eze",         specialty: "Hair Styling", location: "Surulere",         lat: 6.5006, lng: 3.3541, price: 9000,  rating: 4.9, experience: 7, tags: ["Cornrows", "Natural Hair", "Extensions"],   services: ["Hair Styling", "Braiding"], status: StylistStatus.APPROVED },
  { name: "Samuel Adeyemi",    specialty: "Barber",       location: "Ajah",             lat: 6.4675, lng: 3.6015, price: 4000,  rating: 4.3, experience: 2, tags: ["Men's Cut", "Kids", "Classic"],             services: ["Barber"],                status: StylistStatus.APPROVED },
  { name: "Blessing Umeh",     specialty: "Makeup",       location: "Lekki",            lat: 6.4295, lng: 3.4219, price: 10000, rating: 4.6, experience: 8, tags: ["Bridal", "Glam", "Gel Nails"],              services: ["Makeup", "Nails", "Hair Styling"], status: StylistStatus.APPROVED },
  { name: "Ifeanyi Nwosu",     specialty: "Braiding",     location: "Victoria Island",  lat: 6.4281, lng: 3.4216, price: 8500,  rating: 4.4, experience: 5, tags: ["Box Braids", "Natural Hair", "Updo"],       services: ["Braiding", "Hair Styling"], status: StylistStatus.APPROVED },
  { name: "Fatima Musa",       specialty: "Makeup",       location: "Ikeja",            lat: 6.6018, lng: 3.3515, price: 7500,  rating: 4.7, experience: 6, tags: ["Bridal", "Natural Look", "Pedicure"],       services: ["Makeup", "Nails"],        status: StylistStatus.APPROVED },
  { name: "Emeka Obi",         specialty: "Barber",       location: "Yaba",             lat: 6.5095, lng: 3.3715, price: 5500,  rating: 4.1, experience: 3, tags: ["Fade", "Classic", "Kids"],                  services: ["Barber", "Hair Styling"], status: StylistStatus.APPROVED },
  { name: "Kemi Adebayo",      specialty: "Makeup",       location: "Surulere",         lat: 6.5006, lng: 3.3541, price: 9500,  rating: 4.8, experience: 7, tags: ["Bridal", "Glam", "Updo"],                   services: ["Makeup", "Hair Styling"], status: StylistStatus.APPROVED },
  { name: "Bola Shittu",       specialty: "Braiding",     location: "Ajah",             lat: 6.4675, lng: 3.6015, price: 7000,  rating: 4.5, experience: 4, tags: ["Box Braids", "Gel Nails", "Extensions"],    services: ["Braiding", "Nails"],      status: StylistStatus.APPROVED },
  { name: "Chika Nwachukwu",   specialty: "Makeup",       location: "Lekki",            lat: 6.4295, lng: 3.4219, price: 11000, rating: 4.9, experience: 9, tags: ["Bridal", "Natural Look", "Cornrows"],       services: ["Makeup", "Hair Styling", "Braiding"], status: StylistStatus.APPROVED },
  { name: "David Eze",         specialty: "Barber",       location: "Victoria Island",  lat: 6.4281, lng: 3.4216, price: 5000,  rating: 4.3, experience: 3, tags: ["Fade", "Classic", "Lineup"],                services: ["Barber"],                status: StylistStatus.APPROVED },
  { name: "Yetunde Lawal",     specialty: "Hair Styling", location: "Ikeja",            lat: 6.6018, lng: 3.3515, price: 8000,  rating: 4.6, experience: 5, tags: ["Weave", "Natural Hair", "Relaxer"],         services: ["Hair Styling", "Braiding"], status: StylistStatus.APPROVED },
  { name: "Nnamdi Okonkwo",    specialty: "Barber",       location: "Surulere",         lat: 6.5006, lng: 3.3541, price: 4500,  rating: 4.0, experience: 2, tags: ["Fade", "Kids", "Shave"],                    services: ["Barber"],                status: StylistStatus.APPROVED },
  { name: "Adeola Fashola",    specialty: "Nails",        location: "Lekki",            lat: 6.4295, lng: 3.4219, price: 6500,  rating: 4.7, experience: 4, tags: ["Gel Nails", "Nail Art", "Pedicure"],        services: ["Nails"],                 status: StylistStatus.APPROVED },
  { name: "Chisom Okeke",      specialty: "Makeup",       location: "Yaba",             lat: 6.5095, lng: 3.3715, price: 7500,  rating: 4.5, experience: 5, tags: ["Editorial", "Glam", "Evening"],             services: ["Makeup"],                status: StylistStatus.APPROVED },
  // Two pending-approval stylists (will NOT appear in public search)
  { name: "Tola Ogundimu",     specialty: "Hair Styling", location: "Ajah",             lat: 6.4675, lng: 3.6015, price: 8500,  rating: 4.4, experience: 6, tags: ["Braids", "Cornrows", "Weave"],              services: ["Hair Styling", "Braiding"], status: StylistStatus.PENDING_APPROVAL },
  { name: "Femi Adesanya",     specialty: "Barber",       location: "Victoria Island",  lat: 6.4281, lng: 3.4216, price: 6000,  rating: 4.6, experience: 5, tags: ["Fade", "Beard Trim", "Classic"],            services: ["Barber", "Hair Styling"], status: StylistStatus.PENDING_APPROVAL },
] as const;

// ─── 50 services ──────────────────────────────────────────────────────────────

type ServiceSeed = {
  name: string;
  category: string;
  price: number;
  duration: number;
  description: string;
  imageUrl: string;
};

const SERVICES: ServiceSeed[] = [
  { name: "Men Haircut",        category: "Hair",   price: 5000,  duration: 30,  description: "Classic men's haircut, shaped and styled.",           imageUrl: "/images/men/men1.jpg" },
  { name: "Women Haircut",      category: "Hair",   price: 6000,  duration: 45,  description: "Precision cut for women, any length.",                 imageUrl: "/images/women/women1.jpg" },
  { name: "Makeup Classic",     category: "Makeup", price: 10000, duration: 60,  description: "Everyday glam makeup, perfect for any occasion.",      imageUrl: "/images/makeup/makeup1.jpg" },
  { name: "Nail Art",           category: "Nails",  price: 4000,  duration: 45,  description: "Creative nail art designs, freehand or stamped.",      imageUrl: "/images/naileye/naileye1.jpg" },
  { name: "Eye Glam",           category: "Eyes",   price: 5500,  duration: 30,  description: "Bold eye looks — smoky, winged, or colourful.",        imageUrl: "/images/naileye/naileye2.jpg" },
  { name: "Women Braids",       category: "Hair",   price: 8000,  duration: 120, description: "Protective braids — box, knotless, or feed-in.",      imageUrl: "/images/women/women2.jpg" },
  { name: "Men Fade Cut",       category: "Hair",   price: 7000,  duration: 40,  description: "Low, mid, or high fade tailored to face shape.",       imageUrl: "/images/men/men2.jpg" },
  { name: "Bridal Makeup",      category: "Makeup", price: 15000, duration: 90,  description: "Full bridal beat, including trial session.",           imageUrl: "/images/makeup/makeup2.jpg" },
  { name: "French Nails",       category: "Nails",  price: 4500,  duration: 45,  description: "Classic French tips, gel or acrylic overlay.",         imageUrl: "/images/naileye/naileye3.jpg" },
  { name: "Lash Extensions",    category: "Eyes",   price: 9000,  duration: 60,  description: "Volume or classic lash extensions, 3–4 week wear.",    imageUrl: "/images/naileye/naileye4.jpg" },
  { name: "Men Beard Trim",     category: "Hair",   price: 3500,  duration: 20,  description: "Beard shaping, lining, and hot towel finish.",         imageUrl: "/images/men/men3.jpg" },
  { name: "Women Curls",        category: "Hair",   price: 7000,  duration: 60,  description: "Defined curls using flexi rods or twist-outs.",        imageUrl: "/images/women/women3.jpg" },
  { name: "Evening Makeup",     category: "Makeup", price: 12000, duration: 75,  description: "Dramatic evening look with contouring and highlight.",  imageUrl: "/images/makeup/makeup3.jpg" },
  { name: "Nail Polish",        category: "Nails",  price: 3500,  duration: 30,  description: "Manicure with your choice of gel or regular polish.",   imageUrl: "/images/naileye/naileye5.jpg" },
  { name: "Eye Liner Art",      category: "Eyes",   price: 6000,  duration: 30,  description: "Precise eyeliner application — graphic or classic.",   imageUrl: "/images/naileye/naileye6.jpg" },
  { name: "Men Classic Cut",    category: "Hair",   price: 5000,  duration: 30,  description: "Timeless scissor-over-comb cut with styling.",         imageUrl: "/images/men/men4.jpg" },
  { name: "Women Ponytail",     category: "Hair",   price: 6500,  duration: 45,  description: "Sleek or textured ponytail, extensions available.",    imageUrl: "/images/women/women4.jpg" },
  { name: "Glam Makeup",        category: "Makeup", price: 11000, duration: 75,  description: "Full-face glam with lashes and setting spray.",         imageUrl: "/images/makeup/makeup4.jpg" },
  { name: "Nail Sparkle",       category: "Nails",  price: 5000,  duration: 45,  description: "Glitter and rhinestone nail embellishment.",            imageUrl: "/images/naileye/naileye7.jpg" },
  { name: "Eye Shadow Pro",     category: "Eyes",   price: 8000,  duration: 45,  description: "Multi-shade blended eyeshadow, custom to eye shape.",   imageUrl: "/images/naileye/naileye8.jpg" },
  { name: "Men Undercut",       category: "Hair",   price: 6000,  duration: 35,  description: "Disconnected undercut with textured top.",             imageUrl: "/images/men/men5.jpg" },
  { name: "Women Bob",          category: "Hair",   price: 7000,  duration: 50,  description: "Sharp bob cut, blunt or textured ends.",                imageUrl: "/images/women/women5.jpg" },
  { name: "Natural Makeup",     category: "Makeup", price: 9000,  duration: 60,  description: "Clean, skin-first natural look with minimal coverage.",  imageUrl: "/images/makeup/makeup5.jpg" },
  { name: "Nail French Tips",   category: "Nails",  price: 4000,  duration: 40,  description: "Crisp white tips on nude or clear base.",               imageUrl: "/images/naileye/naileye9.jpg" },
  { name: "Eye Brow Tint",      category: "Eyes",   price: 7000,  duration: 30,  description: "Brow tint and shaping for fuller, defined arches.",     imageUrl: "/images/naileye/naileye10.jpg" },
  { name: "Men Crew Cut",       category: "Hair",   price: 5000,  duration: 30,  description: "Military-inspired crew cut, uniform length.",           imageUrl: "/images/men/men6.jpg" },
  { name: "Women Pixie",        category: "Hair",   price: 7500,  duration: 45,  description: "Short, chic pixie cut shaped to face contours.",        imageUrl: "/images/women/women6.jpg" },
  { name: "Party Makeup",       category: "Makeup", price: 13000, duration: 80,  description: "High-impact look with bold lip or dramatic eye.",        imageUrl: "/images/makeup/makeup6.jpg" },
  { name: "Nail Ombre",         category: "Nails",  price: 5000,  duration: 50,  description: "Gradient colour fade across all ten nails.",            imageUrl: "/images/naileye/naileye1.jpg" },
  { name: "Eye Cat Eye",        category: "Eyes",   price: 8500,  duration: 35,  description: "Extended cat-eye flick, gel or liquid liner.",          imageUrl: "/images/naileye/naileye2.jpg" },
  { name: "Men Taper Fade",     category: "Hair",   price: 6500,  duration: 40,  description: "Skin-blended taper fade with defined hairline.",         imageUrl: "/images/men/men7.jpg" },
  { name: "Women Layered",      category: "Hair",   price: 8000,  duration: 60,  description: "Layered cut adding movement and volume.",                imageUrl: "/images/women/women7.jpg" },
  { name: "Editorial Makeup",   category: "Makeup", price: 14000, duration: 90,  description: "Avant-garde makeup for shoots and performances.",        imageUrl: "/images/makeup/makeup7.jpg" },
  { name: "Nail Minimalist",    category: "Nails",  price: 3500,  duration: 30,  description: "Clean, simple nails — nude shades or single colour.",   imageUrl: "/images/naileye/naileye3.jpg" },
  { name: "Eye Volume Lash",    category: "Eyes",   price: 9500,  duration: 75,  description: "Mega-volume Russian lash set for maximum drama.",        imageUrl: "/images/naileye/naileye4.jpg" },
  { name: "Men Buzz Cut",       category: "Hair",   price: 4000,  duration: 20,  description: "All-over clipper cut, low maintenance and clean.",       imageUrl: "/images/men/men8.jpg" },
  { name: "Women Updo",         category: "Hair",   price: 9000,  duration: 70,  description: "Elegant updo — chignon, French roll, or braided bun.",  imageUrl: "/images/women/women8.jpg" },
  { name: "Runway Makeup",      category: "Makeup", price: 16000, duration: 100, description: "Fashion-week-ready look, photographed and press-ready.", imageUrl: "/images/makeup/makeup8.jpg" },
  { name: "Nail Marble",        category: "Nails",  price: 6000,  duration: 55,  description: "Marble effect using gel and foil techniques.",           imageUrl: "/images/naileye/naileye5.jpg" },
  { name: "Eye Natural",        category: "Eyes",   price: 7000,  duration: 30,  description: "Subtle everyday eye with mascara and soft liner.",        imageUrl: "/images/naileye/naileye6.jpg" },
  { name: "Men Pompadour",      category: "Hair",   price: 7500,  duration: 45,  description: "Volume pompadour styled with matte or shine product.",   imageUrl: "/images/men/men9.jpg" },
  { name: "Women Blowout",      category: "Hair",   price: 8500,  duration: 60,  description: "Blowdry with round brush for smooth, voluminous finish.", imageUrl: "/images/women/women2.jpg" },
  { name: "Bridal Trial",       category: "Makeup", price: 12000, duration: 90,  description: "Pre-wedding makeup trial to finalise the bridal look.",  imageUrl: "/images/makeup/makeup9.jpg" },
  { name: "Gel Manicure",       category: "Nails",  price: 5500,  duration: 50,  description: "Long-lasting gel manicure, chip-free for 3+ weeks.",    imageUrl: "/images/naileye/naileye7.jpg" },
  { name: "Lash Lift",          category: "Eyes",   price: 8000,  duration: 60,  description: "Keratin lash lift and tint for a wide-awake look.",     imageUrl: "/images/naileye/naileye8.jpg" },
  { name: "Men Line Up",        category: "Hair",   price: 3000,  duration: 15,  description: "Hairline and beard edge detailing only.",               imageUrl: "/images/men/men3.jpg" },
  { name: "Women Colour",       category: "Hair",   price: 12000, duration: 90,  description: "Full hair colour or balayage highlights.",               imageUrl: "/images/women/women4.jpg" },
  { name: "Photo Makeup",       category: "Makeup", price: 10000, duration: 70,  description: "Camera-ready makeup for portraits or events.",           imageUrl: "/images/makeup/makeup10.jpg" },
  { name: "Nail Chrome",        category: "Nails",  price: 6500,  duration: 50,  description: "Mirror-chrome powder finish on gel base.",               imageUrl: "/images/naileye/naileye9.jpg" },
  { name: "Eye Hybrid Lash",    category: "Eyes",   price: 10000, duration: 90,  description: "Mixed classic and volume lashes for natural fullness.",  imageUrl: "/images/naileye/naileye10.jpg" },
];

// ─── Customer accounts ────────────────────────────────────────────────────────

const CUSTOMERS = [
  { name: "Ada Okonkwo",     email: "ada@glamly.ng",      phone: "+2348012345601", address: "14 Admiralty Way, Lekki Phase 1, Lagos" },
  { name: "Mike Adeleke",    email: "mike@glamly.ng",     phone: "+2348012345602", address: "7 Bode Thomas Street, Surulere, Lagos" },
  { name: "Sade Oluwole",    email: "sade@glamly.ng",     phone: "+2348012345603", address: "3 Opebi Road, Ikeja, Lagos" },
  { name: "Emeka Chukwu",    email: "emeka@glamly.ng",    phone: "+2348012345604", address: "22 Allen Avenue, Ikeja, Lagos" },
  { name: "Chidinma Nwofor", email: "chidinma@glamly.ng", phone: "+2348012345605", address: "5 Oluwaseun Close, Victoria Island, Lagos" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugEmail(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, ".").replace(/\.+/g, ".") + "@stylist.glamly.ng";
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 0, 0, 0);
  return d;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding database...");

  // Idempotency: clear tables in FK-safe order before re-seeding.
  await prisma.giftVoucherService.deleteMany({});
  await prisma.giftVoucher.deleteMany({});
  await prisma.bookingService.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.packageService.deleteMany({});
  await prisma.package.deleteMany({});
  await prisma.service.deleteMany({});

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, BCRYPT_ROUNDS);

  // ── 0. Admin user ────────────────────────────────────────────────────────────

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@glamly.ng" },
    update: {},
    create: {
      email: "admin@glamly.ng",
      passwordHash,
      name: "Glamly Admin",
      phone: "+2348000000000",
      role: UserRole.ADMIN,
      isVerified: true,
    },
  });

  console.log("  ✓ 1 admin user (admin@glamly.ng)");

  // ── 1. Customers ─────────────────────────────────────────────────────────────

  const customerUsers = await Promise.all(
    CUSTOMERS.map((c) =>
      prisma.user.upsert({
        where: { email: c.email },
        update: {},
        create: {
          email: c.email,
          passwordHash,
          name: c.name,
          phone: c.phone,
          address: c.address,
          role: UserRole.USER,
          isVerified: true,
        },
      })
    )
  );

  console.log(`  ✓ ${customerUsers.length} customers`);

  // ── 2. Stylist users + profiles ──────────────────────────────────────────────

  const stylistRecords: {
    stylist: { id: string; specialty: string; services: readonly string[] };
    serviceIds: string[];
  }[] = [];

  for (const s of STYLISTS) {
    const email = slugEmail(s.name);
    const isApproved = s.status === StylistStatus.APPROVED;

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        name: s.name,
        role: UserRole.STYLIST,
        isVerified: isApproved,
      },
    });

    const stylist = await prisma.stylist.upsert({
      where: { userId: user.id },
      // Re-seed must reconcile approval state on pre-existing rows; an empty
      // update would leave them at the schema default (PENDING_APPROVAL).
      update: {
        status: s.status,
        isVerified: isApproved,
        approvedAt: isApproved ? new Date() : null,
        approvedById: isApproved ? adminUser.id : null,
      },
      create: {
        userId: user.id,
        bio: `${s.name} is a professional ${s.specialty.toLowerCase()} artist based in ${s.location}, Lagos, with ${s.experience} years of experience.`,
        specialty: s.specialty,
        location: s.location,
        lat: s.lat,
        lng: s.lng,
        avatarUrl: null,
        portfolioUrls: [],
        isAvailable: s.rating >= 4.3,
        isVerified: isApproved,
        status: s.status,
        approvedAt: isApproved ? new Date() : null,
        approvedById: isApproved ? adminUser.id : null,
        priceFrom: s.price,
        rating: s.rating,
        reviewCount: 0,
        experience: s.experience,
        tags: [...s.tags],
      },
    });

    stylistRecords.push({
      stylist: { id: stylist.id, specialty: s.specialty, services: s.services },
      serviceIds: [],
    });
  }

  console.log(`  ✓ ${STYLISTS.length} stylists (${STYLISTS.filter((s) => s.status === StylistStatus.PENDING_APPROVAL).length} pending approval)`);

  // ── 3. Services ──────────────────────────────────────────────────────────────

  const CATEGORY_MATCH: Record<string, string[]> = {
    Hair:   ["Hair Styling", "Braiding", "Barber"],
    Makeup: ["Makeup"],
    Nails:  ["Nails"],
    Eyes:   ["Nails", "Makeup"],
  };

  const catCounters: Record<string, number> = {};

  for (const svc of SERVICES) {
    const allowedKeywords = CATEGORY_MATCH[svc.category] ?? ["Hair Styling"];
    const eligible = stylistRecords.filter((r) =>
      r.stylist.services.some((type) => allowedKeywords.includes(type))
    );

    const counter = catCounters[svc.category] ?? 0;
    const target = eligible[counter % eligible.length];
    catCounters[svc.category] = counter + 1;

    const created = await prisma.service.create({
      data: {
        stylistId: target.stylist.id,
        name: svc.name,
        category: svc.category,
        description: svc.description,
        price: svc.price,
        duration: svc.duration,
        imageUrl: svc.imageUrl,
        isActive: true,
      },
    });

    target.serviceIds.push(created.id);
  }

  console.log(`  ✓ ${SERVICES.length} services`);

  // ── 4. Packages (2 per approved stylist with ≥ 2 services) ──────────────────

  let packageCount = 0;
  for (const { stylist, serviceIds } of stylistRecords) {
    if (serviceIds.length < 2) continue;

    // Package 1: first two services, 10% discount vs sum
    const svc1 = await prisma.service.findUnique({ where: { id: serviceIds[0] } });
    const svc2 = await prisma.service.findUnique({ where: { id: serviceIds[1] } });
    if (!svc1 || !svc2) continue;

    const pkg1Price = Math.round((svc1.price + svc2.price) * 0.9);
    const pkg1 = await prisma.package.create({
      data: {
        stylistId: stylist.id,
        name: `${svc1.name} + ${svc2.name} Combo`,
        description: `Get ${svc1.name} and ${svc2.name} together at a discounted rate.`,
        price: pkg1Price,
        duration: svc1.duration + svc2.duration,
        isActive: true,
      },
    });
    await prisma.packageService.createMany({
      data: [
        { packageId: pkg1.id, serviceId: svc1.id },
        { packageId: pkg1.id, serviceId: svc2.id },
      ],
    });
    packageCount++;

    // Package 2 (if 3+ services): first + last service
    if (serviceIds.length >= 3) {
      const svcLast = await prisma.service.findUnique({ where: { id: serviceIds[serviceIds.length - 1] } });
      if (svcLast) {
        const pkg2Price = Math.round((svc1.price + svcLast.price) * 0.88);
        const pkg2 = await prisma.package.create({
          data: {
            stylistId: stylist.id,
            name: `${svc1.name} + ${svcLast.name} Bundle`,
            description: `Premium bundle combining ${svc1.name} and ${svcLast.name}.`,
            price: pkg2Price,
            duration: svc1.duration + svcLast.duration,
            isActive: true,
          },
        });
        await prisma.packageService.createMany({
          data: [
            { packageId: pkg2.id, serviceId: svc1.id },
            { packageId: pkg2.id, serviceId: svcLast.id },
          ],
        });
        packageCount++;
      }
    }
  }

  console.log(`  ✓ ${packageCount} packages`);

  // ── 5. Bookings, payments, and reviews ──────────────────────────────────────

  type BookingDef = {
    customerIdx: number;
    stylistIdx: number;
    daysOffset: number;
    status: BookingStatus;
    paymentStatus: PaymentStatus | null;
    reviewRating: number | null;
    reviewComment: string | null;
  };

  const BOOKING_DEFS: BookingDef[] = [
    { customerIdx: 0, stylistIdx: 0,  daysOffset: -14, status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.SUCCESS, reviewRating: 5, reviewComment: "Jane is absolutely incredible! My bridal look was perfect." },
    { customerIdx: 1, stylistIdx: 1,  daysOffset: -10, status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.SUCCESS, reviewRating: 4, reviewComment: "Great fade, very clean lines. Will be back." },
    { customerIdx: 2, stylistIdx: 2,  daysOffset:  -7, status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.SUCCESS, reviewRating: 5, reviewComment: "Aisha did my nails perfectly for my event. Love them!" },
    { customerIdx: 3, stylistIdx: 4,  daysOffset:  -5, status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.SUCCESS, reviewRating: 5, reviewComment: "Ngozi's braids are flawless. My go-to from now on." },
    { customerIdx: 4, stylistIdx: 6,  daysOffset:  -3, status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.SUCCESS, reviewRating: 4, reviewComment: "Beautiful makeup, exactly what I asked for." },
    { customerIdx: 0, stylistIdx: 12, daysOffset:   1, status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.SUCCESS, reviewRating: null, reviewComment: null },
    { customerIdx: 1, stylistIdx: 19, daysOffset:   2, status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.SUCCESS, reviewRating: null, reviewComment: null },
    { customerIdx: 2, stylistIdx: 3,  daysOffset:   4, status: BookingStatus.PENDING,   paymentStatus: PaymentStatus.PENDING,  reviewRating: null, reviewComment: null },
    { customerIdx: 3, stylistIdx: 16, daysOffset:   7, status: BookingStatus.PENDING,   paymentStatus: null,                   reviewRating: null, reviewComment: null },
    { customerIdx: 4, stylistIdx: 10, daysOffset:   9, status: BookingStatus.PENDING,   paymentStatus: null,                   reviewRating: null, reviewComment: null },
  ];

  let bookingCount = 0;

  for (let i = 0; i < BOOKING_DEFS.length; i++) {
    const def = BOOKING_DEFS[i];
    const customer = customerUsers[def.customerIdx];
    const { stylist, serviceIds } = stylistRecords[def.stylistIdx];

    if (serviceIds.length === 0) continue;

    const service = await prisma.service.findUnique({ where: { id: serviceIds[0] } });
    if (!service) continue;

    const startTime = def.daysOffset < 0 ? daysAgo(Math.abs(def.daysOffset)) : daysFromNow(def.daysOffset);
    startTime.setHours(10 + i, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + service.duration * 60_000);

    const booking = await prisma.booking.create({
      data: {
        userId: customer.id,
        stylistId: stylist.id,
        serviceId: service.id,
        startTime,
        endTime,
        status: def.status,
        totalAmount: service.price,
        idempotencyKey: `seed-booking-${i}`,
        services: {
          create: [{ serviceId: service.id, price: service.price }],
        },
      },
    });

    bookingCount++;

    if (def.paymentStatus !== null) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          userId: customer.id,
          amount: service.price,
          currency: "NGN",
          status: def.paymentStatus,
          paystackRef: def.paymentStatus === PaymentStatus.SUCCESS ? `PST_SEED_${i}_REF` : null,
          paystackEventId: def.paymentStatus === PaymentStatus.SUCCESS ? `PST_SEED_${i}_EVT` : null,
          paidAt: def.paymentStatus === PaymentStatus.SUCCESS ? startTime : null,
        },
      });
    }

    if (def.reviewRating !== null) {
      await prisma.review.create({
        data: {
          bookingId: booking.id,
          userId: customer.id,
          stylistId: stylist.id,
          rating: def.reviewRating,
          comment: def.reviewComment ?? undefined,
        },
      });
    }
  }

  console.log(`  ✓ ${bookingCount} bookings`);

  // ── 6. Gift voucher sample ────────────────────────────────────────────────────

  const firstCustomer = customerUsers[0];
  const firstStylistWithServices = stylistRecords.find((r) => r.serviceIds.length >= 2);
  if (firstStylistWithServices) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 90);
    const [sid1, sid2] = firstStylistWithServices.serviceIds;
    const s1 = await prisma.service.findUnique({ where: { id: sid1 } });
    const s2 = await prisma.service.findUnique({ where: { id: sid2 } });
    if (s1 && s2) {
      const voucher = await prisma.giftVoucher.create({
        data: {
          purchasedById: firstCustomer.id,
          recipientName: "Amaka Obi",
          recipientEmail: "amaka.obi@example.ng",
          recipientPhone: "+2348099887766",
          message: "Happy Birthday! Treat yourself to a day of beauty.",
          totalAmount: s1.price + s2.price,
          expiresAt: expiry,
          services: {
            create: [
              { serviceId: sid1 },
              { serviceId: sid2 },
            ],
          },
        },
      });
      console.log(`  ✓ 1 gift voucher (code: ${voucher.code})`);
    }
  }

  // ── 7. Reconcile denormalized review counters ─────────────────────────────────

  const reviewAggs = await prisma.review.groupBy({
    by: ["stylistId"],
    _count: { id: true },
    _avg: { rating: true },
    where: { deletedAt: null },
  });

  const aggByStylist = new Map(
    reviewAggs.map((a) => [a.stylistId, { count: a._count.id, avgRating: a._avg.rating ?? 0 }])
  );

  for (const { stylist } of stylistRecords) {
    const agg = aggByStylist.get(stylist.id);
    await prisma.stylist.update({
      where: { id: stylist.id },
      data: {
        reviewCount: agg?.count ?? 0,
        ...(agg ? { rating: Math.round(agg.avgRating * 10) / 10 } : {}),
      },
    });
  }

  console.log("  ✓ reviewCount and rating reconciled");

  // ── 8. Summary ────────────────────────────────────────────────────────────────

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.stylist.count(),
    prisma.service.count(),
    prisma.booking.count(),
    prisma.payment.count(),
    prisma.review.count(),
    prisma.package.count(),
    prisma.giftVoucher.count(),
  ]);

  console.log("\n✅  Seed complete.");
  console.log(`   Users:        ${counts[0]}`);
  console.log(`   Stylists:     ${counts[1]}`);
  console.log(`   Services:     ${counts[2]}`);
  console.log(`   Bookings:     ${counts[3]}`);
  console.log(`   Payments:     ${counts[4]}`);
  console.log(`   Reviews:      ${counts[5]}`);
  console.log(`   Packages:     ${counts[6]}`);
  console.log(`   GiftVouchers: ${counts[7]}`);
  console.log("\n   Dev password (all accounts): " + DEV_PASSWORD);
  console.log("   Admin login: admin@glamly.ng / " + DEV_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
