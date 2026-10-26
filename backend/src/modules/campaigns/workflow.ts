import { Router } from "express";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { createCampaignEditRouter } from "./edit.js";
import { createCampaignSubmitRouter } from "./submit.js";
import { createCampaignDecisionRouter } from "./decision.js";
export function createCampaignWorkflowRouter(config:AppConfig,auth:AuthDependencies):Router{
 const router=Router();
 router.use(createCampaignEditRouter(config,auth));
 router.use(createCampaignSubmitRouter(config,auth));
 router.use(createCampaignDecisionRouter(config,auth));
 return router;
}
