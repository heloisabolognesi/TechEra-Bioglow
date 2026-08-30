import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bioglowRouter from "./bioglow";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bioglowRouter);

export default router;
