import { Router } from "express";
import authRouter from "./auth.routes";
import servicesRouter from "./services.routes";
import stylistsRouter from "./stylists.routes";
import bookingsRouter from "./bookings.routes";
import reviewsRouter from "./reviews.routes";
import paymentsRouter from "./payments.routes";
import pushRouter from "./push.routes";
import adminRouter from "./admin.routes";
import stylistMeRouter from "./stylist-me.routes";
import giftVouchersRouter from "./gift-vouchers.routes";

const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/services", servicesRouter);
v1Router.use("/stylists", stylistsRouter);
v1Router.use("/stylists", stylistMeRouter);   // /stylists/me/... self-management
v1Router.use("/bookings", bookingsRouter);
v1Router.use("/reviews", reviewsRouter);
v1Router.use("/payments", paymentsRouter);
v1Router.use("/push", pushRouter);
v1Router.use("/admin", adminRouter);
v1Router.use("/gift-vouchers", giftVouchersRouter);

export default v1Router;
