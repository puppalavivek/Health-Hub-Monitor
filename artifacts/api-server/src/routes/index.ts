import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";
import queryRouter from "./query";
import openaiConversationsRouter from "./openai-conversations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(queryRouter);
router.use(openaiConversationsRouter);

export default router;
