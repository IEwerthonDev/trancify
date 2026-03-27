import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import tenantsRouter from "./tenants.js";
import servicesRouter from "./services.js";
import availabilityRouter from "./availability.js";
import appointmentsRouter from "./appointments.js";
import reportsRouter from "./reports.js";
import adminRouter from "./admin.js";
import storageRouter from "./storage.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/tenants", tenantsRouter);
router.use("/services", servicesRouter);
router.use("/availability", availabilityRouter);
router.use("/appointments", appointmentsRouter);
router.use("/reports", reportsRouter);
router.use("/admin", adminRouter);
router.use("/storage", storageRouter);

export default router;
